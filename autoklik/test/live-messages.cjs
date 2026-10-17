const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function main() {
    const source = fs.readFileSync(path.join(__dirname, '../src/shared/live-messages.ts'), 'utf8');
    const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
    const requests = [];
    const timers = new Map();
    let timerId = 0;
    const context = {
        exports: {}, AbortController, TextDecoder,
        require: () => ({sessionCookie: {getSessionToken: () => 'test-session'}}),
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: id => timers.delete(id),
        fetch: async (url, options) => {
            let stream;
            const body = new ReadableStream({start(controller) { stream = controller; }});
            options.signal.addEventListener('abort', () => stream.error(new Error('Aborted')), {once: true});
            requests.push({url, options, stream});
            return {ok: true, body};
        },
    };
    vm.runInNewContext(code, context);
    const tick = () => new Promise(resolve => setImmediate(resolve));
    let first = 0;
    let second = 0;
    const offFirst = context.exports.subscribeMessages(() => first++);
    const offSecond = context.exports.subscribeMessages(() => second++);
    await tick();
    assert.equal(requests.length, 1, 'consumers share one authenticated stream');
    assert.equal(requests[0].options.headers.Authorization, 'Bearer test-session');
    assert.ok(!requests[0].url.includes('test-session'), 'credentials stay out of URLs');
    const encode = value => new TextEncoder().encode(value);
    requests[0].stream.enqueue(encode('data: up'));
    await tick();
    assert.equal(first, 0, 'partial frames wait for the rest');
    requests[0].stream.enqueue(encode('date\n\n: heartbeat\n\ndata: update\n\n'));
    await tick();
    assert.equal(first, 2);
    assert.equal(second, 2, 'heartbeats do not trigger refreshes');
    offFirst();
    assert.equal(requests[0].options.signal.aborted, false);
    requests[0].stream.close();
    await tick();
    assert.equal(timers.size, 1, 'a dropped stream schedules reconnection');
    const [id, reconnect] = [...timers][0];
    timers.delete(id);
    reconnect();
    await tick();
    assert.equal(requests.length, 2);
    requests[1].stream.enqueue(encode('data: update\n\n'));
    await tick();
    assert.equal(first, 2, 'removed consumers stay removed');
    assert.equal(second, 3);
    offSecond();
    await tick();
    assert.equal(requests[1].options.signal.aborted, true, 'last consumer closes the stream');
    assert.equal(timers.size, 0, 'unmount does not reconnect');
    console.log('Live message transport checks passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });

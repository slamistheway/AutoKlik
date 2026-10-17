import { EventEmitter } from 'events';
import { MessageEventsService } from './message-events.service';

describe('live message events', () => {
  it('listens across API instances and forwards only participant updates', async () => {
    const client = Object.assign(new EventEmitter(), {query: jest.fn().mockResolvedValue({}), release: jest.fn()});
    const db = {$client: {connect: jest.fn().mockResolvedValue(client)}};
    const service = new MessageEventsService(db as never);
    const participant = jest.fn();
    const stranger = jest.fn();
    const one = service.forUser(7).subscribe(participant);
    const two = service.forUser(10).subscribe(stranger);
    service.onModuleInit();
    await Promise.resolve();
    expect(client.query).toHaveBeenCalledWith('LISTEN message_updates');
    client.emit('notification', {channel: 'message_updates', payload: '[7,9]'});
    client.emit('notification', {channel: 'message_updates', payload: 'invalid'});
    expect(participant).toHaveBeenCalledTimes(1);
    expect(stranger).not.toHaveBeenCalled();
    one.unsubscribe(); two.unsubscribe();
    service.onModuleDestroy();
    expect(client.release).toHaveBeenCalledWith(true);
  });
});

import { UsersService } from './users.service';
import * as schema from '../db/schema';
import { PgDialect } from 'drizzle-orm/pg-core';

jest.mock('./message-crypto', () => ({ encryptMessageContent: jest.fn(() => 'encrypted'), messageBodyContext: jest.fn(() => 'context') }));

function serviceFor(db: object) {
  return new UsersService(db as ConstructorParameters<typeof UsersService>[0], {} as never, {} as never, {} as never);
}

function selection(rows: object[]) {
  return {from: jest.fn().mockReturnValue({where: jest.fn().mockReturnValue({limit: jest.fn().mockResolvedValue(rows)})})};
}

describe('messaging user blocks', () => {
  it.each([true, false])('rejects self-block/unblock before touching storage (%s)', async blocked => {
    const db = {select: jest.fn()};
    await expect(serviceFor(db).setUserBlocked(7, 7, blocked)).rejects.toMatchObject({status: 400});
    expect(db.select).not.toHaveBeenCalled();
  });

  it('rejects starting a conversation when either party blocked the other', async () => {
    const db = {select: jest.fn().mockReturnValueOnce(selection([{id: 9}])).mockReturnValueOnce(selection([{blockerId: 9, blockedId: 7}]))};
    await expect(serviceFor(db).addConversation(7, 9)).rejects.toMatchObject({status: 403});
  });

  it('checks blocks inside the send transaction before inserting a message', async () => {
    const tx = {execute: jest.fn(), select: jest.fn(() => selection([{blockerId: 9, blockedId: 7}])), insert: jest.fn()};
    const db = {select: jest.fn(() => selection([{id: 3, userAid: 7, userBid: 9}])), transaction: jest.fn(fn => fn(tx))};
    await expect(serviceFor(db).sendMessage(7, 3, 'Hello')).rejects.toMatchObject({status: 403});
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('does not send to a conversation the caller does not belong to', async () => {
    const db = {select: jest.fn(() => selection([])), transaction: jest.fn()};
    await expect(serviceFor(db).sendMessage(7, 3, 'Hello')).rejects.toMatchObject({status: 404});
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('saves an allowed message and notifies only its participants in the same transaction', async () => {
    const message = {id: 12, senderId: 7, createdAt: new Date(), readAt: null};
    const returning = jest.fn().mockResolvedValue([message]);
    const tx = {
      execute: jest.fn(), select: jest.fn(() => selection([])),
      insert: jest.fn(() => ({values: jest.fn(() => ({returning}))})),
    };
    const db = {select: jest.fn(() => selection([{id: 3, userAid: 7, userBid: 9}])), transaction: jest.fn(fn => fn(tx))};
    await expect(serviceFor(db).sendMessage(7, 3, 'Hello')).resolves.toMatchObject({id: 12, body: 'Hello'});
    const query = new PgDialect().sqlToQuery(tx.execute.mock.calls[1][0]);
    expect(query.sql).toContain('pg_notify');
    expect(query.params).toEqual(['[7,9]']);
  });

  it('persists blocks idempotently and notifies both participants after the change', async () => {
    const onConflictDoNothing = jest.fn();
    const values = jest.fn(() => ({onConflictDoNothing}));
    const tx = {execute: jest.fn(), insert: jest.fn(() => ({values}))};
    const db = {select: jest.fn(() => selection([{id: 9}])), transaction: jest.fn(fn => fn(tx))};
    await expect(serviceFor(db).setUserBlocked(7, 9, true)).resolves.toEqual({blocked: true});
    expect(tx.insert).toHaveBeenCalledWith(schema.userBlocks);
    expect(values).toHaveBeenCalledWith({blockerId: 7, blockedId: 9});
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(tx.execute).toHaveBeenCalledTimes(2);
  });

  it('unblocks only the caller-owned block', async () => {
    const where = jest.fn();
    const tx = {execute: jest.fn(), delete: jest.fn(() => ({where}))};
    const db = {select: jest.fn(() => selection([{id: 9}])), transaction: jest.fn(fn => fn(tx))};
    await expect(serviceFor(db).setUserBlocked(7, 9, false)).resolves.toEqual({blocked: false});
    expect(tx.delete).toHaveBeenCalledWith(schema.userBlocks);
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual([7, 9]);
    expect(query.sql).toContain('"blocker_id"');
    expect(query.sql).toContain('"blocked_id"');
  });
});

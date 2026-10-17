import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool, PoolClient } from 'pg';
import { Subject, filter } from 'rxjs';
import * as schema from '../db/schema';

@Injectable()
export class MessageEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageEventsService.name);
  private readonly updates = new Subject<number[]>();
  private client?: PoolClient;
  private retry?: ReturnType<typeof setTimeout>;
  private stopped = false;

  constructor(@Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>) {}

  onModuleInit() { void this.connect(); }

  forUser(userId: number) {
    return this.updates.pipe(filter(users => users.includes(userId)));
  }

  private async connect() {
    let client: PoolClient | undefined;
    try {
      client = await (this.db as NodePgDatabase<typeof schema> & { $client: Pool }).$client.connect();
      if (this.stopped) { client.release(); return; }
      this.client = client;
      client.on('notification', notification => {
        if (notification.channel !== 'message_updates' || !notification.payload) return;
        try {
          const users: unknown = JSON.parse(notification.payload);
          if (Array.isArray(users) && users.every(id => Number.isSafeInteger(id))) this.updates.next(users);
        } catch { /* Ignore malformed notifications. */ }
      });
      client.once('error', () => this.reconnect(client!));
      client.once('end', () => this.reconnect(client!));
      await client.query('LISTEN message_updates');
    } catch {
      if (client) this.reconnect(client);
      else this.scheduleRetry();
    }
  }

  private reconnect(client: PoolClient) {
    if (this.client !== client) return;
    this.client = undefined;
    client.removeAllListeners();
    client.release(true);
    this.scheduleRetry();
  }

  private scheduleRetry() {
    if (this.stopped || this.retry) return;
    this.logger.warn('Live messages disconnected; reconnecting. Polling remains available.');
    this.retry = setTimeout(() => { this.retry = undefined; void this.connect(); }, 5000);
  }

  onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.retry);
    if (this.client) {
      this.client.removeAllListeners();
      this.client.release(true);
      this.client = undefined;
    }
    this.updates.complete();
  }
}

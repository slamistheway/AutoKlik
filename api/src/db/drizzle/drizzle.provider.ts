import { db } from '../index';
export const DRIZZLE_DB = 'DRIZZLE_DB';

export const drizzleProvider = [
  {
    provide: DRIZZLE_DB,
    useFactory: () => {
      return db;
    },
  },
];

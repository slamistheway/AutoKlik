import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import dotenv from "dotenv";

dotenv.config({path: ".env",});

export const DRIZZLE_DB = 'DRIZZLE_DB';

export const drizzleProvider = [
  {
    provide: DRIZZLE_DB,
    useFactory: () => {
      const connectionString = process.env.DATABASE_URL;

      if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
      }

      const pool = new Pool({ connectionString });
      return drizzle(pool, { schema });
    },
  },
];

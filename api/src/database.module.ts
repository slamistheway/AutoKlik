import { Module } from '@nestjs/common';
import { Pool } from 'pg';

const poolProvider = {
  provide: 'DATABASE_POOL',
  useFactory: async () => {
    return new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'AutoKlik',
    });
  },
};

@Module({
  providers: [poolProvider],
  exports: [poolProvider],
})
export class DatabaseModule {}


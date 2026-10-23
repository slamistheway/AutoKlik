import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureHttpSecurity } from './http-security';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: process.env.NODE_ENV === 'production' ? ['log', 'error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  configureHttpSecurity(app);
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on 0.0.0.0:${port}`, 'Bootstrap');
}
bootstrap().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : 'API startup failed', undefined, 'Bootstrap');
  process.exitCode = 1;
});

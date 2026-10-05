import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdsModule } from './ads/ads.module';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { InputValidationPipe } from './input-validation';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RATE_LIMIT_OPTIONS } from './rate-limit.config';

@Module({
  imports: [
      ThrottlerModule.forRoot(RATE_LIMIT_OPTIONS),
      UsersModule,
      ServeStaticModule.forRoot({
          rootPath: join(process.cwd(), 'public'),
          serveStaticOptions: { index: false },
      }),
      AdsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_PIPE, useClass: InputValidationPipe }],
  exports: [AppService],
})
export class AppModule {}



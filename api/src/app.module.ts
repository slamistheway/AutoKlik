import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppLoggerService } from './logger.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdModule } from './ad/ad.module';

@Module({
  imports: [
      UsersModule,
      AuthModule,
      ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', 'public'),
      }),
      AdModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppLoggerService],
  exports: [AppLoggerService],
})
export class AppModule {}



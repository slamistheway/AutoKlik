import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdsModule } from './ads/ads.module';

@Module({
  imports: [
      UsersModule,
      ServeStaticModule.forRoot({
          rootPath: join(process.cwd(), 'public'),
          serveStaticOptions: { index: false },
      }),
      AdsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}



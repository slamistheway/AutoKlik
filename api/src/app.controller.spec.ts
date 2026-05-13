import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Logger } from '@nestjs/common';

describe('AppController', () => {
  let appController: AppController;
  let logger: Logger;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    logger = new Logger(AppController.name);
  });

  describe('root', () => {
    it('should log and return "Hello World!"', () => {
      logger.log('Login method called');
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});

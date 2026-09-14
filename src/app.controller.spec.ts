// src/app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return service metadata containing GleamLearn and developer information', () => {
      const result = appController.getAppInfo();
      expect(result).toHaveProperty('product', 'GleamLearn');
      expect(result).toHaveProperty('developer', 'Hilosthone');
      expect(result).toHaveProperty('documentation', '/api/docs');
      expect(result).toHaveProperty('currentTime');
    });
  });
});
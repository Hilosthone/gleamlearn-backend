// // src/app.controller.ts
// import { Controller, Get } from '@nestjs/common';
// import { AppService } from './app.service.js';

// @Controller()
// export class AppController {
//   constructor(private readonly appService: AppService) {}

//   @Get()
//   getHello(): string {
//     return this.appService.getHello();
//   }
// }

// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getAppInfo() {
    return {
      product: 'GleamLearn',
      status: 'active',
      currentTime: new Date().toISOString(),
      developer: 'Hilosthone',
      documentation: '/api/docs',
    };
  }
}
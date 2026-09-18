// // src/quizzes/quizzes.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Quiz } from './entities/quiz.entity.js';
// import { QuizzesService } from './quizzes.service.js';
// import { QuizzesController } from './quizzes.controller.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([Quiz])],
//   controllers: [QuizzesController],
//   providers: [QuizzesService],
//   exports: [QuizzesService],
// })
// export class QuizzesModule {}



// src/quizzes/quizzes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity.js';
import { QuizzesService } from './quizzes.service.js';
import { QuizzesController } from './quizzes.controller.js';
import { XpModule } from '../xp/xp.module.js'; 
import { CoinsModule } from '../coins/coins.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz]),
    XpModule, 
    CoinsModule,
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
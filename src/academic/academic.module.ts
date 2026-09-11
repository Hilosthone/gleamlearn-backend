// // src/academic/academic.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Institution } from './entities/institution.entity.js';
// import { Faculty } from './entities/faculty.entity.js';
// import { Department } from './entities/department.entity.js';
// import { AcademicLevelsController } from './academic-levels.controller.js';
// import { AcademicController } from './academic-levels.controller.js';
// import { AcademicService } from './academic.service.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([Institution, Faculty, Department])],
//   controllers: [AcademicLevelsController, AcademicController],
//   providers: [AcademicService],
//   exports: [AcademicService],
// })
// export class AcademicModule {}


// src/academic/academic.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from './entities/institution.entity.js';
import { Faculty } from './entities/faculty.entity.js';
import { Department } from './entities/department.entity.js';
import { AcademicLevelsController } from './academic-levels.controller.js';
import { AcademicController } from './academic.controller.js';
import { AcademicService } from './academic.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Institution, Faculty, Department])],
  controllers: [AcademicLevelsController, AcademicController],
  providers: [AcademicService],
  exports: [AcademicService],
})
export class AcademicModule {}
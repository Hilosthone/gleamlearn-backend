// // src/search/search.module.ts
// import { Module } from '@nestjs/common';
// import { SearchController } from './search.controller.js';
// import { SearchService } from './search.service.js';

// @Module({
//   controllers: [SearchController],
//   providers: [SearchService],
//   exports: [SearchService],
// })
// export class SearchModule {}


// src/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { PrismaService } from '../prisma/prisma.service.js'; // <-- Import PrismaService

@Module({
  imports: [],
  controllers: [SearchController],
  providers: [SearchService, PrismaService], // <-- Include PrismaService in providers
  exports: [SearchService],
})
export class SearchModule {}
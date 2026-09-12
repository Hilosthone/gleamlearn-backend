import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryCourse, LibraryFavorite } from './entities/library-item.entity.js';
import { LibraryService } from './library.service.js';
import { LibraryController } from './library.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryCourse, LibraryFavorite])],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
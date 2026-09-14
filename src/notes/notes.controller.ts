// // src/notes/notes.controller.ts
// import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { NotesService } from './notes.service.js';
// import { CreateNoteDto } from './dto/create-note.dto.js';

// @ApiTags('Notes & Learning Materials')
// @Controller('api/v1/notes')
// export class NotesController {
//   constructor(private readonly notesService: NotesService) {}

//   @Get()
//   @ApiOperation({ summary: 'Retrieve all study notes for the authenticated user' })
//   findAll() {
//     // Hardcoded user for demo gateway routing; replace with req.user.id in production auth
//     return this.notesService.findAll('default-user-id');
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Retrieve a single study note by ID' })
//   findOne(@Param('id') id: string) {
//     return this.notesService.findOne(id, 'default-user-id');
//   }

//   @Post()
//   @ApiOperation({ summary: 'Create a new study note' })
//   create(@Body() dto: CreateNoteDto) {
//     return this.notesService.create('default-user-id', dto);
//   }

//   @Patch(':id')
//   @ApiOperation({ summary: 'Update an existing study note' })
//   update(@Param('id') id: string, @Body() dto: Partial<CreateNoteDto>) {
//     return this.notesService.update(id, 'default-user-id', dto);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a study note' })
//   remove(@Param('id') id: string) {
//     return this.notesService.remove(id, 'default-user-id');
//   }
// }


// src/notes/notes.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Notes & Learning Materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all study notes for the authenticated user' })
  findAll(@CurrentUser('id') userId: string) {
    return this.notesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single study note by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notesService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new study note' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateNoteDto) {
    return this.notesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing study note' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: Partial<CreateNoteDto>) {
    return this.notesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a study note' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notesService.remove(id, userId);
  }
}
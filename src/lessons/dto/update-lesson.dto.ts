// src/lessons/dto/update-lesson.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto.js';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
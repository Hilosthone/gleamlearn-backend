// src/admin/courses/dto/update-admin-course.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAdminCourseDto } from './create-admin-course.dto.js';

export class UpdateAdminCourseDto extends PartialType(CreateAdminCourseDto) {}
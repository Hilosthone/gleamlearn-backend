// src/admin/questions/dto/update-admin-question.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAdminQuestionDto } from './create-admin-question.dto.js';

export class UpdateAdminQuestionDto extends PartialType(CreateAdminQuestionDto) {}
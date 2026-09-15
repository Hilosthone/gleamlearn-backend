// src/tests/dto/submit-test.dto.ts
import { IsObject, IsOptional } from 'class-validator';

export class SubmitTestDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, any>;
}
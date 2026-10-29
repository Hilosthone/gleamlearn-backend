import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateInstitutionDto {
  @ApiProperty({ example: 'Obafemi Awolowo University' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'University', description: 'Secondary, University, or Institute' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['Secondary', 'University', 'Institute']) // learners' profile suggestions group by these
  type: string;

  @ApiProperty({ example: 'Osun', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Nigeria', required: false })
  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateInstitutionDto extends CreateInstitutionDto {}

export class CreateFacultyDto {
  @ApiProperty({ example: 'Faculty of Technology' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'uuid-of-institution' })
  @IsNotEmpty()
  @IsString()
  institutionId: string;
}

export class UpdateFacultyDto extends CreateFacultyDto {}

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Computer Science and Engineering' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'uuid-of-faculty' })
  @IsNotEmpty()
  @IsString()
  facultyId: string;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}
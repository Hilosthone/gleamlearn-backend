// // src/academic/academic.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { AcademicService } from './academic.service.js';
// import { CreateInstitutionDto, CreateFacultyDto, CreateDepartmentDto } from './dto/academic.dto.js';

// @ApiTags('Academic Structure & Management')
// @Controller('api/v1')
// export class AcademicController {
//   constructor(private readonly academicService: AcademicService) {}

//   // --- Institutions ---
//   @Get('institutions')
//   @ApiOperation({ summary: 'Get all institutions' })
//   findAllInstitutions() {
//     return this.academicService.findAllInstitutions();
//   }

//   @Post('institutions')
//   @ApiOperation({ summary: 'Create a new institution' })
//   createInstitution(@Body() dto: CreateInstitutionDto) {
//     return this.academicService.createInstitution(dto);
//   }

//   // --- Faculties ---
//   @Get('faculties')
//   @ApiOperation({ summary: 'Get all faculties' })
//   findAllFaculties() {
//     return this.academicService.findAllFaculties();
//   }

//   @Post('faculties')
//   @ApiOperation({ summary: 'Create a new faculty' })
//   createFaculty(@Body() dto: CreateFacultyDto) {
//     return this.academicService.createFaculty(dto);
//   }

//   // --- Departments ---
//   @Get('departments')
//   @ApiOperation({ summary: 'Get all departments' })
//   findAllDepartments() {
//     return this.academicService.findAllDepartments();
//   }

//   @Post('departments')
//   @ApiOperation({ summary: 'Create a new department' })
//   createDepartment(@Body() dto: CreateDepartmentDto) {
//     return this.academicService.createDepartment(dto);
//   }
// }

// src/academic/academic.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AcademicService } from './academic.service.js';
import { 
  CreateInstitutionDto, UpdateInstitutionDto, 
  CreateFacultyDto, UpdateFacultyDto, 
  CreateDepartmentDto, UpdateDepartmentDto 
} from './dto/academic.dto.js';

@ApiTags('Academic Structure & Management')
@Controller('api/v1')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // --- Institutions ---
  @Get('institutions')
  @ApiOperation({ summary: 'Get all institutions with faculties and departments' })
  findAllInstitutions() {
    return this.academicService.findAllInstitutions();
  }

  @Post('institutions')
  @ApiOperation({ summary: 'Create a new institution' })
  createInstitution(@Body() dto: CreateInstitutionDto) {
    return this.academicService.createInstitution(dto);
  }

  @Patch('institutions/:id')
  @ApiOperation({ summary: 'Update an institution' })
  updateInstitution(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.academicService.updateInstitution(id, dto);
  }

  @Delete('institutions/:id')
  @ApiOperation({ summary: 'Delete an institution' })
  removeInstitution(@Param('id') id: string) {
    return this.academicService.removeInstitution(id);
  }

  // --- Faculties ---
  @Get('faculties')
  @ApiOperation({ summary: 'Get all faculties' })
  findAllFaculties() {
    return this.academicService.findAllFaculties();
  }

  @Post('faculties')
  @ApiOperation({ summary: 'Create a new faculty' })
  createFaculty(@Body() dto: CreateFacultyDto) {
    return this.academicService.createFaculty(dto);
  }

  @Patch('faculties/:id')
  @ApiOperation({ summary: 'Update a faculty' })
  updateFaculty(@Param('id') id: string, @Body() dto: UpdateFacultyDto) {
    return this.academicService.updateFaculty(id, dto);
  }

  @Delete('faculties/:id')
  @ApiOperation({ summary: 'Delete a faculty' })
  removeFaculty(@Param('id') id: string) {
    return this.academicService.removeFaculty(id);
  }

  // --- Departments ---
  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  findAllDepartments() {
    return this.academicService.findAllDepartments();
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create a new department' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.academicService.createDepartment(dto);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update a department' })
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.academicService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete a department' })
  removeDepartment(@Param('id') id: string) {
    return this.academicService.removeDepartment(id);
  }
}
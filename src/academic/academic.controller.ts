// // src/academic/academic.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { AcademicService } from './academic.service.js';
// import { 
//   CreateInstitutionDto, UpdateInstitutionDto, 
//   CreateFacultyDto, UpdateFacultyDto, 
//   CreateDepartmentDto, UpdateDepartmentDto 
// } from './dto/academic.dto.js';

// @ApiTags('Academic Structure & Management')
// @Controller('api/v1')
// export class AcademicController {
//   constructor(private readonly academicService: AcademicService) {}

//   // --- Institutions ---
//   @Get('institutions')
//   @ApiOperation({ summary: 'Get all institutions with faculties and departments' })
//   findAllInstitutions() {
//     return this.academicService.findAllInstitutions();
//   }

//   @Post('institutions')
//   @ApiOperation({ summary: 'Create a new institution' })
//   createInstitution(@Body() dto: CreateInstitutionDto) {
//     return this.academicService.createInstitution(dto);
//   }

//   @Patch('institutions/:id')
//   @ApiOperation({ summary: 'Update an institution' })
//   updateInstitution(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
//     return this.academicService.updateInstitution(id, dto);
//   }

//   @Delete('institutions/:id')
//   @ApiOperation({ summary: 'Delete an institution' })
//   removeInstitution(@Param('id') id: string) {
//     return this.academicService.removeInstitution(id);
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

//   @Patch('faculties/:id')
//   @ApiOperation({ summary: 'Update a faculty' })
//   updateFaculty(@Param('id') id: string, @Body() dto: UpdateFacultyDto) {
//     return this.academicService.updateFaculty(id, dto);
//   }

//   @Delete('faculties/:id')
//   @ApiOperation({ summary: 'Delete a faculty' })
//   removeFaculty(@Param('id') id: string) {
//     return this.academicService.removeFaculty(id);
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

//   @Patch('departments/:id')
//   @ApiOperation({ summary: 'Update a department' })
//   updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
//     return this.academicService.updateDepartment(id, dto);
//   }

//   @Delete('departments/:id')
//   @ApiOperation({ summary: 'Delete a department' })
//   removeDepartment(@Param('id') id: string) {
//     return this.academicService.removeDepartment(id);
//   }
// }

// // src/academic/academic.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { AcademicService } from './academic.service.js';
// import { 
//   CreateInstitutionDto, UpdateInstitutionDto, 
//   CreateFacultyDto, UpdateFacultyDto, 
//   CreateDepartmentDto, UpdateDepartmentDto 
// } from './dto/academic.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('Academic Structure & Management')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1')
// export class AcademicController {
//   constructor(private readonly academicService: AcademicService) {}

//   // --- Institutions ---
//   @Get('institutions')
//   @ApiOperation({ summary: 'Get all institutions with faculties and departments' })
//   findAllInstitutions() {
//     return this.academicService.findAllInstitutions();
//   }

//   @Post('institutions')
//   @ApiOperation({ summary: 'Create a new institution' })
//   createInstitution(@Body() dto: CreateInstitutionDto) {
//     return this.academicService.createInstitution(dto);
//   }

//   @Patch('institutions/:id')
//   @ApiOperation({ summary: 'Update an institution' })
//   updateInstitution(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
//     return this.academicService.updateInstitution(id, dto);
//   }

//   @Delete('institutions/:id')
//   @ApiOperation({ summary: 'Delete an institution' })
//   removeInstitution(@Param('id') id: string) {
//     return this.academicService.removeInstitution(id);
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

//   @Patch('faculties/:id')
//   @ApiOperation({ summary: 'Update a faculty' })
//   updateFaculty(@Param('id') id: string, @Body() dto: UpdateFacultyDto) {
//     return this.academicService.updateFaculty(id, dto);
//   }

//   @Delete('faculties/:id')
//   @ApiOperation({ summary: 'Delete a faculty' })
//   removeFaculty(@Param('id') id: string) {
//     return this.academicService.removeFaculty(id);
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

//   @Patch('departments/:id')
//   @ApiOperation({ summary: 'Update a department' })
//   updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
//     return this.academicService.updateDepartment(id, dto);
//   }

//   @Delete('departments/:id')
//   @ApiOperation({ summary: 'Delete a department' })
//   removeDepartment(@Param('id') id: string) {
//     return this.academicService.removeDepartment(id);
//   }
// }


// src/academic/academic.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AcademicService } from './academic.service.js';
import { 
  CreateInstitutionDto, UpdateInstitutionDto, 
  CreateFacultyDto, UpdateFacultyDto, 
  CreateDepartmentDto, UpdateDepartmentDto 
} from './dto/academic.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Academic Structure & Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // --- Institutions ---
  @Get('institutions')
  @ApiOperation({ summary: 'Get all institutions with faculties and departments' })
  @ApiResponse({ status: 200, description: 'List of institutions retrieved successfully.' })
  findAllInstitutions() {
    return this.academicService.findAllInstitutions();
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('institutions')
  @ApiOperation({ summary: 'Create a new institution' })
  @ApiResponse({ status: 201, description: 'Institution created successfully.' })
  createInstitution(@Body() dto: CreateInstitutionDto) {
    return this.academicService.createInstitution(dto);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch('institutions/:id')
  @ApiOperation({ summary: 'Update an institution' })
  @ApiResponse({ status: 200, description: 'Institution updated successfully.' })
  updateInstitution(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.academicService.updateInstitution(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete('institutions/:id')
  @ApiOperation({ summary: 'Delete an institution' })
  @ApiResponse({ status: 200, description: 'Institution deleted successfully.' })
  removeInstitution(@Param('id') id: string) {
    return this.academicService.removeInstitution(id);
  }

  // --- Faculties ---
  @Get('faculties')
  @ApiOperation({ summary: 'Get all faculties' })
  @ApiResponse({ status: 200, description: 'List of faculties retrieved successfully.' })
  findAllFaculties() {
    return this.academicService.findAllFaculties();
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @Post('faculties')
  @ApiOperation({ summary: 'Create a new faculty' })
  @ApiResponse({ status: 201, description: 'Faculty created successfully.' })
  createFaculty(@Body() dto: CreateFacultyDto) {
    return this.academicService.createFaculty(dto);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @Patch('faculties/:id')
  @ApiOperation({ summary: 'Update a faculty' })
  @ApiResponse({ status: 200, description: 'Faculty updated successfully.' })
  updateFaculty(@Param('id') id: string, @Body() dto: UpdateFacultyDto) {
    return this.academicService.updateFaculty(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete('faculties/:id')
  @ApiOperation({ summary: 'Delete a faculty' })
  @ApiResponse({ status: 200, description: 'Faculty deleted successfully.' })
  removeFaculty(@Param('id') id: string) {
    return this.academicService.removeFaculty(id);
  }

  // --- Departments ---
  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'List of departments retrieved successfully.' })
  findAllDepartments() {
    return this.academicService.findAllDepartments();
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 20, ttl: 60000 } })
  @Post('departments')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, description: 'Department created successfully.' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.academicService.createDepartment(dto);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 20, ttl: 60000 } })
  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: 200, description: 'Department updated successfully.' })
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.academicService.updateDepartment(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete a department' })
  @ApiResponse({ status: 200, description: 'Department deleted successfully.' })
  removeDepartment(@Param('id') id: string) {
    return this.academicService.removeDepartment(id);
  }
}
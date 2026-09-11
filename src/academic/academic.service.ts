// // src/academic/academic.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Institution } from './entities/institution.entity.js';
// import { Faculty } from './entities/faculty.entity.js';
// import { Department } from './entities/department.entity.js';
// import { CreateInstitutionDto, CreateFacultyDto, CreateDepartmentDto } from './dto/academic.dto.js';

// @Injectable()
// export class AcademicService {
//   constructor(
//     @InjectRepository(Institution) private institutionRepo: Repository<Institution>,
//     @InjectRepository(Faculty) private facultyRepo: Repository<Faculty>,
//     @InjectRepository(Department) private departmentRepo: Repository<Department>,
//   ) {}

//   // Institutions
//   async findAllInstitutions() {
//     return this.institutionRepo.find({ relations: ['faculties', 'faculties.departments'] });
//   }

//   async createInstitution(dto: CreateInstitutionDto) {
//     const institution = this.institutionRepo.create(dto);
//     return this.institutionRepo.save(institution);
//   }

//   // Faculties
//   async findAllFaculties() {
//     return this.facultyRepo.find({ relations: ['institution', 'departments'] });
//   }

//   async createFaculty(dto: CreateFacultyDto) {
//     const faculty = this.facultyRepo.create(dto);
//     return this.facultyRepo.save(faculty);
//   }

//   // Departments
//   async findAllDepartments() {
//     return this.departmentRepo.find({ relations: ['faculty', 'faculty.institution'] });
//   }

//   async createDepartment(dto: CreateDepartmentDto) {
//     const department = this.departmentRepo.create(dto);
//     return this.departmentRepo.save(department);
//   }
// }


// src/academic/academic.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from './entities/institution.entity.js';
import { Faculty } from './entities/faculty.entity.js';
import { Department } from './entities/department.entity.js';
import { 
  CreateInstitutionDto, UpdateInstitutionDto, 
  CreateFacultyDto, UpdateFacultyDto, 
  CreateDepartmentDto, UpdateDepartmentDto 
} from './dto/academic.dto.js';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(Institution) private institutionRepo: Repository<Institution>,
    @InjectRepository(Faculty) private facultyRepo: Repository<Faculty>,
    @InjectRepository(Department) private departmentRepo: Repository<Department>,
  ) {}

  // --- Institutions ---
  async findAllInstitutions() {
    return this.institutionRepo.find({ 
      relations: { faculties: { departments: true } } 
    });
  }

  async createInstitution(dto: CreateInstitutionDto) {
    const institution = this.institutionRepo.create(dto);
    return this.institutionRepo.save(institution);
  }

  async updateInstitution(id: string, dto: UpdateInstitutionDto) {
    const result = await this.institutionRepo.update(id, dto);
    if (result.affected === 0) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }
    return this.institutionRepo.findOne({ where: { id }, relations: { faculties: { departments: true } } });
  }

  async removeInstitution(id: string) {
    const result = await this.institutionRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }
    return { message: 'Institution successfully deleted' };
  }

  // --- Faculties ---
  async findAllFaculties() {
    return this.facultyRepo.find({ 
      relations: { institution: true, departments: true } 
    });
  }

  async createFaculty(dto: CreateFacultyDto) {
    const faculty = this.facultyRepo.create(dto);
    return this.facultyRepo.save(faculty);
  }

  async updateFaculty(id: string, dto: UpdateFacultyDto) {
    const result = await this.facultyRepo.update(id, dto);
    if (result.affected === 0) {
      throw new NotFoundException(`Faculty with ID ${id} not found`);
    }
    return this.facultyRepo.findOne({ where: { id }, relations: { institution: true, departments: true } });
  }

  async removeFaculty(id: string) {
    const result = await this.facultyRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Faculty with ID ${id} not found`);
    }
    return { message: 'Faculty successfully deleted' };
  }

  // --- Departments ---
  async findAllDepartments() {
    return this.departmentRepo.find({ 
      relations: { faculty: { institution: true } } 
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const department = this.departmentRepo.create(dto);
    return this.departmentRepo.save(department);
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const result = await this.departmentRepo.update(id, dto);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return this.departmentRepo.findOne({ where: { id }, relations: { faculty: { institution: true } } });
  }

  async removeDepartment(id: string) {
    const result = await this.departmentRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return { message: 'Department successfully deleted' };
  }
}
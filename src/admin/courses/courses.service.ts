// src/admin/courses/courses.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AdminCourse } from './entities/admin-course.entity.js';
import { CreateAdminCourseDto } from './dto/create-admin-course.dto.js';
import { UpdateAdminCourseDto } from './dto/update-admin-course.dto.js';
import { AdminCoursesQueryDto } from './dto/admin-courses-query.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(AdminCourse)
    private readonly courseRepo: Repository<AdminCourse>,
  ) {}

  async findAll(query: AdminCoursesQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition = search
      ? [
          { title: Like(`%${search}%`) },
          { category: Like(`%${search}%`) },
        ]
      : {};

    const [courses, total] = await this.courseRepo.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        courses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return { status: 'success', data: course };
  }

  async create(dto: CreateAdminCourseDto) {
    const course = this.courseRepo.create(dto);
    const savedCourse = await this.courseRepo.save(course);
    return { status: 'success', message: 'Course created successfully', data: savedCourse };
  }

  async update(id: string, dto: UpdateAdminCourseDto) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    Object.assign(course, dto);
    const updatedCourse = await this.courseRepo.save(course);
    return { status: 'success', message: 'Course updated successfully', data: updatedCourse };
  }

  async remove(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    await this.courseRepo.remove(course);
    return { status: 'success', message: 'Course deleted successfully' };
  }

  async publish(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    course.isPublished = true;
    await this.courseRepo.save(course);
    return { status: 'success', message: `Course '${course.title}' has been published.` };
  }

  async unpublish(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    course.isPublished = false;
    await this.courseRepo.save(course);
    return { status: 'success', message: `Course '${course.title}' has been unpublished.` };
  }
}
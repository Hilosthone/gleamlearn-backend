// src/courses/courses.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { Topic } from './entities/topic.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Topic) private topicRepo: Repository<Topic>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
  ) {}

  // Courses CRUD & Search
  findAllCourses() {
    return this.courseRepo.find({ relations: { department: true, topics: true } });
  }

  async findCourseById(id: string) {
    const course = await this.courseRepo.findOne({ where: { id }, relations: { department: true, topics: true } });
    if (!course) throw new NotFoundException(`Course not found`);
    return course;
  }

  createCourse(dto: CreateCourseDto) {
    const course = this.courseRepo.create(dto);
    return this.courseRepo.save(course);
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    await this.courseRepo.update(id, dto);
    return this.findCourseById(id);
  }

  async deleteCourse(id: string) {
    const result = await this.courseRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Course not found');
    return { message: 'Course successfully deleted' };
  }

  async searchCourses(query: string, track?: string, level?: string) {
    return this.courseRepo.find({
      where: [
        { title: ILike(`%${query}%`), track, level },
        { description: ILike(`%${query}%`), track, level },
      ],
      relations: { department: true },
    });
  }

  // Topics Management
  async findTopicsByCourse(courseId: string) {
    await this.findCourseById(courseId); // verify course exists
    return this.topicRepo.find({ where: { courseId }, order: { order: 'ASC' } });
  }

  async createTopic(courseId: string, dto: CreateTopicDto) {
    await this.findCourseById(courseId);
    const topic = this.topicRepo.create({ ...dto, courseId });
    return this.topicRepo.save(topic);
  }

  async findTopicById(id: string) {
    const topic = await this.topicRepo.findOne({ where: { id }, relations: { course: true } });
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async updateTopic(id: string, dto: UpdateTopicDto) {
    await this.topicRepo.update(id, dto);
    return this.findTopicById(id);
  }

  async deleteTopic(id: string) {
    const result = await this.topicRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Topic not found');
    return { message: 'Topic successfully deleted' };
  }

  // Enrollments
  async enrollUser(userId: string, courseId: string) {
    await this.findCourseById(courseId);
    try {
      const enrollment = this.enrollmentRepo.create({ userId, courseId });
      return await this.enrollmentRepo.save(enrollment);
    } catch {
      throw new ConflictException('Already enrolled in this course');
    }
  }

  async unenrollUser(userId: string, courseId: string) {
    const result = await this.enrollmentRepo.delete({ userId, courseId });
    if (result.affected === 0) throw new NotFoundException('Enrollment not found');
    return { message: 'Successfully unenrolled from course' };
  }

  async findUserEnrolledCourses(userId: string) {
    const enrollments = await this.enrollmentRepo.find({
      where: { userId },
      relations: { course: { department: true } },
    });
    return enrollments.map((e) => ({ ...e.course, progressPercentage: e.progressPercentage, enrolledAt: e.enrolledAt }));
  }
}
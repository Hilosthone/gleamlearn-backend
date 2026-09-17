// src/study-sessions/services/study-sessions.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StudySession } from '../entities/study-session.entity.js';
import { StartStudySessionDto } from '../dto/study-session.dto.js';

@Injectable()
export class StudySessionsService {
  constructor(
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
  ) {}

  async startSession(userId: string, dto: StartStudySessionDto) {
    // Check if user already has an active session
    const active = await this.sessionRepo.findOne({ where: { userId, status: 'active' } });
    if (active) {
      throw new BadRequestException('You already have an active study session running. Pause or complete it first.');
    }

    const session = this.sessionRepo.create({
      userId,
      title: dto.title,
      courseId: dto.courseId,
      status: 'active',
      startTime: new Date(),
    });

    const saved = await this.sessionRepo.save(session);
    return {
      status: 'success',
      message: 'Study session started successfully.',
      session: saved,
    };
  }

  async pauseSession(userId: string, id: string) {
    const session = await this.sessionRepo.findOne({ where: { id, userId } });
    if (!session) {
      throw new NotFoundException(`Study session with ID ${id} not found.`);
    }
    if (session.status !== 'active') {
      throw new BadRequestException('Only active sessions can be paused.');
    }

    session.status = 'paused';
    const updated = await this.sessionRepo.save(session);
    return {
      status: 'success',
      message: 'Study session paused.',
      session: updated,
    };
  }

  async resumeSession(userId: string, id: string) {
    const session = await this.sessionRepo.findOne({ where: { id, userId } });
    if (!session) {
      throw new NotFoundException(`Study session with ID ${id} not found.`);
    }
    if (session.status !== 'paused') {
      throw new BadRequestException('Only paused sessions can be resumed.');
    }

    session.status = 'active';
    const updated = await this.sessionRepo.save(session);
    return {
      status: 'success',
      message: 'Study session resumed.',
      session: updated,
    };
  }

  async completeSession(userId: string, id: string) {
    const session = await this.sessionRepo.findOne({ where: { id, userId } });
    if (!session) {
      throw new NotFoundException(`Study session with ID ${id} not found.`);
    }

    session.status = 'completed';
    session.endTime = new Date();

    if (session.startTime) {
      const diffMs = session.endTime.getTime() - new Date(session.startTime).getTime();
      session.durationSeconds = Math.floor(diffMs / 1000);
    }

    const updated = await this.sessionRepo.save(session);
    return {
      status: 'success',
      message: 'Study session completed and recorded.',
      session: updated,
    };
  }

  async findAllSessions(userId: string) {
    const sessions = await this.sessionRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return {
      status: 'success',
      count: sessions.length,
      sessions,
    };
  }

  async getTodaySessions(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const todaySessions = sessions.filter(s => s.createdAt.toISOString().split('T')[0] === todayStr);
    const totalDurationSeconds = todaySessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    return {
      status: 'success',
      date: todayStr,
      totalSessionsToday: todaySessions.length,
      totalDurationMinutes: Math.floor(totalDurationSeconds / 60),
      sessions: todaySessions,
    };
  }

  async getHistory(userId: string) {
    const history = await this.sessionRepo.find({
      where: { userId, status: 'completed' },
      order: { endTime: 'DESC' },
    });
    return {
      status: 'success',
      completedSessionsCount: history.length,
      history,
    };
  }

  async getStats(userId: string) {
    const sessions = await this.sessionRepo.find({ where: { userId, status: 'completed' } });
    const totalTimeSeconds = sessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    return {
      status: 'success',
      totalCompletedSessions: sessions.length,
      totalStudyTimeHours: Number((totalTimeSeconds / 3600).toFixed(2)),
      totalStudyTimeMinutes: Math.floor(totalTimeSeconds / 60),
    };
  }
}
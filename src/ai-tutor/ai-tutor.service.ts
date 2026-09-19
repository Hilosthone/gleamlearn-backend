// src/ai-tutor/ai-tutor.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorSession } from './entities/tutor-session.entity.js';
import { TutorMessage } from './entities/tutor-message.entity.js';
import axios from 'axios';

@Injectable()
export class AiTutorService {
  constructor(
    @InjectRepository(TutorSession)
    private readonly sessionRepo: Repository<TutorSession>,
    @InjectRepository(TutorMessage)
    private readonly messageRepo: Repository<TutorMessage>,
  ) {}

  async createSession(userId: string, title?: string) {
    const session = this.sessionRepo.create({ userId, title: title || 'Classroom Session' });
    await this.sessionRepo.save(session);
    return { status: 'success', data: session };
  }

  async getSessions(userId: string) {
    const sessions = await this.sessionRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return { status: 'success', data: sessions };
  }

  async getSessionById(id: string, userId: string) {
    // Fixed TypeORM relation options syntax for strict typing
    const session = await this.sessionRepo.findOne({ 
      where: { id, userId }, 
      relations: { messages: true } 
    });
    if (!session) {
      throw new HttpException('Tutor session not found', HttpStatus.NOT_FOUND);
    }
    return { status: 'success', data: session };
  }

  async endSession(id: string, userId: string) {
    const session = await this.sessionRepo.findOne({ where: { id, userId } });
    if (!session) {
      throw new HttpException('Tutor session not found', HttpStatus.NOT_FOUND);
    }
    session.status = 'ended';
    await this.sessionRepo.save(session);
    return { status: 'success', message: 'Tutor session ended successfully', data: session };
  }

  async addMessage(sessionId: string, userId: string, messageText: string) {
    await this.getSessionById(sessionId, userId); // Verify ownership

    // Save user message
    const userMsg = this.messageRepo.create({ sessionId, sender: 'user', content: messageText });
    await this.messageRepo.save(userMsg);

    // Proxy to Python microservice for AI Tutor response
    const aiResponseText = await this.proxyToPython('ai-tutor/message', { sessionId, message: messageText });

    // Save tutor response
    const tutorMsg = this.messageRepo.create({ sessionId, sender: 'tutor', content: aiResponseText });
    await this.messageRepo.save(tutorMsg);

    return { status: 'success', data: { userMessage: userMsg, tutorMessage: tutorMsg } };
  }

  async proxyToPython(endpoint: string, data: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const aiApiKey = process.env.AI_API_KEY || '674930';

    try {
      const response = await axios.post(`${aiServiceUrl}/api/v1/${endpoint}`, data, {
        headers: { 'X-API-Key': aiApiKey },
      });
      return response.data.response || response.data.message || 'AI Tutor processed your request.';
    } catch (error: any) { // Handled 'unknown' error type safely
      throw new Error(`AI Microservice Error: ${error?.message || 'Unknown error'}`);
    }
  }

  async callGeneralTool(endpoint: string, data: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const aiApiKey = process.env.AI_API_KEY || '674930';

    try {
      const response = await axios.post(`${aiServiceUrl}/api/v1/${endpoint}`, data, {
        headers: { 'X-API-Key': aiApiKey },
      });
      return response.data;
    } catch (error: any) { // Handled 'unknown' error type safely
      throw new Error(`AI Microservice Error: ${error?.message || 'Unknown error'}`);
    }
  }
}
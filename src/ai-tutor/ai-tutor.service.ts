// src/ai-tutor/ai-tutor.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorSession } from './entities/tutor-session.entity.js';
import { TutorMessage } from './entities/tutor-message.entity.js';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';

const HISTORY_TURNS = 12;

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

    // Get the AI Tutor response first, so a failed AI call does not leave an unanswered message in the session
    // The tutor continues the session: its last turns go with the new message (each used to be answered alone)
    const previous = await this.messageRepo.find({ where: { sessionId }, order: { createdAt: 'DESC' }, take: HISTORY_TURNS });
    const history = previous.reverse().map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content }));
    const aiResponseText = await this.proxyToPython('ai-tutor/message', { sessionId, message: messageText, history });

    // Save user message
    const userMsg = this.messageRepo.create({ sessionId, sender: 'user', content: messageText });
    await this.messageRepo.save(userMsg);

    // Save tutor response
    const tutorMsg = this.messageRepo.create({ sessionId, sender: 'tutor', content: aiResponseText });
    await this.messageRepo.save(tutorMsg);

    return { status: 'success', data: { userMessage: userMsg, tutorMessage: tutorMsg } };
  }

  async proxyToPython(endpoint: string, data: any) {

    try {
      const response = await getAiHttpClient().post(`/api/v1/${endpoint}`, data);
      const text = response.data?.response || response.data?.message;
      if (!text) {
        throw new HttpException('AI generation failed. Please try again later.', HttpStatus.BAD_GATEWAY);
      }
      return text;
    } catch (error: any) { // Handled 'unknown' error type safely
      throw toAiHttpException(error, `AI tutor call ${endpoint}`);
    }
  }

  async callGeneralTool(endpoint: string, data: any) {

    try {
      const response = await getAiHttpClient().post(`/api/v1/${endpoint}`, data);
      return response.data;
    } catch (error: any) { // Handled 'unknown' error type safely
      throw toAiHttpException(error, `AI tutor call ${endpoint}`);
    }
  }
}
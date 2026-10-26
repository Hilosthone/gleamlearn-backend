// // src/quizzes/quizzes.service.ts
// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Quiz } from './entities/quiz.entity.js';
// import { ConfigService } from '@nestjs/config';
// import axios from 'axios';

// @Injectable()
// export class QuizzesService {
//   private pythonAiUrl: string;
//   private aiApiKey: string;

//   constructor(
//     @InjectRepository(Quiz)
//     private quizRepository: Repository<Quiz>,
//     private configService: ConfigService,
//   ) {
//     this.pythonAiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
//     this.aiApiKey = this.configService.get<string>('AI_API_KEY', 'your_secret_token');
//   }

// private async callPythonAi(endpoint: string, payload: any) {
//     try {
//       const response = await axios.post(`${this.pythonAiUrl}${endpoint}`, payload, {
//         headers: { Authorization: `Bearer ${this.aiApiKey}` },
//       });
//       return response.data;
//     } catch (error: any) {
//       // Explicitly typed as 'any' so TypeScript allows accessing axios error properties (.response)
//       throw new HttpException(
//         error.response?.data?.detail || 'Failed to communicate with AI microservice',
//         error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   async findAll() {
//     return await this.quizRepository.find();
//   }

//   async findOne(id: string) {
//     const quiz = await this.quizRepository.findOne({ where: { id } });
//     if (!quiz) throw new HttpException('Quiz not found', HttpStatus.NOT_FOUND);
//     return quiz;
//   }

//   async create(createDto: any) {
//     const quiz = this.quizRepository.create(createDto);
//     return await this.quizRepository.save(quiz);
//   }

//   async update(id: string, updateDto: any) {
//     await this.quizRepository.update(id, updateDto);
//     return this.findOne(id);
//   }

//   async remove(id: string) {
//     const quiz = await this.findOne(id);
//     await this.quizRepository.remove(quiz);
//     return { status: 'success', message: 'Quiz deleted successfully.' };
//   }

//   // --- AI Generation Bridges ---
//   async generateQuiz(payload: any) {
//     return this.callPythonAi('/api/v1/quizzes/generate', payload);
//   }

//   async generateFromCourse(payload: any) {
//     return this.callPythonAi('/api/v1/quizzes/generate-from-course', payload);
//   }

//   async generateFromDocument(payload: any) {
//     return this.callPythonAi('/api/v1/quizzes/generate-from-document', payload);
//   }

//   async generateFromTopic(payload: any) {
//     return this.callPythonAi('/api/v1/quizzes/generate-from-topic', payload);
//   }

//   // --- Attempt & Grading Simulations ---
//   async startAttempt(quizId: string) {
//     await this.findOne(quizId);
//     return {
//       status: 'success',
//       attemptId: `attempt_${Date.now()}`,
//       quizId,
//       startedAt: new Date().toISOString(),
//       message: 'Quiz attempt started.',
//     };
//   }

//   async submitAttempt(quizId: string, payload: any) {
//     await this.findOne(quizId);
//     // Real grading logic evaluates payload.answers against answer keys stored in DB
//     return {
//       status: 'success',
//       quizId,
//       score: 85.0,
//       totalQuestions: 10,
//       correctAnswers: 8,
//       message: 'Quiz submitted and graded successfully.',
//     };
//   }

//   async getResults(quizId: string) {
//     return { status: 'success', quizId, resultsSummary: 'Retrieved analysis of quiz attempts.' };
//   }

//   async getUserAttempts() {
//     return { status: 'success', attempts: [], message: 'Retrieved user quiz attempt history.' };
//   }

//   async getSpecificAttempt(attemptId: string) {
//     return { status: 'success', attemptId, reviewDetails: 'Detailed breakdown of attempt responses.' };
//   }
// }


// src/quizzes/quizzes.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity.js';
import { ConfigService } from '@nestjs/config';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { FilesService } from '../files/files.service.js';
import { resolveDocumentPayload } from '../common/storage/document-source.js';
import { XpService } from '../xp/xp.service.js';
import { CoinsService } from '../coins/coins.service.js'; // 1. Import CoinsService
import { gradeQuiz } from './utils/grade-quiz.util.js';
import { toLearnerAssessment } from '../common/assessment/learner-questions.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';

const QUIZ_PASS_SCORE = 50;
const QUIZ_XP_REWARD = 50;
const QUIZ_COIN_REWARD = 20;

@Injectable()
export class QuizzesService {

  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    private configService: ConfigService,
    private readonly xpService: XpService,
    private readonly coinsService: CoinsService, // 2. Inject CoinsService here
    private readonly filesService: FilesService,
  ) {
  }

  private async callPythonAi(endpoint: string, payload: any) {
    try {
      const response = await getAiHttpClient().post(endpoint, payload);
      return response.data;
    } catch (error: any) {
      throw toAiHttpException(error, `AI call ${endpoint}`);
    }
  }

  async findAll() {
    return await this.quizRepository.find();
  }

  async findOne(id: string) {
    const quiz = await this.quizRepository.findOne({ where: { id } });
    if (!quiz) throw new HttpException('Quiz not found', HttpStatus.NOT_FOUND);
    return quiz;
  }


  /** Learner view: questions without their answer keys (see common/assessment/learner-questions.ts). */
  async listForLearners() {
    return (await this.findAll()).map((item) => toLearnerAssessment(item));
  }

  async getForLearner(id: string) {
    return toLearnerAssessment(await this.findOne(id));
  }

  async create(createDto: any) {
    const quiz = this.quizRepository.create(createDto);
    return await this.quizRepository.save(quiz);
  }

  async update(id: string, updateDto: any) {
    await this.quizRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const quiz = await this.findOne(id);
    await this.quizRepository.remove(quiz);
    return { status: 'success', message: 'Quiz deleted successfully.' };
  }

  // --- AI Generation Bridges ---
  async generateQuiz(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate', payload);
  }

  async generateFromCourse(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate-from-course', payload);
  }

  async generateFromDocument(payload: any) {
    // Only an uploaded file id is accepted; a client-supplied fileUrl is never forwarded to the AI service
    const body = await resolveDocumentPayload(payload, (id) => this.filesService.findFileById(id));
    return this.callPythonAi('/api/v1/quizzes/generate-from-document', body);
  }

  async generateFromTopic(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate-from-topic', payload);
  }

  // --- Attempt & Grading Simulations ---
  /** Attempts are not stored: answers are submitted in one request (POST /quizzes/:id/submit). Was a fake attempt id. */
  async startAttempt(_quizId: string): Promise<never> {
    throw featureUnavailable('Quiz attempts', 'answers are submitted directly with POST /quizzes/{id}/submit, and attempts are not stored');
  }

  async submitAttempt(userId: string, quizId: string, payload: any) {
    const quiz = await this.findOne(quizId);

    // Grade the submitted answers against the answer key stored on the quiz questions
    const result = gradeQuiz(quiz.questions, payload?.answers);
    const passed = result.graded && result.score >= QUIZ_PASS_SCORE;

    let xpAwarded = 0;
    let coinsAwarded = 0;
    let message: string;

    // Reward policy: only a graded, passing attempt earns rewards, and only once per user per quiz
    const rewardMarker = `[quiz:${quiz.id}]`;
    const alreadyRewarded = passed
      ? await this.xpService.hasAwardForReference(userId, 'QUIZ_COMPLETED', rewardMarker)
      : false;

    if (!result.graded) {
      message = 'Quiz submitted, but it has no answer key to grade against. No rewards were awarded.';
    } else if (!passed) {
      message = `Quiz submitted and graded. A score of at least ${QUIZ_PASS_SCORE}% is required to earn rewards.`;
    } else if (alreadyRewarded) {
      message = 'Quiz submitted and graded. Rewards for this quiz have already been awarded.';
    } else {
      xpAwarded = QUIZ_XP_REWARD;
      coinsAwarded = QUIZ_COIN_REWARD;

      await this.xpService.awardXp(
        userId,
        xpAwarded,
        'QUIZ_COMPLETED',
        `Awarded ${xpAwarded} XP for completing quiz: ${quiz.title || quizId} ${rewardMarker}`
      );

      await this.coinsService.awardCoins(
        userId,
        coinsAwarded,
        'QUIZ_COMPLETED',
        `Awarded ${coinsAwarded} coins for completing quiz: ${quiz.title || quizId} ${rewardMarker}`
      );

      message = 'Quiz submitted, graded, XP, and Coins awarded successfully server-side.';
    }

    return {
      status: 'success',
      quizId,
      score: result.score,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      graded: result.graded,
      passed,
      xpAwarded,
      coinsAwarded,
      message,
    };
  }

  async getResults(_quizId: string): Promise<never> {
    throw featureUnavailable('Quiz results', 'Quiz attempts are not stored yet, so there is no attempt, result or history to return');
  }

  async getUserAttempts(): Promise<never> {
    throw featureUnavailable('Quiz attempt history', 'Quiz attempts are not stored yet, so there is no attempt, result or history to return');
  }

  async getSpecificAttempt(_attemptId: string): Promise<never> {
    throw featureUnavailable('Quiz attempt details', 'Quiz attempts are not stored yet, so there is no attempt, result or history to return');
  }
}
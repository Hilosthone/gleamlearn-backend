// // src/personal-ai/personal-ai.service.ts
// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { EvaluateAnswerDto } from './dto/personal-ai.dto.js';

// @Injectable()
// export class PersonalAiService {
//   private conversations = new Map<string, any>();

//   async chat(userId: string, message: string, conversationId?: string) {
//     const activeConvId = conversationId || `conv_${Date.now()}`;
    
//     const aiResponse = {
//       conversationId: activeConvId,
//       sender: 'ai',
//       message: `Personal AI Assistant processed your query: "${message}"`,
//       timestamp: new Date().toISOString(),
//     };

//     return { status: 'success', data: aiResponse };
//   }

//   async getConversations(userId: string) {
//     return { status: 'success', userId, conversations: Array.from(this.conversations.values()) };
//   }

//   async createConversation(userId: string, title: string) {
//     const newConv = { id: `conv_${Date.now()}`, userId, title: title || 'New Chat', createdAt: new Date() };
//     this.conversations.set(newConv.id, newConv);
//     return { status: 'success', conversation: newConv };
//   }

//   async getConversationById(userId: string, id: string) {
//     const conv = this.conversations.get(id);
//     if (!conv) throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
//     return { status: 'success', conversation: conv };
//   }

//   async deleteConversation(userId: string, id: string) {
//     if (!this.conversations.has(id)) {
//       throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
//     }
//     this.conversations.delete(id);
//     return { status: 'success', message: 'Conversation deleted successfully' };
//   }

//   // Contextual Study Endpoints
//   async explainConcept(input: string, context?: any) {
//     return { status: 'success', action: 'explain', input, explanation: `Detailed AI breakdown of: ${input}` };
//   }

//   async summarizeText(input: string) {
//     return { status: 'success', action: 'summarize', summary: `Condensed summary of text input.` };
//   }

//   async generateExample(input: string) {
//     return { status: 'success', action: 'generate-example', example: `Practical real-world example illustrating: ${input}` };
//   }

//   async generatePractice(input: string) {
//     return { status: 'success', action: 'generate-practice', practiceQuestion: `Practice question testing: ${input}` };
//   }

//   async evaluateAnswer(dto: EvaluateAnswerDto) {
//     return { status: 'success', action: 'evaluate-answer', score: 85, feedback: `Your answer is mostly correct. Consider adding more detail on key definitions.` };
//   }

//   async explainMistake(dto: EvaluateAnswerDto) {
//     return { status: 'success', action: 'explain-mistake', analysis: `Here is why your response missed the mark and how to correct it.` };
//   }
// }

// src/personal-ai/personal-ai.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AiConversation } from './entities/conversation.entity.js';
import { AiMessage } from './entities/ai-message.entity.js';
import { EvaluateAnswerDto } from './dto/personal-ai.dto.js';

@Injectable()
export class PersonalAiService {
  private readonly pythonApiUrl = process.env.AI_SERVICE_URL || 'https://gleamlearn-ai-service.onrender.com';
  private readonly apiKey = process.env.AI_API_KEY || '';

  constructor(
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
  ) {}

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  async chat(userId: string, messageContent: string, conversationId?: string) {
    let conversation: AiConversation;

    if (conversationId) {
      const foundConv = await this.conversationRepo.findOne({
        where: { id: conversationId, userId },
      });
      if (!foundConv) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
      conversation = foundConv;
    } else {
      conversation = this.conversationRepo.create({
        userId,
        title: messageContent.substring(0, 30) + '...',
      });
      await this.conversationRepo.save(conversation);
    }

    // 1. Save user message to PostgreSQL
    const userMsg = this.messageRepo.create({
      conversationId: conversation.id,
      sender: 'user',
      content: messageContent,
    });
    await this.messageRepo.save(userMsg);

    let aiResponseText = 'AI Assistant response unavailable.';

    try {
      // 2. Forward chat request to Python AI Microservice
      const response = await axios.post(
        `${this.pythonApiUrl}/api/v1/chat`,
        { message: messageContent, conversationId: conversation.id },
        { headers: this.getAuthHeaders() }
      );
      aiResponseText = response.data?.message || response.data?.response || aiResponseText;
    } catch (error) {
      // Fallback gracefully if Python microservice is cold-starting on Render
      aiResponseText = `[Offline Mode] Python AI Service received your message: "${messageContent}"`;
    }

    // 3. Save AI response message to PostgreSQL
    const aiMsg = this.messageRepo.create({
      conversationId: conversation.id,
      sender: 'ai',
      content: aiResponseText,
    });
    await this.messageRepo.save(aiMsg);

    return {
      status: 'success',
      data: {
        conversationId: conversation.id,
        userMessage: userMsg,
        aiMessage: aiMsg,
      },
    };
  }

  async getConversations(userId: string) {
    const conversations = await this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return { status: 'success', userId, conversations };
  }

  async createConversation(userId: string, title: string) {
    const conversation = this.conversationRepo.create({
      userId,
      title: title || 'New Chat',
    });
    await this.conversationRepo.save(conversation);
    return { status: 'success', conversation };
  }

  async getConversationById(userId: string, id: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id, userId },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return { status: 'success', conversation };
  }

  async deleteConversation(userId: string, id: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id, userId },
    });

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    await this.conversationRepo.remove(conversation);
    return { status: 'success', message: 'Conversation deleted successfully' };
  }

  // Contextual Study Endpoints (Proxying to Python AI microservice)
  private async callPythonTool(endpoint: string, payload: any) {
    try {
      const response = await axios.post(`${this.pythonApiUrl}/${endpoint}`, payload, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      // Fallback response if microservice endpoint is unreachable
      return {
        status: 'success',
        fallback: true,
        message: `Processed locally or Python service unreachable for ${endpoint}`,
        payload,
      };
    }
  }

  async explainConcept(input: string, context?: any) {
    return this.callPythonTool('api/v1/ai/explain', { input, context });
  }

  async summarizeText(input: string) {
    return this.callPythonTool('api/v1/ai/summarize', { input });
  }

  async generateExample(input: string) {
    return this.callPythonTool('api/v1/ai/generate-example', { input });
  }

  async generatePractice(input: string) {
    return this.callPythonTool('api/v1/ai/generate-practice', { input });
  }

  async evaluateAnswer(dto: EvaluateAnswerDto) {
    return this.callPythonTool('api/v1/ai/evaluate-answer', dto);
  }

  async explainMistake(dto: EvaluateAnswerDto) {
    return this.callPythonTool('api/v1/ai/explain-mistake', dto);
  }
}
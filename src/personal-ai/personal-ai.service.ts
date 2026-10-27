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
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { AiConversation } from './entities/conversation.entity.js';
import { AiMessage } from './entities/ai-message.entity.js';
import { EvaluateAnswerDto } from './dto/personal-ai.dto.js';

@Injectable()
export class PersonalAiService {
  constructor(
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
  ) {}

  async chat(userId: string, messageContent: string, conversationId?: string) {
    let existingConversation: AiConversation | null = null;

    if (conversationId) {
      existingConversation = await this.conversationRepo.findOne({
        where: { id: conversationId, userId },
      });
      if (!existingConversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
    }

    // 1. Get the AI response first. If the AI service fails, the request fails with a safe error
    //    and nothing is persisted (no placeholder "offline" replies stored as AI messages).
    let aiResponseText: string;
    try {
      // earlier turns of this conversation go with the message (each message used to be answered alone)
      const previous = existingConversation
        ? await this.messageRepo.find({ where: { conversationId: existingConversation.id }, order: { createdAt: 'DESC' }, take: 12 })
        : [];
      const history = previous.reverse().map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content }));
      const response = await getAiHttpClient().post('/api/v1/chat', {
        message: messageContent,
        conversationId: existingConversation?.id,
        history,
      });
      aiResponseText = response.data?.message || response.data?.response;
    } catch (error) {
      throw toAiHttpException(error, 'AI personal assistant chat');
    }
    if (!aiResponseText) {
      throw new HttpException('AI generation failed. Please try again later.', HttpStatus.BAD_GATEWAY);
    }

    let conversation: AiConversation;
    if (existingConversation) {
      conversation = existingConversation;
    } else {
      conversation = this.conversationRepo.create({
        userId,
        title: messageContent.substring(0, 30) + '...',
      });
      await this.conversationRepo.save(conversation);
    }

    // 2. Save user message to PostgreSQL
    const userMsg = this.messageRepo.create({
      conversationId: conversation.id,
      sender: 'user',
      content: messageContent,
    });
    await this.messageRepo.save(userMsg);

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
      const response = await getAiHttpClient().post(`/${endpoint}`, payload);
      return response.data;
    } catch (error) {
      // Never report a failed AI call as a success
      throw toAiHttpException(error, `AI personal assistant ${endpoint}`);
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
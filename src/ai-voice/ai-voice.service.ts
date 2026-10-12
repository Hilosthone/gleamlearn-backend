// src/ai-voice/ai-voice.service.ts
import { Injectable } from '@nestjs/common';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';

@Injectable()
export class AiVoiceService {
  async proxyToPython(endpoint: string, data: any) {
    try {
      const response = await getAiHttpClient().post(`/api/v1/ai/voice/${endpoint}`, data);
      return response.data;
    } catch (error: any) {
      throw toAiHttpException(error, `AI voice call ${endpoint}`);
    }
  }
}
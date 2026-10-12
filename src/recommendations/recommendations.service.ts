// src/recommendations/recommendations.service.ts
import { Injectable } from '@nestjs/common';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';

@Injectable()
export class RecommendationsService {
  async proxyToPython(path: string) {
    try {
      const response = await getAiHttpClient().get(`/api/v1/recommendations${path}`);
      return response.data;
    } catch (error: any) {
      throw toAiHttpException(error, 'AI recommendations call');
    }
  }
}
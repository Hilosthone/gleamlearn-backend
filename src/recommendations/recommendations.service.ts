// src/recommendations/recommendations.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecommendationsService {
  async proxyToPython(path: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const aiApiKey = process.env.AI_API_KEY || '674930';

    try {
      const response = await axios.get(`${aiServiceUrl}/api/v1/recommendations${path}`, {
        headers: { 'X-API-Key': aiApiKey },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`AI Recommendations Microservice Error: ${error?.message || 'Unknown error'}`);
    }
  }
}
// src/ai-voice/ai-voice.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiVoiceService {
  async proxyToPython(endpoint: string, data: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const aiApiKey = process.env.AI_API_KEY || '674930';

    try {
      const response = await axios.post(`${aiServiceUrl}/api/v1/ai/voice/${endpoint}`, data, {
        headers: { 'X-API-Key': aiApiKey },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`AI Voice Microservice Error: ${error?.message || 'Unknown error'}`);
    }
  }
}
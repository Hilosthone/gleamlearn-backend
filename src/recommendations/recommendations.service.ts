// src/recommendations/recommendations.service.ts
import { Injectable } from '@nestjs/common';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';

/**
 * Personalised recommendations are not implemented. The AI service's recommendation routes ignore the learner
 * (the userId sent here was never used): they ask the model for generic suggestions, so it invented courses and
 * ids that are not in the catalogue. Until recommendations are computed from the real catalogue and the
 * learner's progress, every route answers 501 FEATURE_UNAVAILABLE without calling the AI service.
 */
@Injectable()
export class RecommendationsService {
  async proxyToPython(_path: string): Promise<never> {
    throw featureUnavailable('Personalised recommendations', 'recommendations are not yet computed from the catalogue and your progress');
  }
}

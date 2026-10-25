// src/common/errors/feature-unavailable.ts
import { NotImplementedException } from '@nestjs/common';

/** Machine-readable code clients use to show "not available yet" instead of an error or a fake success. */
export const FEATURE_UNAVAILABLE = 'FEATURE_UNAVAILABLE';

/**
 * The one response for capabilities that are not implemented yet: HTTP 501 with
 * `{ statusCode: 501, error: 'Not Implemented', code: 'FEATURE_UNAVAILABLE', feature, message }`.
 * It is thrown before any work is done, so nothing is stored, charged or sent to the AI service.
 */
export function featureUnavailable(feature: string, reason: string): NotImplementedException {
  return new NotImplementedException({
    statusCode: 501,
    error: 'Not Implemented',
    code: FEATURE_UNAVAILABLE,
    feature,
    message: `${feature} is not available yet: ${reason}.`,
  });
}

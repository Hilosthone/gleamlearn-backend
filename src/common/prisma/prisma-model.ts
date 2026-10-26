import { featureUnavailable } from '../errors/feature-unavailable.js';

/**
 * The Prisma contract (src/prisma/schema.json) has no models for calendar events, reports, feedback, subscription
 * plans, subscriptions, AI usage logs, study materials or quiz attempts, and their tables don't exist. Reading
 * `prisma.<model>` gave undefined and every route using it answered 500 ("Cannot read properties of undefined").
 * This answers 501 FEATURE_UNAVAILABLE instead, before any work is done. Creating the tables is a schema change.
 */
export function prismaModel(prisma: unknown, name: string, feature: string): any {
  const model = (prisma as Record<string, unknown> | null)?.[name];
  if (!model) throw featureUnavailable(feature, 'its database tables have not been created yet');
  return model;
}

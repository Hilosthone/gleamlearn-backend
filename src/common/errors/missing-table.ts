import { featureUnavailable } from './feature-unavailable.js';

/**
 * Tables added by a migration that may not have run yet on this database (production has DB_SYNCHRONIZE off).
 * Until it runs, routes that use them answer 501 FEATURE_UNAVAILABLE instead of 500, so the code can be deployed
 * before the migration without breaking anything else.
 */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } } | null;
  return e?.driverError?.code === '42P01' || e?.code === '42P01'; // undefined_table
}

export async function withTable<T>(feature: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isMissingTable(err)) throw featureUnavailable(feature, 'its database table has not been created yet');
    throw err;
  }
}

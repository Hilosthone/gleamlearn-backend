// src/common/utils/pick-defined.ts

/**
 * Copies only the listed keys that are defined. Used before passing request bodies to services that
 * spread or assign them into entities, so unknown or protected fields (id, courseId, timestamps) are dropped.
 */
export function pickDefined<T extends object, K extends keyof T>(source: T | null | undefined, keys: readonly K[]): Partial<Pick<T, K>> {
  const out: Partial<Pick<T, K>> = {};
  if (!source) return out;
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

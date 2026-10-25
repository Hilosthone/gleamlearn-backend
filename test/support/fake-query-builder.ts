// test/support/fake-query-builder.ts — test-only TypeORM query-builder recorder (test/ is excluded from the build)

export interface RecordedQuery {
  alias: string;
  select: string[];
  where: string[];
  params: Record<string, unknown>;
  take?: number;
}

/**
 * A chainable stand-in for SelectQueryBuilder. Every call is recorded in `query`; the terminal methods return
 * the configured result. Used to prove WHAT a service asks the database for (fields, conditions, parameters).
 */
export function fakeQueryBuilder(alias: string, result: { many?: unknown[]; count?: number; raw?: unknown }) {
  const query: RecordedQuery = { alias, select: [], where: [], params: {} };
  const qb: any = {
    query,
    select: (s: string | string[], _alias?: string) => {
      query.select.push(...(Array.isArray(s) ? s : [s]));
      return qb;
    },
    where: (w: string, p?: Record<string, unknown>) => {
      query.where.push(w);
      Object.assign(query.params, p);
      return qb;
    },
    andWhere: (w: string, p?: Record<string, unknown>) => qb.where(w, p),
    orderBy: () => qb,
    take: (n: number) => {
      query.take = n;
      return qb;
    },
    getMany: async () => result.many ?? [],
    getCount: async () => result.count ?? 0,
    getRawOne: async () => result.raw,
  };
  return qb;
}

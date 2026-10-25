// test/support/email-aware-repo.ts — test-only fake (the test/ folder is excluded from the build)
import { FindOperator } from 'typeorm';

/** Fake User repository that understands exact values and the Raw `LOWER(column) = :normalized` lookup. */
export function emailAwareRepo(rows: Array<Record<string, any>>) {
  const matches = (row: Record<string, any>, where: Record<string, any>) =>
    Object.entries(where).every(([k, v]) => {
      if (v instanceof FindOperator && v.type === 'raw') {
        const params = (v as any).objectLiteralParameters as { normalized: string };
        return String(row[k] ?? '').toLowerCase() === params.normalized;
      }
      return row[k] === v;
    });
  return {
    findOne: vi.fn(async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null),
    create: vi.fn((d: any) => ({ id: 'new-user', ...d })),
    save: vi.fn(async (u: any) => {
      rows.push(u);
      return u;
    }),
  };
}

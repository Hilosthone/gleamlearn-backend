import { ForbiddenException, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AccountStatusService, type AccountStatus } from './account-status.service.js';

const ALL_COLUMNS = ['id', 'email', 'is_restricted', 'restriction_reason', 'isFrozen', 'deletedAt', 'role'];

function fakeDataSource(columns: string[], row: Record<string, unknown> | null) {
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('information_schema.columns')) return columns.map((column_name) => ({ column_name }));
    if (sql.startsWith('SELECT')) return row ? [row] : [];
    if (sql.startsWith('UPDATE')) return [[], params?.[0] === 'missing-user' ? 0 : 1];
    throw new Error('unexpected SQL');
  });
  return { query };
}

const base: AccountStatus = { exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' };

describe('AccountStatusService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('reads every status column that exists, with a parameterized id', async () => {
    const ds = fakeDataSource(ALL_COLUMNS, { id: 'u1', restricted: true, restrictionReason: 'abuse', frozen: false, deleted: null, role: 'student' });
    const svc = new AccountStatusService(ds as any);
    await svc.onModuleInit();
    const status = await svc.getStatus('u1');
    expect(status).toEqual({ exists: true, restricted: true, restrictionReason: 'abuse', frozen: false, deleted: false, role: 'student' });
    const select = ds.query.mock.calls.find((c) => String(c[0]).startsWith('SELECT "id"'))!;
    expect(select[0]).toContain('"is_restricted" AS "restricted"');
    expect(select[0]).toContain('"isFrozen" AS "frozen"');
    expect(select[0]).toContain('"deletedAt" AS "deleted"');
    expect(select[1]).toEqual(['u1']);
  });

  it('only selects columns that exist (no failure on a database without isFrozen/deletedAt), and warns by name', async () => {
    const ds = fakeDataSource(['id', 'is_restricted', 'restriction_reason'], { id: 'u1', restricted: false });
    const svc = new AccountStatusService(ds as any);
    await svc.onModuleInit();
    const status = await svc.getStatus('u1');
    expect(status.frozen).toBe(false);
    expect(status.deleted).toBe(false);
    const select = String(ds.query.mock.calls.find((c) => String(c[0]).startsWith('SELECT "id"'))![0]);
    expect(select).not.toContain('isFrozen');
    expect(select).not.toContain('deletedAt');
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('isFrozen'));
    await expect(svc.setFrozen('u1', true)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reports a missing user', async () => {
    const svc = new AccountStatusService(fakeDataSource(ALL_COLUMNS, null) as any);
    expect((await svc.getStatus('nope')).exists).toBe(false);
  });

  it('writes restriction, freeze and soft delete with fixed column names and parameters', async () => {
    const ds = fakeDataSource(ALL_COLUMNS, null);
    const svc = new AccountStatusService(ds as any);
    await svc.onModuleInit();
    expect(await svc.setRestricted('u1', true, 'Suspended by an administrator')).toBe(1);
    expect(await svc.setRestricted('u1', false, 'ignored')).toBe(1);
    expect(await svc.setFrozen('u1', true)).toBe(1);
    expect(await svc.softDelete('u1')).toBe(1);
    expect(await svc.setFrozen('missing-user', true)).toBe(0);
    const updates = ds.query.mock.calls.filter((c) => String(c[0]).startsWith('UPDATE'));
    expect(updates[0]).toEqual(['UPDATE "users" SET "is_restricted" = $2, "restriction_reason" = $3 WHERE "id" = $1', ['u1', true, 'Suspended by an administrator']]);
    expect(updates[1][1]).toEqual(['u1', false, null]); // the reason is cleared when unrestricting
    expect(updates[3][0]).toContain('"deletedAt" = now(), "isFrozen" = true');
    expect(updates[3][0]).toContain('"deletedAt" IS NULL'); // never re-deletes or changes an existing deletion time
  });

  it('state precedence: deleted > restricted > frozen > active', () => {
    expect(AccountStatusService.stateOf({ ...base, deleted: true, restricted: true, frozen: true })).toBe('deleted');
    expect(AccountStatusService.stateOf({ ...base, restricted: true, frozen: true })).toBe('restricted');
    expect(AccountStatusService.stateOf({ ...base, frozen: true })).toBe('frozen');
    expect(AccountStatusService.stateOf(base)).toBe('active');
    expect(AccountStatusService.stateOf({ ...base, exists: false })).toBe('missing');
  });

  it.each([
    ['active', base, true, null],
    ['frozen on an allowed route', { ...base, frozen: true }, true, null],
    ['frozen on another route', { ...base, frozen: true }, false, ForbiddenException],
    ['restricted', { ...base, restricted: true }, true, ForbiddenException],
    ['deleted', { ...base, deleted: true }, true, UnauthorizedException],
    ['missing', { ...base, exists: false }, true, UnauthorizedException],
  ] as const)('assertAllowed: %s', (_label, status, allowFrozen, expected) => {
    const run = () => AccountStatusService.assertAllowed(status as AccountStatus, { allowFrozen, unauthorizedMessage: 'nope' });
    if (expected) expect(run).toThrow(expected);
    else expect(run).not.toThrow();
  });

  it('403 bodies carry a stable code and a safe message', () => {
    try {
      AccountStatusService.assertAllowed({ ...base, restricted: true, restrictionReason: 'internal note' }, { allowFrozen: true, unauthorizedMessage: 'x' });
    } catch (e: any) {
      expect(e.getResponse()).toEqual({ statusCode: 403, code: 'ACCOUNT_RESTRICTED', message: 'This account has been restricted. Please contact support.' });
      expect(JSON.stringify(e.getResponse())).not.toContain('internal note');
    }
  });
});

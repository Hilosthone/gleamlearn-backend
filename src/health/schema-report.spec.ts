import { SchemaReportService } from './schema-report.service.js';

function build(entityTables: string[], existing: Array<{ schema: string; name: string; on_path: boolean }>) {
  const dataSource = {
    entityMetadatas: entityTables.map((tableName) => ({ tableName, tableType: 'regular', schema: undefined })),
    query: vi.fn(async () => existing),
  };
  return { service: new SchemaReportService(dataSource as any), dataSource };
}

describe('SchemaReportService (read-only startup check)', () => {
  it('reports the entity tables that do not exist on the search path', async () => {
    const { service } = build(['users', 'admins', 'courses'], [
      { schema: 'public', name: 'admins', on_path: true },
      { schema: 'public', name: 'courses', on_path: true },
      { schema: 'archive', name: 'users', on_path: false }, // a users table outside the search path does not count
    ]);
    expect(await service.check()).toEqual({ expected: 3, missing: ['users'] });
  });

  it('logs an error naming the missing tables, and never throws', async () => {
    const { service } = build(['users', 'admins'], [{ schema: 'public', name: 'admins', on_path: true }]);
    const error = vi.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    await service.onApplicationBootstrap();
    expect(error.mock.calls[0][0]).toMatch(/1 of 2 entity tables are MISSING: users/);
    const failing = build(['users'], []);
    failing.dataSource.query.mockRejectedValueOnce(new Error('db down'));
    const warn = vi.spyOn((failing.service as any).logger, 'warn').mockImplementation(() => undefined);
    await expect(failing.service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('only runs a catalog SELECT (no DDL, no table reads)', async () => {
    const { service, dataSource } = build(['users'], [{ schema: 'public', name: 'users', on_path: true }]);
    await service.check();
    const sql = String(dataSource.query.mock.calls[0][0]);
    expect(sql).toMatch(/FROM pg_class/);
    expect(sql).not.toMatch(/\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i);
  });
});

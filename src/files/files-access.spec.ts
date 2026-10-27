import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { ADMIN_PERMISSION_KEY, AdminPermission } from '../admin/auth/admin-permissions.js';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FilesController } from './files.controller.js';

/**
 * Files have no owner column yet (B4). Listing every file and deleting any file by id were open to every learner,
 * so they are admin-only until ownership exists. Upload, read-by-id, status and processing stay learner routes.
 */
describe('file routes', () => {
  const guards = (m: string) => Reflect.getMetadata(GUARDS_METADATA, (FilesController.prototype as any)[m]) ?? [];
  const permission = (m: string) => Reflect.getMetadata(ADMIN_PERMISSION_KEY, (FilesController.prototype as any)[m]);

  it('has no class-level learner guard (it would reject admin tokens)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FilesController)).toBeUndefined();
  });

  it.each(['findAllFiles', 'deleteFile'])('%s is admin-only', (m) => {
    expect(guards(m)).toEqual([AdminJwtAuthGuard]);
    expect(permission(m)).toBe(AdminPermission.CONTENT_MANAGE);
  });

  it.each(['uploadSingleFile', 'uploadMultipleFiles', 'findFileById', 'getFileStatus', 'processFile', 'reprocessFile'])('%s stays a learner route', (m) => {
    expect(guards(m)).toEqual([JwtAuthGuard]);
  });
});

describe('file processing', () => {
  it('answers 501 instead of reporting a processing that never happened', async () => {
    const { FilesService } = await import('./files.service.js');
    const repo = { findOne: vi.fn(), save: vi.fn() };
    const service = new FilesService(repo as never, {} as never);
    await expect(service.processFile('f1')).rejects.toMatchObject({ status: 501 });
    await expect(service.reprocessFile('f1')).rejects.toMatchObject({ status: 501 });
    expect(repo.save).not.toHaveBeenCalled();
  });
});

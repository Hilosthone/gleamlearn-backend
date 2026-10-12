import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service.js';
import { UsersService } from '../../users/users.service.js';
import { buildBasicProfileUpdate } from './profile-update.util.js';

const PROTECTED_ATTEMPT = {
  passwordHash: 'attacker-hash',
  isEmailVerified: true,
  isRestricted: false,
  restrictionReason: null,
  refreshToken: 'stolen',
  verificationOtp: '000000',
  otpExpiresAt: '2099-01-01',
  role: 'ADMIN',
  isFrozen: false,
  deletedAt: null,
  id: 'someone-else',
};

describe('buildBasicProfileUpdate', () => {
  it('keeps only allowed basic fields', () => {
    expect(buildBasicProfileUpdate({ fullName: 'Ada', country: 'NG', ...PROTECTED_ATTEMPT }, 'a@x.com')).toEqual({
      fullName: 'Ada',
      country: 'NG',
    });
  });

  it('maps legacy name to fullName', () => {
    expect(buildBasicProfileUpdate({ name: 'Ada' })).toEqual({ fullName: 'Ada' });
  });

  it('ignores an unchanged email and rejects a different one', () => {
    expect(buildBasicProfileUpdate({ email: 'A@x.com', username: 'ada' }, 'a@x.com')).toEqual({ username: 'ada' });
    expect(() => buildBasicProfileUpdate({ email: 'new@x.com' }, 'a@x.com')).toThrow(BadRequestException);
  });
});

describe('PATCH /auth/me (AuthService.updateMe)', () => {
  it('never writes protected fields to the user record', async () => {
    const user: any = { id: 'u1', email: 'a@x.com', fullName: 'Old', passwordHash: 'real-hash', isEmailVerified: false, isRestricted: true };
    const repo = { findOne: vi.fn().mockResolvedValue(user), save: vi.fn(async (u: any) => u) };
    const service = Object.create(AuthService.prototype);
    service.userRepository = repo;

    const res = await service.updateMe('u1', { fullName: 'New Name', ...PROTECTED_ATTEMPT });

    const saved = repo.save.mock.calls[0][0];
    expect(saved.fullName).toBe('New Name');
    expect(saved.passwordHash).toBe('real-hash');
    expect(saved.isEmailVerified).toBe(false);
    expect(saved.isRestricted).toBe(true);
    expect(saved.refreshToken).toBeUndefined();
    expect(saved.verificationOtp).toBeUndefined();
    expect(saved.role).toBeUndefined();
    expect(saved.id).toBe('u1');
    expect(res.data.passwordHash).toBeUndefined();
  });

  it('rejects an email change without verification', async () => {
    const repo = { findOne: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@x.com' }), save: vi.fn() };
    const service = Object.create(AuthService.prototype);
    service.userRepository = repo;
    await expect(service.updateMe('u1', { email: 'evil@x.com' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('PATCH /users/me family (UsersService)', () => {
  function build() {
    const repo = {
      findOne: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@x.com', passwordHash: 'h' }),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    return { repo, service: new UsersService(repo as any) };
  }

  it('updateProfile writes only basic profile fields', async () => {
    const { repo, service } = build();
    await service.updateProfile('u1', { username: 'ada', ...PROTECTED_ATTEMPT } as any);
    expect(repo.update).toHaveBeenCalledWith('u1', { username: 'ada' });
  });

  it('updateAcademicProfile writes only academic fields', async () => {
    const { repo, service } = build();
    await service.updateAcademicProfile('u1', { university: 'UI', faculty: 'Science', ...PROTECTED_ATTEMPT } as any);
    expect(repo.update).toHaveBeenCalledWith('u1', { university: 'UI', faculty: 'Science' });
  });

  it('updatePreferences writes only preference fields and skips empty updates', async () => {
    const { repo, service } = build();
    await service.updatePreferences('u1', { preferredStudyTime: 'Night', ...PROTECTED_ATTEMPT } as any);
    expect(repo.update).toHaveBeenCalledWith('u1', { preferredStudyTime: 'Night' });
    repo.update.mockClear();
    await service.updatePreferences('u1', { passwordHash: 'x' } as any);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';

function build(user: Record<string, unknown> | null) {
  const service = Object.create(UsersService.prototype);
  service.userRepository = { findOne: vi.fn(async () => (user ? { ...user } : null)), update: vi.fn(async () => ({ affected: 1 })) };
  service.accountStatus = { softDelete: vi.fn(async () => 1) };
  return service as UsersService & { userRepository: any; accountStatus: any };
}

describe('GET /users/me never returns credentials or one-time codes', () => {
  it('strips passwordHash, verificationOtp, otpExpiresAt and refreshToken', async () => {
    const service = build({
      id: 'u1', email: 'a@x.test', fullName: 'Ada',
      passwordHash: 'hash', verificationOtp: '123456', otpExpiresAt: new Date(), refreshToken: 'rt',
    });
    const profile = await service.getProfile('u1');
    expect(profile).toMatchObject({ id: 'u1', email: 'a@x.test', fullName: 'Ada' });
    for (const key of ['passwordHash', 'verificationOtp', 'otpExpiresAt', 'refreshToken']) {
      expect(profile).not.toHaveProperty(key);
    }
  });
});

describe('DELETE /users/me requires the current password', () => {
  const user = async () => ({ id: 'u1', email: 'a@x.test', passwordHash: await bcrypt.hash('Correct-1!', 4) });

  it.each([[undefined], [''], [123]])('missing password (%s) → 400, nothing deleted', async (password) => {
    const service = build(await user());
    await expect(service.softDeleteAccount('u1', password)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.accountStatus.softDelete).not.toHaveBeenCalled();
  });

  it('wrong password → 400 "Incorrect password" (not 401, so the session is not treated as expired)', async () => {
    const service = build(await user());
    await expect(service.softDeleteAccount('u1', 'wrong')).rejects.toThrow('Incorrect password');
    expect(service.accountStatus.softDelete).not.toHaveBeenCalled();
  });

  it('correct password → soft delete (data retained)', async () => {
    const service = build(await user());
    await expect(service.softDeleteAccount('u1', 'Correct-1!')).resolves.toMatchObject({ message: expect.stringMatching(/soft deleted/) });
    expect(service.accountStatus.softDelete).toHaveBeenCalledWith('u1');
  });
});

describe('profile writes do not fail on fields the entity lacks (B2)', () => {
  it('levelOrClass is stored in the existing `level` column', async () => {
    const service = build({ id: 'u1', email: 'a@x.test' });
    await service.updateAcademicProfile('u1', { levelOrClass: '200L', university: 'Uni' } as any);
    expect(service.userRepository.update).toHaveBeenCalledWith('u1', { level: '200L', university: 'Uni' });
  });

  it('preferredLearningPace is reported as notStored instead of a 500', async () => {
    const service = build({ id: 'u1', email: 'a@x.test' });
    const res: any = await service.updatePreferences('u1', { preferredLearningPace: 'fast', preferredStudyTime: 'Evening' } as any);
    expect(service.userRepository.update).toHaveBeenCalledWith('u1', { preferredStudyTime: 'Evening' });
    expect(res.notStored).toEqual(['preferredLearningPace']);
  });
});

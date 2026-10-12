import { BadRequestException, Body, Controller, INestApplication, Post, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/password.dto.js';
import { createGlobalValidationPipe } from '../common/validation/global-validation.pipe.js';

async function buildService(currentPassword = 'OldPass1!') {
  const user: any = { id: 'u1', email: 'a@x.com', fullName: 'Ada', passwordHash: await bcrypt.hash(currentPassword, 4) };
  const repo = { findOne: vi.fn().mockResolvedValue(user), save: vi.fn(async (u: any) => u) };
  const mailService = { sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined) };
  const service = Object.create(AuthService.prototype);
  service.userRepository = repo;
  service.mailService = mailService;
  return { service, repo, user, mailService };
}

describe('AuthService.changePassword', () => {
  it('changes the password when the confirmation matches', async () => {
    const { service, repo, user, mailService } = await buildService();
    const oldHash = user.passwordHash;
    await expect(
      service.changePassword('u1', { oldPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }),
    ).resolves.toEqual({ message: 'Password changed successfully' });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(user.passwordHash).not.toBe(oldHash);
    expect(await bcrypt.compare('NewPass1!', user.passwordHash)).toBe(true);
    expect(mailService.sendPasswordChangedEmail).toHaveBeenCalledWith('a@x.com', 'Ada');
  });

  it('rejects a mismatched confirmation without saving', async () => {
    const { service, repo } = await buildService();
    await expect(
      service.changePassword('u1', { oldPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmNewPassword: 'Different1!' }),
    ).rejects.toThrow(new BadRequestException('New passwords do not match'));
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a missing confirmation even when request validation is disabled', async () => {
    const { service, repo } = await buildService();
    await expect(service.changePassword('u1', { oldPassword: 'OldPass1!', newPassword: 'NewPass1!' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects an incorrect old password without saving', async () => {
    const { service, repo } = await buildService();
    await expect(
      service.changePassword('u1', { oldPassword: 'Wrong1!', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('Password cannot be changed through profile updates', () => {
  it('PATCH /auth/me ignores password-related fields', async () => {
    const { service, repo, user } = await buildService();
    const originalHash = user.passwordHash;
    await service.updateMe('u1', {
      fullName: 'Ada L',
      password: 'Hacked1!',
      newPassword: 'Hacked1!',
      confirmNewPassword: 'Hacked1!',
      passwordHash: 'x',
    });
    const saved = repo.save.mock.calls[0][0];
    expect(saved.fullName).toBe('Ada L');
    expect(saved.passwordHash).toBe(originalHash);
    expect(saved.password).toBeUndefined();
    expect(saved.newPassword).toBeUndefined();
  });
});

@Controller('auth')
class ChangePasswordProbe {
  @Post('change-password')
  change(@Body() body: ChangePasswordDto) {
    return { ok: true, keys: Object.keys(body).sort() };
  }
}

describe('ChangePasswordDto validation (HTTP)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ChangePasswordProbe] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });
  afterAll(async () => app.close());

  it('requires confirmNewPassword', async () => {
    const res = await request(app.getHttpServer()).post('/auth/change-password').send({ oldPassword: 'OldPass1!', newPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message)).toContain('confirmNewPassword');
  });

  it('accepts the payload the updated frontend client sends', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ oldPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' });
    expect(res.status).toBe(201);
    expect(res.body.keys).toEqual(['confirmNewPassword', 'newPassword', 'oldPassword']);
  });
});

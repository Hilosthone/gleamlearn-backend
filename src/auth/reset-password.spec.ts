import { BadRequestException, Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { ResetPasswordDto } from './dto/password.dto.js';
import { createGlobalValidationPipe } from '../common/validation/global-validation.pipe.js';

function build(user: any) {
  const repo = { findOne: vi.fn().mockResolvedValue(user), save: vi.fn(async (u: any) => u) };
  const mailService = { sendPasswordResetSuccessEmail: vi.fn().mockResolvedValue(undefined) };
  const service = Object.create(AuthService.prototype);
  service.userRepository = repo;
  service.mailService = mailService;
  return { service, repo, mailService };
}

const validUser = () => ({
  id: 'u1',
  email: 'a@x.com',
  fullName: 'Ada',
  passwordHash: 'old-hash',
  verificationOtp: '123456',
  otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
});

describe('AuthService.resetPassword', () => {
  it('resets the password and clears the code when the confirmation matches', async () => {
    const user = validUser();
    const { service, repo, mailService } = build(user);
    await expect(
      service.resetPassword({ token: '123456', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }),
    ).resolves.toEqual({ message: 'Password has been reset successfully!' });
    expect(repo.findOne).toHaveBeenCalledWith({ where: { verificationOtp: '123456' } });
    expect(await bcrypt.compare('NewPass1!', user.passwordHash)).toBe(true);
    expect(user.verificationOtp).toBeNull();
    expect(user.otpExpiresAt).toBeNull();
    expect(mailService.sendPasswordResetSuccessEmail).toHaveBeenCalledWith('a@x.com', 'Ada');
  });

  it('rejects mismatched passwords without looking up or saving', async () => {
    const { service, repo } = build(validUser());
    await expect(
      service.resetPassword({ token: '123456', newPassword: 'NewPass1!', confirmNewPassword: 'Other1!' }),
    ).rejects.toThrow(new BadRequestException('New passwords do not match'));
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each([
    ['missing confirmation', { token: '123456', newPassword: 'NewPass1!' }],
    ['missing token', { newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }],
    ['blank token', { token: '   ', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }],
    ['non-string token', { token: { $ne: null }, newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }],
  ])('rejects %s with 400 before any user lookup', async (_label, body) => {
    const { service, repo } = build(validUser());
    await expect(service.resetPassword(body)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired code without saving', async () => {
    const unknown = build(null);
    await expect(
      unknown.service.resetPassword({ token: '000000', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }),
    ).rejects.toThrow('Invalid or expired password reset code');
    expect(unknown.repo.save).not.toHaveBeenCalled();

    const expired = build({ ...validUser(), otpExpiresAt: new Date(Date.now() - 1000) });
    await expect(
      expired.service.resetPassword({ token: '123456', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' }),
    ).rejects.toThrow('Invalid or expired password reset code');
    expect(expired.repo.save).not.toHaveBeenCalled();
  });
});

@Controller('auth')
class ResetProbe {
  @Post('reset-password')
  reset(@Body() _body: ResetPasswordDto) {
    return { ok: true };
  }
}

describe('ResetPasswordDto validation (HTTP)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ResetProbe] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });
  afterAll(async () => app.close());

  it('requires confirmNewPassword', async () => {
    const res = await request(app.getHttpServer()).post('/auth/reset-password').send({ token: '123456', newPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message)).toContain('confirmNewPassword');
  });

  it('accepts the full payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: '123456', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' });
    expect(res.status).toBe(201);
  });
});

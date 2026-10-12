import { Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { generateOtp } from './otp.js';
import { AuthService } from '../../auth/auth.service.js';
import { MailService } from '../../mail/mail.service.js';

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

describe('generateOtp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses crypto.randomInt for a 6-digit code and never Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    for (let i = 0; i < 2000; i++) {
      const code = generateOtp();
      expect(code).toMatch(/^[1-9]\d{5}$/);
    }
    expect(crypto.randomInt).toHaveBeenCalledWith(100_000, 1_000_000);
    expect(mathRandom).not.toHaveBeenCalled();
  });
});

/** Collects everything written through console.* and Nest's Logger during a call. */
function captureLogs() {
  const lines: string[] = [];
  const record = (...args: unknown[]) => lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation(record);
  }
  for (const method of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
    vi.spyOn(Logger.prototype, method).mockImplementation(record as any);
  }
  return lines;
}

describe('reset and verification codes are never logged', () => {
  afterEach(() => vi.restoreAllMocks());

  function authWithFailingMail() {
    const user: any = { id: 'u1', email: 'ada@example.com', fullName: 'Ada', isEmailVerified: false };
    const repo = { findOne: vi.fn().mockResolvedValue(user), save: vi.fn(async (u: any) => u) };
    const mailService = {
      sendPasswordResetEmail: vi.fn().mockRejectedValue(new Error('SMTP down')),
      sendVerificationEmail: vi.fn().mockRejectedValue(new Error('SMTP down')),
    };
    const service = Object.create(AuthService.prototype);
    service.userRepository = repo;
    service.mailService = mailService;
    return { service, user, mailService };
  }

  it('forgotPassword: code is stored and emailed but absent from every log line', async () => {
    const lines = captureLogs();
    const { service, user, mailService } = authWithFailingMail();
    await expect(service.forgotPassword('ada@example.com')).resolves.toMatchObject({ message: expect.any(String) });
    const code = user.verificationOtp;
    expect(code).toMatch(/^\d{6}$/);
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith('ada@example.com', 'Ada', code);
    expect(lines.length).toBeGreaterThan(0); // the delivery failure is still reported
    expect(lines.join('\n')).not.toContain(code);
  });

  it('resendVerification: code absent from every log line', async () => {
    const lines = captureLogs();
    const { service, user } = authWithFailingMail();
    await service.resendVerification('ada@example.com');
    expect(lines.join('\n')).not.toContain(user.verificationOtp);
  });

  it('MailService failures log neither the code nor the tokenized link', async () => {
    const lines = captureLogs();
    const config = { get: vi.fn((_k: string) => undefined) };
    const mail = Object.create(MailService.prototype);
    mail.configService = config;
    mail.logger = new Logger('MailService');
    mail.transporter = { sendMail: vi.fn().mockRejectedValue(new Error('SMTP down')) };
    const code = '481516';

    await expect(mail.sendPasswordResetEmail('ada@example.com', 'Ada', code)).rejects.toThrow();
    await expect(mail.sendVerificationEmail('ada@example.com', 'Ada', code)).rejects.toThrow();
    await expect(mail.sendTwoFactorAuthEmail('ada@example.com', 'Ada', code)).rejects.toThrow();
    await expect(mail.sendEmailChangeRequestEmail('ada@example.com', 'Ada', 'new@example.com', code)).rejects.toThrow();

    const output = lines.join('\n');
    expect(lines.length).toBeGreaterThan(0);
    expect(output).not.toContain(code);
    expect(output).not.toContain('token=');
  });
});

import { InternalServerErrorException, Logger } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { MailDeliveryError, type MailTransport, type OutgoingMail } from './mail-transport.js';

function fakeTransport(fail?: string) {
  const sent: OutgoingMail[] = [];
  const transport: MailTransport = {
    provider: 'resend',
    send: vi.fn(async (mail: OutgoingMail) => {
      if (fail) throw new MailDeliveryError(fail);
      sent.push(mail);
    }),
  };
  return { transport, sent };
}

const config = (values: Record<string, string> = {}) => ({ get: (k: string) => values[k] }) as never;
const EMAIL = 'ada+test@example.test';
const CODE = '482913';

describe('MailService', () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    vi.spyOn(Logger.prototype, 'log').mockImplementation((m: unknown) => void logs.push(String(m)));
    vi.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => void logs.push(String(m)));
  });
  afterEach(() => vi.restoreAllMocks());

  it('verification email: code in the body, link to the real frontend route with the email (never the code)', async () => {
    const { transport, sent } = fakeTransport();
    await new MailService(config({ FRONTEND_URL: 'https://app.example.test/' }), transport).sendVerificationEmail(EMAIL, 'Ada', CODE);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].subject).toBe('Verify Your Email Address - GleamLearn');
    expect(sent[0].html).toContain(CODE);
    expect(sent[0].html).toContain('https://app.example.test/auth/verify-email?email=ada%2Btest%40example.test');
    expect(sent[0].html).not.toMatch(/token=|code=/);
    expect(sent[0].html).not.toContain('https://app.example.test/verify-email');
  });

  it('password reset email links to /auth/reset-password with the email', async () => {
    const { transport, sent } = fakeTransport();
    await new MailService(config(), transport).sendPasswordResetEmail(EMAIL, 'Ada', CODE);
    expect(sent[0].html).toContain(CODE);
    expect(sent[0].html).toContain('https://gleamlearn.vercel.app/auth/reset-password?email=ada%2Btest%40example.test');
  });

  it('reset confirmation links to /auth/login; login alert keeps the support mailto', async () => {
    const { transport, sent } = fakeTransport();
    const service = new MailService(config({ FRONTEND_URL: 'https://app.example.test' }), transport);
    await service.sendPasswordResetSuccessEmail(EMAIL, 'Ada');
    await service.sendLoginWelcomeEmail(EMAIL, 'Ada');
    expect(sent[0].html).toContain('https://app.example.test/auth/login');
    expect(sent[1].html).not.toMatch(/mailto:https?:/);
    expect(sent[1].html).toMatch(/mailto:[^"@]+@[^"]+"/);
  });

  it.each([
    ['sendVerificationEmail', [EMAIL, 'Ada', CODE]],
    ['sendPasswordResetEmail', [EMAIL, 'Ada', CODE]],
    ['sendTwoFactorAuthEmail', [EMAIL, 'Ada', CODE]],
    ['sendEmailChangeRequestEmail', [EMAIL, 'Ada', 'new@example.test', CODE]],
  ] as const)('%s rethrows a generic 500 when the provider fails (AuthService reports "failed")', async (method, args) => {
    const { transport } = fakeTransport('resend:validation_error');
    const service = new MailService(config(), transport);
    await expect((service[method] as (...a: string[]) => Promise<void>)(...args)).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it.each(['sendLoginWelcomeEmail', 'sendPasswordResetSuccessEmail', 'sendPasswordChangedEmail'] as const)(
    '%s never throws (notification)',
    async (method) => {
      const { transport } = fakeTransport('smtp:ETIMEDOUT');
      await expect(new MailService(config(), transport)[method](EMAIL, 'Ada')).resolves.toBeUndefined();
    },
  );

  it('logs never contain the recipient or the code, only the kind and the provider error code', async () => {
    const ok = new MailService(config(), fakeTransport().transport);
    const bad = new MailService(config(), fakeTransport('resend:invalid_from_address').transport);
    await ok.sendVerificationEmail(EMAIL, 'Ada', CODE);
    await bad.sendVerificationEmail(EMAIL, 'Ada', CODE).catch(() => undefined);
    expect(logs.join('\n')).not.toContain('example.test');
    expect(logs.join('\n')).not.toContain(CODE);
    expect(logs).toContain('Verification email failed (resend:invalid_from_address).');
  });
});

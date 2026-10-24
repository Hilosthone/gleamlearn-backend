import { Logger } from '@nestjs/common';
import { createMailTransport, RESEND_TESTING_SENDER } from './mail-transport.factory.js';
import { MailDeliveryError } from './mail-transport.js';
import { ResendTransport } from './transports/resend.transport.js';
import { SmtpTransport } from './transports/smtp.transport.js';

const SECRET = 're_unit_test_key_never_logged';

describe('createMailTransport', () => {
  let logs: string[];
  let logger: Logger;
  beforeEach(() => {
    logs = [];
    logger = new Logger('test');
    for (const level of ['log', 'warn', 'error'] as const) vi.spyOn(logger, level).mockImplementation((m: unknown) => void logs.push(String(m)));
  });

  const make = (env: Record<string, string>) => createMailTransport((k) => env[k], logger);

  it('prefers Resend when RESEND_API_KEY is set, with the testing sender by default', () => {
    const t = make({ RESEND_API_KEY: SECRET, SMTP_HOST: 'smtp.example.test' });
    expect(t).toBeInstanceOf(ResendTransport);
    expect(t.provider).toBe('resend');
    expect((t as unknown as { from: string }).from).toBe(RESEND_TESTING_SENDER);
    expect(logs.join(' ')).toContain('testing sender');
  });

  it('uses RESEND_FROM for a verified domain (no code change needed)', () => {
    const t = make({ RESEND_API_KEY: SECRET, RESEND_FROM: 'GleamLearn <no-reply@mail.example.test>' });
    expect((t as unknown as { from: string }).from).toBe('GleamLearn <no-reply@mail.example.test>');
    expect(logs.join(' ')).toContain('sender domain mail.example.test');
    expect(logs.join(' ')).not.toContain('testing sender');
  });

  it('MAIL_PROVIDER=smtp wins over a Resend key (local SMTP sink)', () => {
    expect(make({ MAIL_PROVIDER: 'smtp', RESEND_API_KEY: SECRET, SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525' })).toBeInstanceOf(SmtpTransport);
  });

  it('falls back to SMTP when only SMTP_HOST is set', () => {
    expect(make({ SMTP_HOST: 'smtp.example.test' }).provider).toBe('smtp');
  });

  it('with nothing configured, sends fail honestly instead of pretending', async () => {
    const t = make({});
    expect(t.provider).toBe('disabled');
    await expect(t.send({ to: 'a@example.test', subject: 's', html: 'h' })).rejects.toBeInstanceOf(MailDeliveryError);
  });

  it('MAIL_PROVIDER=resend without a key fails honestly', () => {
    expect(make({ MAIL_PROVIDER: 'resend', SMTP_HOST: 'smtp.example.test' }).provider).toBe('disabled');
  });

  it('never logs the API key, SMTP password or full sender address', () => {
    make({ RESEND_API_KEY: SECRET, RESEND_FROM: 'Team <hello@mail.example.test>' });
    make({ MAIL_PROVIDER: 'smtp', SMTP_HOST: 'h', SMTP_PASS: 'smtp-secret', MAIL_FROM: 'x <me@example.test>' });
    const all = logs.join('\n');
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain('smtp-secret');
    expect(all).not.toContain('hello@');
    expect(all).not.toContain('me@');
  });
});

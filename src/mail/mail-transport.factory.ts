// src/mail/mail-transport.factory.ts
import { Logger } from '@nestjs/common';
import { MailDeliveryError, type MailProviderName, type MailTransport } from './mail-transport.js';
import { ResendTransport } from './transports/resend.transport.js';
import { SmtpTransport } from './transports/smtp.transport.js';

/** Resend's documented testing sender: works without a verified domain, but only delivers to the account owner. */
export const RESEND_TESTING_SENDER = 'GleamLearn <onboarding@resend.dev>';
const DEFAULT_SMTP_SENDER = '"GleamLearn Support" <no-reply@gleamlearn.com>';

type Get = (name: string) => string | undefined;

/** Used when no provider is configured: every send fails honestly (the UI then reports "failed", not "sent"). */
class DisabledTransport implements MailTransport {
  readonly provider = 'disabled' as const;
  async send(): Promise<void> {
    throw new MailDeliveryError('disabled:no_provider_configured');
  }
}

/**
 * Chooses the provider:
 *   MAIL_PROVIDER=resend|smtp   explicit choice
 *   otherwise                   Resend when RESEND_API_KEY is set, else SMTP when SMTP_HOST is set, else disabled.
 * Senders: RESEND_FROM for Resend (defaults to the testing sender), MAIL_FROM for SMTP.
 * Logs the choice once at startup (provider, whether the key is present, sender domain) — never secrets or values.
 */
export function createMailTransport(get: Get, logger = new Logger('Mail')): MailTransport {
  const read = (name: string) => (get(name) ?? '').trim();
  const requested = read('MAIL_PROVIDER').toLowerCase();
  const resendKey = read('RESEND_API_KEY');
  const smtpHost = read('SMTP_HOST');

  let provider: MailProviderName;
  if (requested === 'resend' || requested === 'smtp') provider = requested;
  else {
    if (requested) logger.warn(`Unknown MAIL_PROVIDER "${requested}"; choosing automatically.`);
    provider = resendKey ? 'resend' : smtpHost ? 'smtp' : 'disabled';
  }

  if (provider === 'resend') {
    if (!resendKey) {
      logger.error('Mail provider: resend requested but RESEND_API_KEY is missing; emails will fail.');
      return new DisabledTransport();
    }
    const from = read('RESEND_FROM') || RESEND_TESTING_SENDER;
    const testing = from === RESEND_TESTING_SENDER || /@resend\.dev>?$/i.test(from);
    logger.log(
      `Mail provider: resend (API key present; sender domain ${senderDomain(from)}${testing ? ' — testing sender: delivers only to the Resend account owner' : ''}).`,
    );
    return new ResendTransport(resendKey, from);
  }

  if (provider === 'smtp') {
    if (!smtpHost) {
      logger.error('Mail provider: smtp requested but SMTP_HOST is missing; emails will fail.');
      return new DisabledTransport();
    }
    const from = read('MAIL_FROM') || DEFAULT_SMTP_SENDER;
    logger.log(`Mail provider: smtp (host configured; sender domain ${senderDomain(from)}).`);
    return new SmtpTransport({
      host: smtpHost,
      port: Number(read('SMTP_PORT')) || 587,
      user: read('SMTP_USER') || undefined,
      pass: read('SMTP_PASS') || undefined,
      from,
    });
  }

  logger.error('Mail provider: none (set RESEND_API_KEY, or SMTP_HOST for local SMTP); emails will fail.');
  return new DisabledTransport();
}

function senderDomain(from: string): string {
  return from.match(/@([^>\s"']+)/)?.[1] ?? 'unknown';
}

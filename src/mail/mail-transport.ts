// src/mail/mail-transport.ts
/**
 * The only thing MailService needs from an email provider: send one message or fail.
 * AuthService → MailService (templates, links, subjects) → MailTransport (Resend or SMTP).
 * Switching providers (or verifying a sending domain) never touches authentication code.
 */
export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
}

export type MailProviderName = 'resend' | 'smtp' | 'disabled';

export interface MailTransport {
  readonly provider: MailProviderName;
  /** Resolves once the provider accepted the message; rejects with MailDeliveryError otherwise. */
  send(mail: OutgoingMail): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/**
 * A provider refusal or failure. `reason` is a short provider code (e.g. `resend:validation_error`,
 * `smtp:ETIMEDOUT`) that is safe to log: it never contains the recipient, the message or credentials.
 */
export class MailDeliveryError extends Error {
  constructor(readonly reason: string) {
    super(`Email delivery failed (${reason})`);
    this.name = 'MailDeliveryError';
  }
}

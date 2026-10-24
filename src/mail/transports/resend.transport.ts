// src/mail/transports/resend.transport.ts
import { Resend } from 'resend';
import { MailDeliveryError, type MailTransport, type OutgoingMail } from '../mail-transport.js';

/** The subset of the Resend SDK this transport uses (injectable for tests, so tests never call the API). */
export interface ResendEmailsClient {
  emails: {
    send(payload: { from: string; to: string; subject: string; html: string }): Promise<{
      data: { id: string } | null;
      error: { name: string; statusCode: number | null } | null;
    }>;
  };
}

/**
 * Sends through the official Resend SDK. The SDK reports API refusals as `{ error }` instead of throwing,
 * so both paths are turned into MailDeliveryError. Only the Resend error code is kept (never the message,
 * which can echo the recipient).
 */
export class ResendTransport implements MailTransport {
  readonly provider = 'resend' as const;
  private readonly client: ResendEmailsClient;

  constructor(
    apiKey: string,
    private readonly from: string,
    client?: ResendEmailsClient,
  ) {
    this.client = client ?? (new Resend(apiKey) as unknown as ResendEmailsClient);
  }

  async send(mail: OutgoingMail): Promise<void> {
    let result: Awaited<ReturnType<ResendEmailsClient['emails']['send']>>;
    try {
      result = await this.client.emails.send({ from: this.from, to: mail.to, subject: mail.subject, html: mail.html });
    } catch (err) {
      throw new MailDeliveryError(`resend:${(err as { name?: string })?.name ?? 'network_error'}`);
    }
    if (result.error || !result.data) {
      throw new MailDeliveryError(`resend:${result.error?.name ?? 'unknown_error'}`);
    }
  }
}

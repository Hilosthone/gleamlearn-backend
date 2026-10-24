// src/mail/transports/smtp.transport.ts
import * as nodemailer from 'nodemailer';
import { MailDeliveryError, type MailTransport, type OutgoingMail } from '../mail-transport.js';

export interface SmtpSettings {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

/**
 * Nodemailer over SMTP: kept for local development and the test/live SMTP sink. Same settings as before
 * the Resend migration (implicit TLS on 465, STARTTLS otherwise, bounded connection/greeting/socket waits).
 */
export class SmtpTransport implements MailTransport {
  readonly provider = 'smtp' as const;
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly settings: SmtpSettings) {
    this.transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465, // implicit TLS on 465; STARTTLS on 587
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
    });
  }

  async send(mail: OutgoingMail): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.settings.from, to: mail.to, subject: mail.subject, html: mail.html });
    } catch (err) {
      const code = (err as { code?: string; responseCode?: number })?.code ?? (err as { responseCode?: number })?.responseCode;
      throw new MailDeliveryError(`smtp:${code ?? 'error'}`);
    }
  }
}

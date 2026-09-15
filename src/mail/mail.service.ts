// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app'}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"GleamLearn Support" <${this.configService.get<string>('MAIL_FROM') || 'no-reply@gleamlearn.com'}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to GleamLearn!</h2>
          <p>Please click the button below to verify your email address and activate your account:</p>
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
          <p>Or paste this link into your browser: <br/><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new InternalServerErrorException('Could not send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app'}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"GleamLearn Support" <${this.configService.get<string>('MAIL_FROM') || 'no-reply@gleamlearn.com'}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the button below to choose a new password:</p>
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>Or paste this link into your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link expires shortly. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new InternalServerErrorException('Could not send password reset email');
    }
  }
}
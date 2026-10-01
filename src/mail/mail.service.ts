// // src/mail/mail.service.ts
// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';

// @Injectable()
// export class MailService {
//   private transporter: nodemailer.Transporter;

//   constructor(private configService: ConfigService) {
//     this.transporter = nodemailer.createTransport({
//       host: this.configService.get<string>('SMTP_HOST'),
//       port: this.configService.get<number>('SMTP_PORT'),
//       secure: this.configService.get<number>('SMTP_PORT') === 465, // true for 465, false for other ports
//       auth: {
//         user: this.configService.get<string>('SMTP_USER'),
//         pass: this.configService.get<string>('SMTP_PASS'),
//       },
//     });
//   }

//   async sendVerificationEmail(email: string, token: string) {
//     const verificationUrl = `${this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app'}/verify-email?token=${token}`;

//     const mailOptions = {
//       from: `"GleamLearn Support" <${this.configService.get<string>('MAIL_FROM') || 'no-reply@gleamlearn.com'}>`,
//       to: email,
//       subject: 'Verify Your Email Address',
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px;">
//           <h2>Welcome to GleamLearn!</h2>
//           <p>Please click the button below to verify your email address and activate your account:</p>
//           <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
//           <p>Or paste this link into your browser: <br/><a href="${verificationUrl}">${verificationUrl}</a></p>
//           <p>If you didn't request this, please ignore this email.</p>
//         </div>
//       `,
//     };

//     try {
//       await this.transporter.sendMail(mailOptions);
//     } catch (error) {
//       console.error('Failed to send verification email:', error);
//       throw new InternalServerErrorException('Could not send verification email');
//     }
//   }

//   async sendPasswordResetEmail(email: string, token: string) {
//     const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app'}/reset-password?token=${token}`;

//     const mailOptions = {
//       from: `"GleamLearn Support" <${this.configService.get<string>('MAIL_FROM') || 'no-reply@gleamlearn.com'}>`,
//       to: email,
//       subject: 'Password Reset Request',
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px;">
//           <h2>Password Reset</h2>
//           <p>You requested a password reset. Click the button below to choose a new password:</p>
//           <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
//           <p>Or paste this link into your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p>
//           <p>This link expires shortly. If you didn't request this, you can safely ignore this email.</p>
//         </div>
//       `,
//     };

//     try {
//       await this.transporter.sendMail(mailOptions);
//     } catch (error) {
//       console.error('Failed to send password reset email:', error);
//       throw new InternalServerErrorException('Could not send password reset email');
//     }
//   }
// }


// // src/mail/mail.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { Resend } from 'resend';
// import { 
//   getVerificationEmailTemplate, 
//   getPasswordResetEmailTemplate 
// } from './templates/email.templates.js';

// @Injectable()
// export class MailService {
//   private resend: Resend;
//   private readonly logger = new Logger(MailService.name);

//   constructor(private configService: ConfigService) {
//     const apiKey = this.configService.get<string>('RESEND_API_KEY');
//     this.resend = new Resend(apiKey);
//   }

//   /**
//    * Sends an account verification email to newly registered users.
//    * @param email - Recipient email address
//    * @param token - Secure JWT verification token
//    */
//   async sendVerificationEmail(email: string, token: string): Promise<void> {
//     const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app';
//     const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
//     const sender = this.configService.get<string>('MAIL_FROM') || 'GleamLearn <onboarding@resend.dev>';

//     try {
//       const { error } = await this.resend.emails.send({
//         from: sender,
//         to: [email],
//         subject: 'Verify Your Email Address',
//         html: getVerificationEmailTemplate(verificationUrl),
//       });

//       if (error) {
//         throw new Error(error.message);
//       }

//       this.logger.log(`Verification email successfully sent to ${email}`);
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : String(err);
//       this.logger.error(`Failed to send verification email via Resend: ${errorMessage}`);
      
//       // Smart fallback: prints link directly to server logs so testing is never blocked
//       console.log('----------------------------------------------------');
//       console.log('🔗 MANUAL VERIFICATION LINK FOR TESTING:');
//       console.log(verificationUrl);
//       console.log('----------------------------------------------------');
//     }
//   }

//   /**
//    * Sends a password reset email when requested by a user.
//    * @param email - Recipient email address
//    * @param token - Secure password reset token
//    */
//   async sendPasswordResetEmail(email: string, token: string): Promise<void> {
//     const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app';
//     const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
//     const sender = this.configService.get<string>('MAIL_FROM') || 'GleamLearn <onboarding@resend.dev>';

//     try {
//       const { error } = await this.resend.emails.send({
//         from: sender,
//         to: [email],
//         subject: 'Password Reset Request',
//         html: getPasswordResetEmailTemplate(resetUrl),
//       });

//       if (error) {
//         throw new Error(error.message);
//       }

//       this.logger.log(`Password reset email successfully sent to ${email}`);
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : String(err);
//       this.logger.error(`Failed to send password reset email via Resend: ${errorMessage}`);
      
//       // Smart fallback: prints reset link directly to server logs
//       console.log('----------------------------------------------------');
//       console.log('🔗 MANUAL PASSWORD RESET LINK FOR TESTING:');
//       console.log(resetUrl);
//       console.log('----------------------------------------------------');
//     }
//   }
// }


// src/mail/mail.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getVerificationEmailTemplate } from './templates/verification.template.js';
import { getPasswordResetEmailTemplate } from './templates/reset-password.template.js';
import { getLoginWelcomeEmailTemplate } from './templates/login-welcome.template.js';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465, // true for 465, false for other ports (like 587)
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Sends an account verification email to newly registered users with a 6-digit OTP.
   * @param email - Recipient email address
   * @param fullName - Recipient full name for personalization
   * @param token - Secure 6-digit OTP token generated by AuthService
   */
  async sendVerificationEmail(email: string, fullName: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const sender = this.configService.get<string>('MAIL_FROM') || '"GleamLearn Support" <no-reply@gleamlearn.com>';

    // Use the passed token directly as the OTP code so it matches the database!
    const otpCode = token;

    const mailOptions = {
      from: sender,
      to: email,
      subject: 'Verify Your Email Address - GleamLearn',
      html: getVerificationEmailTemplate(fullName, verificationUrl, otpCode),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email with OTP successfully sent to ${email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send verification email via Nodemailer: ${errorMessage}`);
      
      // Fallback printout for development convenience if SMTP fails
      console.log('----------------------------------------------------');
      console.log('🔗 MANUAL VERIFICATION LINK FOR TESTING:');
      console.log(verificationUrl);
      console.log('🔑 GENERATED OTP CODE:', otpCode);
      console.log('----------------------------------------------------');
      
      throw new InternalServerErrorException('Could not send verification email');
    }
  }

  /**
   * Sends a password reset email when requested by a user with a 6-digit OTP.
   * @param email - Recipient email address
   * @param fullName - Recipient full name for personalization
   * @param token - Secure password reset OTP token generated by AuthService
   */
  async sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const sender = this.configService.get<string>('MAIL_FROM') || '"GleamLearn Support" <no-reply@gleamlearn.com>';

    // Use the passed token directly as the OTP code so it matches the database!
    const otpCode = token;

    const mailOptions = {
      from: sender,
      to: email,
      subject: 'Password Reset Request - GleamLearn',
      html: getPasswordResetEmailTemplate(fullName, resetUrl, otpCode),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email with OTP successfully sent to ${email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send password reset email via Nodemailer: ${errorMessage}`);
      
      // Fallback printout for development convenience if SMTP fails
      console.log('----------------------------------------------------');
      console.log('🔗 MANUAL PASSWORD RESET LINK FOR TESTING:');
      console.log(resetUrl);
      console.log('🔑 GENERATED OTP CODE:', otpCode);
      console.log('----------------------------------------------------');
      
      throw new InternalServerErrorException('Could not send password reset email');
    }
  }

  /**
   * Sends a welcome/login alert email upon a user successfully logging in.
   * @param email - Recipient email address
   * @param fullName - Recipient full name for personalization
   */
  async sendLoginWelcomeEmail(email: string, fullName: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://gleamlearn.vercel.app';
    const dashboardUrl = `${frontendUrl}/dashboard`;
    const sender = this.configService.get<string>('MAIL_FROM') || '"GleamLearn Support" <no-reply@gleamlearn.com>';

    const mailOptions = {
      from: sender,
      to: email,
      subject: 'New Login Alert - GleamLearn',
      html: getLoginWelcomeEmailTemplate(fullName, dashboardUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Login welcome email successfully sent to ${email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send login welcome email via Nodemailer: ${errorMessage}`);
      
      // Fallback printout for development convenience if SMTP fails
      console.log('----------------------------------------------------');
      console.log('🔗 DASHBOARD LINK:', dashboardUrl);
      console.log('----------------------------------------------------');
    }
  }
}
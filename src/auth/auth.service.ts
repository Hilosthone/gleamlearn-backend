
// // src/auth/auth.service.ts
// import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './entities/user.entity.js'; 
// import { JwtService } from '@nestjs/jwt';
// import { MailService } from '../mail/mail.service.js'; 
// import { NotificationsService } from '../notifications/notifications.service.js';
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>,
//     private readonly jwtService: JwtService,
//     private readonly mailService: MailService,
//     private readonly notificationsService: NotificationsService,
//   ) {}

//   async signup(signupDto: Record<string, any>) {
//     const { email, username, password, confirmPassword, ...onboardingData } = signupDto;

//     if (password !== confirmPassword) {
//       throw new ConflictException('Passwords do not match');
//     }

//     const existingUser = await this.userRepository.findOne({
//       where: [{ email }, { username }],
//     });

//     if (existingUser) {
//       throw new ConflictException('Email or username is already registered');
//     }

//     const saltRounds = 10;
//     const passwordHash = await bcrypt.hash(password, saltRounds);

//     // Generate a secure 6-digit OTP code and set expiry to 10 minutes from now
//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

//     const newUser = this.userRepository.create({
//       email,
//       username,
//       passwordHash,
//       fullName: onboardingData.fullName,
//       dateOfBirth: onboardingData.dateOfBirth,
//       country: onboardingData.country,
//       educationType: onboardingData.educationType,
//       secondarySchool: onboardingData.secondarySchool,
//       secondaryClass: onboardingData.secondaryClass,
//       secondaryStream: onboardingData.secondaryStream,
//       university: onboardingData.university,
//       faculty: onboardingData.faculty,
//       department: onboardingData.department,
//       courseOfStudy: onboardingData.courseOfStudy,
//       level: onboardingData.level,
//       examAimOrGoals: onboardingData.examAimOrGoals,
//       preferredStudyTime: onboardingData.preferredStudyTime,
//       verificationOtp: otpCode,
//       otpExpiresAt,
//       isEmailVerified: false,
//     });

//     const savedUser = await this.userRepository.save(newUser);
//     const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = savedUser;

//     // Generate login token
//     const payload = { sub: savedUser.id, email: savedUser.email, username: savedUser.username };
//     const accessToken = this.jwtService.sign(payload);

//     // Send verification email with 6-digit OTP (passing fullName and otpCode correctly)
//     try {
//       await this.mailService.sendVerificationEmail(savedUser.email, savedUser.fullName, otpCode);
//     } catch (mailError) {
//       console.warn('⚠️ SMTP/Mail warning: Could not send email via SMTP transporter.');
//       console.log('----------------------------------------------------');
//       console.log('🔑 MANUAL VERIFICATION OTP CODE FOR TESTING:');
//       console.log(otpCode);
//       console.log('----------------------------------------------------');
//     }

//     // Trigger dual-layer welcome notification safely
//     try {
//       await this.notificationsService.createAndPushNotification(
//         savedUser.id,
//         'Welcome to GleamLearn! 🚀',
//         'Your account has been created successfully. Explore your dashboard to get started with your learning journey.',
//         'account'
//       );
//     } catch (notifError) {
//       console.error('🟡 NOTIFICATION ERROR DURING SIGNUP:', notifError);
//     }

//     return {
//       message: 'Account created successfully. Please check your email for the 6-digit verification code.',
//       accessToken,
//       data: result,
//     };
//   }

//   async login(loginDto: Record<string, any>) {
//     const { email, password } = loginDto;

//     const user = await this.userRepository.findOne({ where: { email } });
//     if (!user) {
//       throw new UnauthorizedException('Invalid email or password');
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
//     if (!isPasswordValid) {
//       throw new UnauthorizedException('Invalid email or password');
//     }

//     // Send login welcome/alert email asynchronously (fails gracefully if SMTP is down)
//     try {
//       await this.mailService.sendLoginWelcomeEmail(user.email, user.fullName);
//     } catch (mailError) {
//       console.warn('⚠️ Could not send login welcome email via SMTP transporter.');
//     }

//     const payload = { sub: user.id, email: user.email, username: user.username };
//     const accessToken = this.jwtService.sign(payload);

//     const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = user;

//     return {
//       message: 'Successfully logged in',
//       accessToken,
//       data: result,
//     };
//   }

//   async getMe(userId: string) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new NotFoundException('User profile not found');
//     }
//     const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = user;
//     return { data: result };
//   }

//   async updateMe(userId: string, updateDto: Record<string, any>) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new NotFoundException('User profile not found');
//     }

//     Object.assign(user, updateDto);
//     const updatedUser = await this.userRepository.save(user);
//     const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = updatedUser;

//     return {
//       message: 'Profile updated successfully',
//       data: result,
//     };
//   }

//   async changePassword(userId: string, body: Record<string, any>) {
//     const { oldPassword, newPassword, confirmNewPassword } = body;

//     if (newPassword !== confirmNewPassword) {
//       throw new BadRequestException('New passwords do not match');
//     }

//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
//     if (!isMatch) {
//       throw new UnauthorizedException('Incorrect old password');
//     }

//     user.passwordHash = await bcrypt.hash(newPassword, 10);
//     await this.userRepository.save(user);

//     return { message: 'Password changed successfully' };
//   }

//   logout() {
//     return { message: 'Successfully logged out' };
//   }

//   refreshToken(refreshToken: string) {
//     return { message: 'Token refreshed successfully', accessToken: 'new-mock-jwt-token' };
//   }

//   async verifyEmail(token: string) {
//     // Look up user by the 6-digit OTP code sent in the body
//     const user = await this.userRepository.findOne({ where: { verificationOtp: token } });

//     if (!user) {
//       throw new BadRequestException('Invalid or expired verification code');
//     }

//     // Check if the OTP has expired
//     if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
//       throw new BadRequestException('Verification code has expired. Please request a new one.');
//     }

//     user.isEmailVerified = true;
//     user.verificationOtp = null;
//     user.otpExpiresAt = null;
//     await this.userRepository.save(user);

//     return { message: 'Email verified successfully! You can now log in.' };
//   }

//   async resendVerification(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     if (user.isEmailVerified) {
//       throw new BadRequestException('Email is already verified');
//     }

//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     user.verificationOtp = otpCode;
//     user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
//     await this.userRepository.save(user);

//     try {
//       await this.mailService.sendVerificationEmail(user.email, user.fullName, otpCode);
//     } catch (err) {
//       console.log('----------------------------------------------------');
//       console.log(`🔑 RESEND VERIFICATION OTP CODE FOR ${email}:`, otpCode);
//       console.log('----------------------------------------------------');
//     }

//     return { message: `New verification code resent to ${email}` };
//   }

//   async forgotPassword(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
    
//     if (user) {
//       const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//       user.verificationOtp = otpCode;
//       user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
//       await this.userRepository.save(user);

//       try {
//         await this.mailService.sendPasswordResetEmail(user.email, user.fullName, otpCode);
//       } catch (err) {
//         console.log('----------------------------------------------------');
//         console.log(`🔑 PASSWORD RESET OTP CODE FOR ${email}:`, otpCode);
//         console.log('----------------------------------------------------');
//       }
//     }

//     return { message: `Password reset instructions sent to ${email}` };
//   }

//   async resetPassword(body: Record<string, any>) {
//     const { token, newPassword, confirmNewPassword } = body;

//     if (newPassword !== confirmNewPassword) {
//       throw new BadRequestException('New passwords do not match');
//     }

//     // Find user by the 6-digit OTP code stored in verificationOtp
//     const user = await this.userRepository.findOne({ where: { verificationOtp: token } });

//     if (!user || (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt))) {
//       throw new BadRequestException('Invalid or expired password reset code');
//     }

//     user.passwordHash = await bcrypt.hash(newPassword, 10);
//     user.verificationOtp = null;
//     user.otpExpiresAt = null;
//     await this.userRepository.save(user);

//     return { message: 'Password has been reset successfully' };
//   }
// }


// src/auth/auth.service.ts
import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js'; 
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service.js'; 
import { NotificationsService } from '../notifications/notifications.service.js';
import * as bcrypt from 'bcrypt';
import { generateOtp } from '../common/security/otp.js';
import { LEARNER_TOKEN_TYPE } from '../admin/auth/admin-jwt.config.js';
import { AccountStatusService } from './account-status.service.js';
import { buildBasicProfileUpdate } from '../common/utils/profile-update.util.js';
import { CodeFailureTracker, codeRequiresEmail, codesMatch } from './one-time-code.js';
import { findUserByEmail, normalizeEmail } from './email-identity.js';
import { requireLearnerJwtSecret } from './learner-jwt.config.js';

/** Delivery state of an email the learner is waiting for (see AuthService.sendWithinBudget). */
export type EmailDelivery = 'sent' | 'pending' | 'failed';

const SIGNUP_MESSAGES: Record<EmailDelivery, string> = {
  sent: 'Account created. We sent a 6-digit verification code to your email.',
  pending: 'Account created. Your verification code is on its way; if it has not arrived in a few minutes, request a new one.',
  failed: 'Account created, but we could not send the verification email right now. Please request a new code shortly.',
};
const RESEND_MESSAGES: Record<EmailDelivery, string> = {
  sent: 'A new verification code has been sent to your email.',
  pending: 'A new verification code is on its way; if it has not arrived in a few minutes, try again.',
  failed: 'We could not send the verification email right now. Please try again shortly.',
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly accountStatus: AccountStatusService,
  ) {}

  private readonly codeFailures = new CodeFailureTracker();

  /**
   * Sends an email without delaying the HTTP response. Sign-up, login and password flows used to await SMTP;
   * with an unreachable or blocked SMTP server (and no transport timeouts) those requests hung for minutes,
   * which the UI showed as an endless spinner. Failures are logged without recipients or codes.
   */
  /**
   * For emails the learner is waiting for (verification codes): waits at most `budgetMs`, then reports what
   * happened so the UI can say so — 'sent', 'failed' (the SMTP server refused or errored), or 'pending'
   * (still trying; it keeps going in the background). The HTTP response is never held longer than the budget.
   */
  private async sendWithinBudget(label: string, send: () => Promise<unknown>, budgetMs = 3000): Promise<EmailDelivery> {
    const outcome = Promise.resolve()
      .then(send)
      .then(
        () => 'sent' as const,
        () => {
          console.warn(`⚠️ Mail: the ${label} could not be delivered.`);
          return 'failed' as const;
        },
      );
    let timer: NodeJS.Timeout | undefined;
    const budget = new Promise<'pending'>((resolve) => {
      timer = setTimeout(() => resolve('pending'), budgetMs);
    });
    try {
      return await Promise.race([outcome, budget]);
    } finally {
      clearTimeout(timer);
    }
  }

  private sendMailInBackground(label: string, send: () => Promise<unknown>): void {
    void Promise.resolve()
      .then(send)
      .catch(() => console.warn(`⚠️ Mail: the ${label} could not be delivered.`));
  }

  /**
   * Finds the account a verification / reset code belongs to. The request must name the account (`email`);
   * the code is compared in constant time and cleared after too many wrong attempts (see one-time-code.ts).
   * Every failure returns the same message, so it does not reveal whether the email exists.
   */
  private async findUserForCode(email: unknown, code: unknown, invalidMessage: string): Promise<User> {
    if (typeof code !== 'string' || !code.trim()) throw new BadRequestException(invalidMessage);
    if (typeof email !== 'string' || !email.trim()) {
      if (codeRequiresEmail()) throw new BadRequestException('email is required');
      // Legacy mode (AUTH_CODE_REQUIRES_EMAIL=false): lookup by code alone, as before
      const legacy = await this.userRepository.findOne({ where: { verificationOtp: code.trim() } });
      if (!legacy) throw new BadRequestException(invalidMessage);
      return legacy;
    }
    const user = await findUserByEmail(this.userRepository, email);
    if (!user || !user.verificationOtp) throw new BadRequestException(invalidMessage);
    if (!codesMatch(user.verificationOtp, code)) {
      if (this.codeFailures.recordFailure(user.id)) {
        user.verificationOtp = null;
        user.otpExpiresAt = null;
        await this.userRepository.save(user);
        throw new BadRequestException('Too many incorrect codes. Please request a new code.');
      }
      throw new BadRequestException(invalidMessage);
    }
    this.codeFailures.reset(user.id);
    return user;
  }

  async signup(signupDto: Record<string, any>) {
    const { email: rawEmail, username, password, confirmPassword, ...onboardingData } = signupDto;
    const email = normalizeEmail(rawEmail);

    if (password !== confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    // Email uniqueness is case-insensitive (an existing account stored with capitals still counts)
    const existingUser =
      (await findUserByEmail(this.userRepository, email)) ?? (await this.userRepository.findOne({ where: { username } }));

    if (existingUser) {
      throw new ConflictException('Email or username is already registered');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a secure 6-digit OTP code and set expiry to 10 minutes from now
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = this.userRepository.create({
      email,
      username,
      passwordHash,
      fullName: onboardingData.fullName,
      dateOfBirth: onboardingData.dateOfBirth,
      country: onboardingData.country,
      educationType: onboardingData.educationType,
      secondarySchool: onboardingData.secondarySchool,
      secondaryClass: onboardingData.secondaryClass,
      secondaryStream: onboardingData.secondaryStream,
      university: onboardingData.university,
      faculty: onboardingData.faculty,
      department: onboardingData.department,
      courseOfStudy: onboardingData.courseOfStudy,
      level: onboardingData.level,
      examAimOrGoals: onboardingData.examAimOrGoals,
      preferredStudyTime: onboardingData.preferredStudyTime,
      verificationOtp: otpCode,
      otpExpiresAt,
      isEmailVerified: false,
    });

    const savedUser = await this.userRepository.save(newUser);
    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = savedUser;

    // Generate login token
    const payload = { sub: savedUser.id, email: savedUser.email, username: savedUser.username, type: LEARNER_TOKEN_TYPE };
    requireLearnerJwtSecret(); // 503 instead of signing with a missing secret
    const accessToken = this.jwtService.sign(payload);

    // Waits at most 3 s for the verification email, then reports the delivery state (see sendWithinBudget)
    const verificationEmail = await this.sendWithinBudget('verification email', () =>
      this.mailService.sendVerificationEmail(savedUser.email, savedUser.fullName, otpCode),
    );

    // Trigger dual-layer welcome notification safely
    try {
      await this.notificationsService.createAndPushNotification(
        savedUser.id,
        'Welcome to GleamLearn! 🚀',
        'Your account has been created successfully. Explore your dashboard to get started with your learning journey.',
        'account'
      );
    } catch (notifError) {
      console.error('🟡 NOTIFICATION ERROR DURING SIGNUP:', notifError);
    }

    return {
      message: SIGNUP_MESSAGES[verificationEmail],
      accessToken,
      verificationEmail, // 'sent' | 'pending' | 'failed' (additive): lets the UI tell the learner what happened
      data: result,
    };
  }

  async login(loginDto: Record<string, any>) {
    const { email, password } = loginDto;

    const user = await findUserByEmail(this.userRepository, email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Account status gate (no new session for deleted or restricted accounts). Frozen accounts may sign in
    // so they can unfreeze themselves; every other protected route rejects them (see JwtStrategy).
    const status = await this.accountStatus.getStatus(user.id);
    AccountStatusService.assertAllowed(status, { allowFrozen: true, unauthorizedMessage: 'Invalid email or password' });
    const accountStatus = AccountStatusService.stateOf(status);

    // Send login welcome/alert email asynchronously (fails gracefully if SMTP is down)
    // Not awaited: an unreachable or slow SMTP server must never hold the HTTP response (see sendMailInBackground)
    this.sendMailInBackground('login alert email', () => this.mailService.sendLoginWelcomeEmail(user.email, user.fullName));

    const payload = { sub: user.id, email: user.email, username: user.username, type: LEARNER_TOKEN_TYPE };
    requireLearnerJwtSecret(); // 503 instead of signing with a missing secret
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = user;

    return {
      message: 'Successfully logged in',
      accessToken,
      accountStatus, // 'active' | 'frozen' (additive)
      data: result,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = user;
    // accountStatus (additive): lets the client show the frozen-account screen; restricted/deleted never reach here
    const accountStatus = AccountStatusService.stateOf(await this.accountStatus.getStatus(userId));
    return { data: result, accountStatus };
  }

  async updateMe(userId: string, updateDto: Record<string, any>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // Explicit allowlist: protected fields (passwordHash, verification/OTP data, tokens, restriction flags) are never assignable here
    Object.assign(user, buildBasicProfileUpdate(updateDto, user.email));
    const updatedUser = await this.userRepository.save(user);
    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = updatedUser;

    return {
      message: 'Profile updated successfully',
      data: result,
    };
  }

  async changePassword(userId: string, body: Record<string, any>) {
    const { oldPassword, newPassword, confirmNewPassword } = body;

    // Enforced here as well as in ChangePasswordDto, so it still holds if request validation is switched off
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      throw new BadRequestException('oldPassword, newPassword and confirmNewPassword are required');
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect old password');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    // 🔔 Send security alert email for password changes initiated from settings
    // Not awaited: an unreachable or slow SMTP server must never hold the HTTP response (see sendMailInBackground)
    this.sendMailInBackground('password-changed email', () => this.mailService.sendPasswordChangedEmail(user.email, user.fullName));

    return { message: 'Password changed successfully' };
  }

  logout() {
    return { message: 'Successfully logged out' };
  }

  refreshToken(refreshToken: string) {
    return { message: 'Token refreshed successfully', accessToken: 'new-mock-jwt-token' };
  }

  async verifyEmail(body: { email?: string; token?: string }) {
    // The code must belong to the named account (constant-time compare, limited wrong attempts)
    const user = await this.findUserForCode(body?.email, body?.token, 'Invalid or expired verification code');

    // Check if the OTP has expired
    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    user.isEmailVerified = true;
    user.verificationOtp = null;
    user.otpExpiresAt = null;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully! You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await findUserByEmail(this.userRepository, email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otpCode = generateOtp();
    user.verificationOtp = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.userRepository.save(user);

    // Not awaited: an unreachable or slow SMTP server must never hold the HTTP response (see sendMailInBackground)
    const verificationEmail = await this.sendWithinBudget('verification email', () =>
      this.mailService.sendVerificationEmail(user.email, user.fullName, otpCode),
    );

    return { message: RESEND_MESSAGES[verificationEmail], verificationEmail };
  }

  async forgotPassword(email: string) {
    const user = await findUserByEmail(this.userRepository, email);
    
    if (user) {
      const otpCode = generateOtp();
      user.verificationOtp = otpCode;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await this.userRepository.save(user);

      // Not awaited: an unreachable or slow SMTP server must never hold the HTTP response (see sendMailInBackground)
      this.sendMailInBackground('password reset email', () => this.mailService.sendPasswordResetEmail(user.email, user.fullName, otpCode));
    }

    return { message: `Password reset instructions sent to ${email}` };
  }

  async resetPassword(body: Record<string, any>) {
    const { token, newPassword, confirmNewPassword } = body;

    // Enforced here as well as in ResetPasswordDto: the OTP lookup below must never run with a missing token
    if (
      typeof token !== 'string' || !token.trim() ||
      typeof newPassword !== 'string' || !newPassword ||
      typeof confirmNewPassword !== 'string' || !confirmNewPassword
    ) {
      throw new BadRequestException('token, newPassword and confirmNewPassword are required');
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // The code must belong to the named account (constant-time compare, limited wrong attempts)
    const user = await this.findUserForCode(body.email, token, 'Invalid or expired password reset code');

    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      throw new BadRequestException('Invalid or expired password reset code');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.verificationOtp = null;
    user.otpExpiresAt = null;
    await this.userRepository.save(user);

    // 🔔 Send success confirmation email for the password reset flow
    // Not awaited: an unreachable or slow SMTP server must never hold the HTTP response (see sendMailInBackground)
    this.sendMailInBackground('password-reset confirmation email', () => this.mailService.sendPasswordResetSuccessEmail(user.email, user.fullName));

    return { message: 'Password has been reset successfully!' };
  }
}
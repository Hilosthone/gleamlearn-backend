
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async signup(signupDto: Record<string, any>) {
    const { email, username, password, confirmPassword, ...onboardingData } = signupDto;

    if (password !== confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('Email or username is already registered');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a secure 6-digit OTP code and set expiry to 10 minutes from now
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
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
    const payload = { sub: savedUser.id, email: savedUser.email, username: savedUser.username };
    const accessToken = this.jwtService.sign(payload);

    // Send verification email with 6-digit OTP (passing fullName and otpCode correctly)
    try {
      await this.mailService.sendVerificationEmail(savedUser.email, savedUser.fullName, otpCode);
    } catch (mailError) {
      console.warn('⚠️ SMTP/Mail warning: Could not send email via SMTP transporter.');
      console.log('----------------------------------------------------');
      console.log('🔑 MANUAL VERIFICATION OTP CODE FOR TESTING:');
      console.log(otpCode);
      console.log('----------------------------------------------------');
    }

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
      message: 'Account created successfully. Please check your email for the 6-digit verification code.',
      accessToken,
      data: result,
    };
  }

  async login(loginDto: Record<string, any>) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Send login welcome/alert email asynchronously (fails gracefully if SMTP is down)
    try {
      await this.mailService.sendLoginWelcomeEmail(user.email, user.fullName);
    } catch (mailError) {
      console.warn('⚠️ Could not send login welcome email via SMTP transporter.');
    }

    const payload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = user;

    return {
      message: 'Successfully logged in',
      accessToken,
      data: result,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = user;
    return { data: result };
  }

  async updateMe(userId: string, updateDto: Record<string, any>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    Object.assign(user, updateDto);
    const updatedUser = await this.userRepository.save(user);
    const { passwordHash: _, verificationOtp: __, otpExpiresAt: ___, ...result } = updatedUser;

    return {
      message: 'Profile updated successfully',
      data: result,
    };
  }

  async changePassword(userId: string, body: Record<string, any>) {
    const { oldPassword, newPassword, confirmNewPassword } = body;

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
    try {
      await this.mailService.sendPasswordChangedEmail(user.email, user.fullName);
    } catch (mailError) {
      console.warn('⚠️ Could not send password changed notification email via SMTP.');
    }

    return { message: 'Password changed successfully' };
  }

  logout() {
    return { message: 'Successfully logged out' };
  }

  refreshToken(refreshToken: string) {
    return { message: 'Token refreshed successfully', accessToken: 'new-mock-jwt-token' };
  }

  async verifyEmail(token: string) {
    // Look up user by the 6-digit OTP code sent in the body
    const user = await this.userRepository.findOne({ where: { verificationOtp: token } });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification code');
    }

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
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationOtp = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.userRepository.save(user);

    try {
      await this.mailService.sendVerificationEmail(user.email, user.fullName, otpCode);
    } catch (err) {
      console.log('----------------------------------------------------');
      console.log(`🔑 RESEND VERIFICATION OTP CODE FOR ${email}:`, otpCode);
      console.log('----------------------------------------------------');
    }

    return { message: `New verification code resent to ${email}` };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (user) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationOtp = otpCode;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await this.userRepository.save(user);

      try {
        await this.mailService.sendPasswordResetEmail(user.email, user.fullName, otpCode);
      } catch (err) {
        console.log('----------------------------------------------------');
        console.log(`🔑 PASSWORD RESET OTP CODE FOR ${email}:`, otpCode);
        console.log('----------------------------------------------------');
      }
    }

    return { message: `Password reset instructions sent to ${email}` };
  }

  async resetPassword(body: Record<string, any>) {
    const { token, newPassword, confirmNewPassword } = body;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Find user by the 6-digit OTP code stored in verificationOtp
    const user = await this.userRepository.findOne({ where: { verificationOtp: token } });

    if (!user || (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt))) {
      throw new BadRequestException('Invalid or expired password reset code');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.verificationOtp = null;
    user.otpExpiresAt = null;
    await this.userRepository.save(user);

    // 🔔 Send success confirmation email for the password reset flow
    try {
      await this.mailService.sendPasswordResetSuccessEmail(user.email, user.fullName);
    } catch (mailError) {
      console.warn('⚠️ Could not send password reset success email via SMTP.');
    }

    return { message: 'Password has been reset successfully!' };
  }
}
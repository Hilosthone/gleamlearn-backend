// // src/auth/auth.service.ts
// import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './entities/user.entity.js'; 
// import { JwtService } from '@nestjs/jwt';
// import { MailService } from '../mail/mail.service.js'; 
// import { NotificationsService } from '../notifications/notifications.service.js'; // <-- 1. Import NotificationsService
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>,
//     private readonly jwtService: JwtService,
//     private readonly mailService: MailService,
//     private readonly notificationsService: NotificationsService, // <-- 2. Inject NotificationsService here
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
//     });

//     const savedUser = await this.userRepository.save(newUser);
//     const { passwordHash: _, ...result } = savedUser;

//     // Generate login token
//     const payload = { sub: savedUser.id, email: savedUser.email, username: savedUser.username };
//     const accessToken = this.jwtService.sign(payload);

//     // 3. Generate a secure verification token (expires in 1 day) and send the email
//     const verificationToken = this.jwtService.sign(
//       { email: savedUser.email }, 
//       { expiresIn: '1d' }
//     );
//     await this.mailService.sendVerificationEmail(savedUser.email, verificationToken);

//     // 4. Trigger dual-layer welcome notification (saves to DB inbox & fires FCM push)
//     await this.notificationsService.createAndPushNotification(
//       savedUser.id,
//       'Welcome to GleamLearn! 🚀',
//       'Your account has been created successfully. Explore your dashboard to get started with your learning journey.',
//       'account'
//     );

//     return {
//       message: 'Account created successfully. Please check your email to verify your account.',
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

//     const payload = { sub: user.id, email: user.email, username: user.username };
//     const accessToken = this.jwtService.sign(payload);

//     const { passwordHash: _, ...result } = user;

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
//     const { passwordHash: _, ...result } = user;
//     return { data: result };
//   }

//   async updateMe(userId: string, updateDto: Record<string, any>) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new NotFoundException('User profile not found');
//     }

//     Object.assign(user, updateDto);
//     const updatedUser = await this.userRepository.save(user);
//     const { passwordHash: _, ...result } = updatedUser;

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
//     try {
//       const payload = this.jwtService.verify(token);
//       const user = await this.userRepository.findOne({ where: { email: payload.email } });
      
//       if (!user) {
//         throw new NotFoundException('User not found');
//       }

//       return { message: 'Email verified successfully' };
//     } catch (error) {
//       throw new BadRequestException('Invalid or expired verification token');
//     }
//   }

//   async resendVerification(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
//     if (user) {
//       const verificationToken = this.jwtService.sign({ email }, { expiresIn: '1d' });
//       await this.mailService.sendVerificationEmail(email, verificationToken);
//     }
//     return { message: `Verification email resent to ${email}` };
//   }

//   async forgotPassword(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
    
//     if (user) {
//       const resetToken = this.jwtService.sign({ email: user.email }, { expiresIn: '15m' });
//       await this.mailService.sendPasswordResetEmail(user.email, resetToken);
//     }

//     return { message: `Password reset instructions sent to ${email}` };
//   }

//   async resetPassword(body: Record<string, any>) {
//     const { token, newPassword, confirmNewPassword } = body;

//     if (newPassword !== confirmNewPassword) {
//       throw new BadRequestException('New passwords do not match');
//     }

//     try {
//       const payload = this.jwtService.verify(token);
//       const user = await this.userRepository.findOne({ where: { email: payload.email } });

//       if (!user) {
//         throw new NotFoundException('User not found');
//       }

//       user.passwordHash = await bcrypt.hash(newPassword, 10);
//       await this.userRepository.save(user);

//       return { message: 'Password has been reset successfully' };
//     } catch (error) {
//       throw new BadRequestException('Invalid or expired password reset token');
//     }
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
    });

    const savedUser = await this.userRepository.save(newUser);
    const { passwordHash: _, ...result } = savedUser;

    // Generate login token
    const payload = { sub: savedUser.id, email: savedUser.email, username: savedUser.username };
    const accessToken = this.jwtService.sign(payload);

    // 3. Generate a secure verification token (expires in 1 day) and handle email safely with console fallback
    const verificationToken = this.jwtService.sign(
      { email: savedUser.email }, 
      { expiresIn: '1d' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://gleamlearn.vercel.app';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      await this.mailService.sendVerificationEmail(savedUser.email, verificationToken);
    } catch (mailError) {
      console.warn('⚠️ SMTP/Mail warning: Could not send email via SMTP transporter.');
      console.log('----------------------------------------------------');
      console.log('🔗 MANUAL VERIFICATION LINK FOR TESTING:');
      console.log(verificationUrl);
      console.log('----------------------------------------------------');
    }

    // 4. Trigger dual-layer welcome notification safely
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
      message: 'Account created successfully. Please check your email to verify your account.',
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

    const payload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash: _, ...result } = user;

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
    const { passwordHash: _, ...result } = user;
    return { data: result };
  }

  async updateMe(userId: string, updateDto: Record<string, any>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    Object.assign(user, updateDto);
    const updatedUser = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = updatedUser;

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

    return { message: 'Password changed successfully' };
  }

  logout() {
    return { message: 'Successfully logged out' };
  }

  refreshToken(refreshToken: string) {
    return { message: 'Token refreshed successfully', accessToken: 'new-mock-jwt-token' };
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { email: payload.email } });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async resendVerification(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      const verificationToken = this.jwtService.sign({ email }, { expiresIn: '1d' });
      try {
        await this.mailService.sendVerificationEmail(email, verificationToken);
      } catch (err) {
        console.log(`Resend verification link for ${email}: ${process.env.FRONTEND_URL || 'https://gleamlearn.vercel.app'}/verify-email?token=${verificationToken}`);
      }
    }
    return { message: `Verification email resent to ${email}` };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (user) {
      const resetToken = this.jwtService.sign({ email: user.email }, { expiresIn: '15m' });
      try {
        await this.mailService.sendPasswordResetEmail(user.email, resetToken);
      } catch (err) {
        console.log(`Password reset link for ${email}: ${process.env.FRONTEND_URL || 'https://gleamlearn.vercel.app'}/reset-password?token=${resetToken}`);
      }
    }

    return { message: `Password reset instructions sent to ${email}` };
  }

  async resetPassword(body: Record<string, any>) {
    const { token, newPassword, confirmNewPassword } = body;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { email: payload.email } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.save(user);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
  }
}
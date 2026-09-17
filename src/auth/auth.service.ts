// // src/auth/auth.service.ts
// import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './entities/user.entity.js'; 
// import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectRepository(User) // <-- FIXED: Inject User repository
//     private readonly userRepository: Repository<User>,
//     private readonly jwtService: JwtService,
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

//     const payload = { sub: savedUser.id, email: savedUser.email, username: savedUser.username };
//     const accessToken = this.jwtService.sign(payload);

//     return {
//       message: 'Account created successfully. Please verify your email.',
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

//   verifyEmail(token: string) {
//     return { message: 'Email verified successfully' };
//   }

//   resendVerification(email: string) {
//     return { message: `Verification email resent to ${email}` };
//   }

//   forgotPassword(email: string) {
//     return { message: `Password reset instructions sent to ${email}` };
//   }

//   resetPassword(body: Record<string, any>) {
//     return { message: 'Password has been reset successfully' };
//   }
// }






// src/auth/auth.service.ts
import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js'; 
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service.js'; // <-- 1. Import MailService
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService, // <-- 2. Inject MailService here
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

    // 3. Generate a secure verification token (expires in 1 day) and send the email
    const verificationToken = this.jwtService.sign(
      { email: savedUser.email }, 
      { expiresIn: '1d' }
    );
    await this.mailService.sendVerificationEmail(savedUser.email, verificationToken);

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
      // 4. Decode and verify the email token
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { email: payload.email } });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Optional: Mark user as verified if you have an isVerified column
      // user.isVerified = true;
      // await this.userRepository.save(user);

      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async resendVerification(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      const verificationToken = this.jwtService.sign({ email }, { expiresIn: '1d' });
      await this.mailService.sendVerificationEmail(email, verificationToken);
    }
    return { message: `Verification email resent to ${email}` };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    // To prevent user enumeration attacks, we return success even if email doesn't exist,
    // but we only send the email if the user actually exists.
    if (user) {
      const resetToken = this.jwtService.sign({ email: user.email }, { expiresIn: '15m' });
      await this.mailService.sendPasswordResetEmail(user.email, resetToken);
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
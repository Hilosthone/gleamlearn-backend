// import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { UserEntity } from '../users/users.entity.js';
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectRepository(UserEntity)
//     private readonly userRepository: Repository<UserEntity>,
//   ) {}

//   /**
//    * Handles user registration, maps onboarding payloads, hashes passwords,
//    * and saves the user record to PostgreSQL.
//    */
//   async signup(signupDto: Record<string, any>) {
//     const { email, username, password, confirmPassword, ...onboardingData } = signupDto;

//     // 1. Validate that passwords match
//     if (password !== confirmPassword) {
//       throw new ConflictException('Passwords do not match');
//     }

//     // 2. Check if user already exists by email or username
//     const existingUser = await this.userRepository.findOne({
//       where: [{ email }, { username }],
//     });

//     if (existingUser) {
//       throw new ConflictException('Email or username is already registered');
//     }

//     // 3. Hash the password securely using bcrypt (10 salt rounds)
//     const saltRounds = 10;
//     const passwordHash = await bcrypt.hash(password, saltRounds);

//     // 4. Create and save the new user entity
//     const newUser = this.userRepository.create({
//       email,
//       username,
//       passwordHash,
//       fullName: onboardingData.fullName,
//       dateOfBirth: onboardingData.dateOfBirth,
//       country: onboardingData.country,
//       educationType: onboardingData.educationType,
//       secondarySchool: onboardingData.secondarySchool,
//       university: onboardingData.university,
//       institution: onboardingData.institution,
//       department: onboardingData.department,
//       levelOrClass: onboardingData.levelOrClass,
//       preferredLearningPace: onboardingData.preferredLearningPace,
//       preferredStudyTime: onboardingData.preferredStudyTime,
//       academicGoals: onboardingData.academicGoals,
//     });

//     const savedUser = await this.userRepository.save(newUser);

//     // Omit the password hash from the returned response data for security
//     const { passwordHash: _, ...result } = savedUser;

//     return {
//       message: 'Account created successfully. Please verify your email.',
//       data: result,
//     };
//   }

//   /**
//    * Retrieves the authenticated user's details for GET /api/v1/auth/me
//    */
//   async getMe(userId: string) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new NotFoundException('User profile not found');
//     }
//     const { passwordHash: _, ...result } = user;
//     return { data: result };
//   }

//   // Placeholder login method
//   async login(loginDto: Record<string, any>) {
//     return { message: 'User login endpoint active' };
//   }
// }


import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/users.entity.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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
      university: onboardingData.university,
      institution: onboardingData.institution,
      department: onboardingData.department,
      levelOrClass: onboardingData.levelOrClass,
      preferredLearningPace: onboardingData.preferredLearningPace,
      preferredStudyTime: onboardingData.preferredStudyTime,
      academicGoals: onboardingData.academicGoals,
    });

    const savedUser = await this.userRepository.save(newUser);
    const { passwordHash: _, ...result } = savedUser;

    return {
      message: 'Account created successfully. Please verify your email.',
      data: result,
    };
  }

  async login(loginDto: Record<string, any>) {
    return { message: 'User login endpoint active' };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const { passwordHash: _, ...result } = user;
    return { data: result };
  }

  logout() {
    return { message: 'Successfully logged out' };
  }

  refreshToken(refreshToken: string) {
    return { message: 'Token refreshed successfully', accessToken: 'new-mock-jwt-token' };
  }

  verifyEmail(token: string) {
    return { message: 'Email verified successfully' };
  }

  resendVerification(email: string) {
    return { message: `Verification email resent to ${email}` };
  }

  forgotPassword(email: string) {
    return { message: `Password reset instructions sent to ${email}` };
  }

  resetPassword(body: Record<string, any>) {
    return { message: 'Password has been reset successfully' };
  }

  changePassword(body: Record<string, any>) {
    return { message: 'Password changed successfully' };
  }
}
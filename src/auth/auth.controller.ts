// //src/auth.controller.ts
// import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
// import { AuthService } from './auth.service.js';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { SignupDto } from './dto/signup.dto.js';
// import { LoginDto } from './dto/login.dto.js';
// import { RefreshTokenDto } from './dto/refresh-token.dto.js';
// import { VerifyEmailDto } from './dto/verify-email.dto.js';
// import { EmailDto } from './dto/email.dto.js';
// import { ResetPasswordDto, ChangePasswordDto, UpdateUserDto } from './dto/password.dto.js';

// @ApiTags('Auth')
// @Controller('api/v1/auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   @Post('signup')
//   @ApiOperation({ summary: 'Register a new user account' })
//   @ApiResponse({ status: 201, description: 'User successfully registered.' })
//   @ApiResponse({ status: 400, description: 'Validation failed.' })
//   signup(@Body() signupDto: SignupDto) {
//     return this.authService.signup(signupDto);
//   }

//   @Post('login')
//   @ApiOperation({ summary: 'Authenticate user and return tokens' })
//   @ApiResponse({ status: 200, description: 'Successfully logged in.' })
//   login(@Body() loginDto: LoginDto) {
//     return this.authService.login(loginDto);
//   }

//   @Post('logout')
//   @ApiOperation({ summary: 'Log out current user session' })
//   logout() {
//     return this.authService.logout();
//   }

//   @Post('refresh-token')
//   @ApiOperation({ summary: 'Generate a new access token using a refresh token' })
//   refreshToken(@Body() body: RefreshTokenDto) {
//     return this.authService.refreshToken(body.refreshToken);
//   }

//   @Post('verify-email')
//   @ApiOperation({ summary: 'Verify user email address' })
//   verifyEmail(@Body() body: VerifyEmailDto) {
//     return this.authService.verifyEmail(body.token);
//   }

//   @Post('resend-verification')
//   @ApiOperation({ summary: 'Resend email verification token' })
//   resendVerification(@Body() body: EmailDto) {
//     return this.authService.resendVerification(body.email);
//   }

//   @Post('forgot-password')
//   @ApiOperation({ summary: 'Initiate password reset process' })
//   forgotPassword(@Body() body: EmailDto) {
//     return this.authService.forgotPassword(body.email);
//   }

//   @Post('reset-password')
//   @ApiOperation({ summary: 'Complete password reset' })
//   resetPassword(@Body() body: ResetPasswordDto) {
//     return this.authService.resetPassword(body);
//   }

//   @Post('change-password')
//   @ApiOperation({ summary: 'Change password for authenticated user' })
//   changePassword(@Body() body: ChangePasswordDto) {
//     return this.authService.changePassword(body);
//   }

//   @Get('me')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Get profile details of the authenticated user' })
//   getMe() {
//     return this.authService.getMe('placeholder-id');
//   }

//   @Patch('me')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Update profile details of the authenticated user' })
//   updateMe(@Body() updateDto: UpdateUserDto) {
//     return { message: 'Update authenticated user details', data: updateDto };
//   }
// }



// // src/auth/auth.controller.ts
// import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
// import { AuthService } from './auth.service.js';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { SignupDto } from './dto/signup.dto.js';
// import { LoginDto } from './dto/login.dto.js';
// import { RefreshTokenDto } from './dto/refresh-token.dto.js';
// import { VerifyEmailDto } from './dto/verify-email.dto.js';
// import { EmailDto } from './dto/email.dto.js';
// import { ResetPasswordDto, ChangePasswordDto, UpdateUserDto } from './dto/password.dto.js';
// import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
// import { CurrentUser } from './decorators/current-user.decorator.js';

// @ApiTags('Auth')
// @Controller('api/v1/auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   @Post('signup')
//   @ApiOperation({ summary: 'Register a new user account' })
//   @ApiResponse({ status: 201, description: 'User successfully registered.' })
//   @ApiResponse({ status: 400, description: 'Validation failed.' })
//   signup(@Body() signupDto: SignupDto) {
//     return this.authService.signup(signupDto);
//   }

//   @Post('login')
//   @ApiOperation({ summary: 'Authenticate user and return tokens' })
//   @ApiResponse({ status: 200, description: 'Successfully logged in.' })
//   login(@Body() loginDto: LoginDto) {
//     return this.authService.login(loginDto);
//   }

//   @Post('logout')
//   @ApiOperation({ summary: 'Log out current user session' })
//   logout() {
//     return this.authService.logout();
//   }

//   @Post('refresh-token')
//   @ApiOperation({ summary: 'Generate a new access token using a refresh token' })
//   refreshToken(@Body() body: RefreshTokenDto) {
//     return this.authService.refreshToken(body.refreshToken);
//   }

//   @Post('verify-email')
//   @ApiOperation({ summary: 'Verify user email address' })
//   verifyEmail(@Body() body: VerifyEmailDto) {
//     return this.authService.verifyEmail(body.token);
//   }

//   @Post('resend-verification')
//   @ApiOperation({ summary: 'Resend email verification token' })
//   resendVerification(@Body() body: EmailDto) {
//     return this.authService.resendVerification(body.email);
//   }

//   @Post('forgot-password')
//   @ApiOperation({ summary: 'Initiate password reset process' })
//   forgotPassword(@Body() body: EmailDto) {
//     return this.authService.forgotPassword(body.email);
//   }

//   @Post('reset-password')
//   @ApiOperation({ summary: 'Complete password reset' })
//   resetPassword(@Body() body: ResetPasswordDto) {
//     return this.authService.resetPassword(body);
//   }

//   @Post('change-password')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Change password for authenticated user' })
//   changePassword(
//     @Body() body: ChangePasswordDto,
//     @CurrentUser('id') userId: string,
//   ) {
//     // Pass userId into your service if needed for security validation
//     return this.authService.changePassword(userId, body);
//   }

//   @Get('me')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Get profile details of the authenticated user' })
//   getMe(@CurrentUser('id') userId: string) {
//     return this.authService.getMe(userId); // Replaced 'placeholder-id' with real user ID
//   }

//   @Patch('me')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Update profile details of the authenticated user' })
//   updateMe(
//     @Body() updateDto: UpdateUserDto,
//     @CurrentUser('id') userId: string,
//   ) {
//     return this.authService.updateMe(userId, updateDto);
//   }
// }




// src/auth/auth.controller.ts
import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { ResetPasswordDto, ChangePasswordDto, UpdateUserDto } from './dto/password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 10, ttl: 60000 } })
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Throttle({ short: { limit: 1, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and return tokens' })
  @ApiResponse({ status: 200, description: 'Successfully logged in.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out current user session' })
  logout() {
    return this.authService.logout();
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Generate a new access token using a refresh token' })
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email address' })
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification token' })
  resendVerification(@Body() body: EmailDto) {
    return this.authService.resendVerification(body.email);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Initiate password reset process' })
  forgotPassword(@Body() body: EmailDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Complete password reset' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.authService.changePassword(userId, body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of the authenticated user' })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile details of the authenticated user' })
  updateMe(
    @Body() updateDto: UpdateUserDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.authService.updateMe(userId, updateDto);
  }
}
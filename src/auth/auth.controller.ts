// import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
// import { AuthService } from './auth.service.js';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

// @ApiTags('Auth')
// @Controller('api/v1/auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   @Post('signup')
//   @ApiOperation({ summary: 'Register a new user account' })
//   @ApiResponse({ status: 201, description: 'User successfully registered.' })
//   @ApiResponse({ status: 400, description: 'Bad request or validation error.' })
//   signup(@Body() signupDto: Record<string, any>) {
//     return this.authService.signup(signupDto);
//   }

//   @Post('login')
//   @ApiOperation({ summary: 'Authenticate user and return tokens' })
//   @ApiResponse({ status: 200, description: 'Successfully logged in.' })
//   @ApiResponse({ status: 401, description: 'Invalid credentials.' })
//   login(@Body() loginDto: Record<string, any>) {
//     return this.authService.login(loginDto);
//   }

//   @Post('logout')
//   @ApiOperation({ summary: 'Log out current user session' })
//   @ApiResponse({ status: 200, description: 'Successfully logged out.' })
//   logout() {
//     return this.authService.logout();
//   }

//   @Post('refresh-token')
//   @ApiOperation({ summary: 'Generate a new access token using a refresh token' })
//   @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
//   refreshToken(@Body() body: { refreshToken: string }) {
//     return this.authService.refreshToken(body.refreshToken);
//   }

//   @Post('verify-email')
//   @ApiOperation({ summary: 'Verify user email address via verification token' })
//   @ApiResponse({ status: 200, description: 'Email verified successfully.' })
//   verifyEmail(@Body() body: { token: string }) {
//     return this.authService.verifyEmail(body.token);
//   }

//   @Post('resend-verification')
//   @ApiOperation({ summary: 'Resend email verification token' })
//   @ApiResponse({ status: 200, description: 'Verification email sent.' })
//   resendVerification(@Body() body: { email: string }) {
//     return this.authService.resendVerification(body.email);
//   }

//   @Post('forgot-password')
//   @ApiOperation({ summary: 'Initiate password reset process' })
//   @ApiResponse({ status: 200, description: 'Password reset link sent to email if found.' })
//   forgotPassword(@Body() body: { email: string }) {
//     return this.authService.forgotPassword(body.email);
//   }

//   @Post('reset-password')
//   @ApiOperation({ summary: 'Complete password reset with token and new password' })
//   @ApiResponse({ status: 200, description: 'Password reset successfully.' })
//   resetPassword(@Body() body: Record<string, any>) {
//     return this.authService.resetPassword(body);
//   }

//   @Post('change-password')
//   @ApiOperation({ summary: 'Change password for an authenticated user' })
//   @ApiResponse({ status: 200, description: 'Password changed successfully.' })
//   changePassword(@Body() body: Record<string, any>) {
//     return this.authService.changePassword(body);
//   }

//   @Get('me')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Get profile details of the authenticated user' })
//   @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getMe() {
//     // TODO: Pass actual user ID extracted from JWT guard later
//     return this.authService.getMe('placeholder-id');
//   }

//   @Patch('me')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Update details of the authenticated user' })
//   @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   updateMe(@Body() updateDto: Record<string, any>) {
//     return { message: 'Update authenticated user details', data: updateDto };
//   }
// }



import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { ResetPasswordDto, ChangePasswordDto, UpdateUserDto } from './dto/password.dto.js';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

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

  @Post('forgot-password')
  @ApiOperation({ summary: 'Initiate password reset process' })
  forgotPassword(@Body() body: EmailDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Complete password reset' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  changePassword(@Body() body: ChangePasswordDto) {
    return this.authService.changePassword(body);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of the authenticated user' })
  getMe() {
    return this.authService.getMe('placeholder-id');
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile details of the authenticated user' })
  updateMe(@Body() updateDto: UpdateUserDto) {
    return { message: 'Update authenticated user details', data: updateDto };
  }
}
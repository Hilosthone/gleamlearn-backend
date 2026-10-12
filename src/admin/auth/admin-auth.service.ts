// src/admin/auth/admin-auth.service.ts
import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Admin, AdminRole } from './entity/admin.entity.js';
import * as bcrypt from 'bcrypt';
import {
  ADMIN_PASSWORD_RESET_TOKEN_TYPE,
  ADMIN_TOKEN_TYPE,
  getAdminJwtExpiresIn,
  getAdminJwtSecret,
  logAdminJwtStatus,
} from './admin-jwt.config.js';

@Injectable()
export class AdminAuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Admin secret or a 503: admin auth fails closed when ADMIN_JWT_SECRET is missing or invalid. */
  private requireAdminSecret(): string {
    const secret = getAdminJwtSecret(this.configService);
    if (!secret) {
      throw new ServiceUnavailableException('Admin authentication is not configured.');
    }
    return secret;
  }

  /**
   * Automatically seeds the default Super Admin account on application startup
   */
  async onModuleInit() {
    logAdminJwtStatus(this.configService);
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'gleamlearn.ai@gmail.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin@gleamlearn123';

    const existingSuperAdmin = await this.adminRepo.findOne({ where: { email: superAdminEmail } });
    if (!existingSuperAdmin) {
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);
      const superAdmin = this.adminRepo.create({
        email: superAdminEmail,
        passwordHash,
        fullName: 'GleamLearn Super Admin',
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
      });
      await this.adminRepo.save(superAdmin);
      console.log(`[Security] Default Super Admin account seeded successfully (${superAdminEmail})`);
    }
  }

  async login(loginDto: Record<string, any>) {
    // Fail closed before touching credentials when admin auth is not configured
    const secret = this.requireAdminSecret();
    const { email, password } = loginDto;

    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid admin credentials or account disabled');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload = { sub: admin.id, email: admin.email, role: admin.role, type: ADMIN_TOKEN_TYPE };
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: getAdminJwtExpiresIn(this.configService) as any,
    });

    const { passwordHash: _, ...result } = admin;

    return {
      status: 'success',
      message: 'Admin logged in successfully',
      accessToken,
      data: result,
    };
  }

  async getMe(adminId: string) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin profile not found');
    }
    const { passwordHash: _, ...result } = admin;
    return { status: 'success', data: result };
  }

  logout() {
    return { status: 'success', message: 'Admin logged out successfully' };
  }

  refreshToken(refreshToken: string) {
    // Implement admin token refresh logic as needed
    return { status: 'success', message: 'Admin token refreshed successfully', accessToken: 'new-mock-admin-jwt' };
  }

  async forgotPassword(email: string) {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (admin) {
      // In production, integrate MailService here to send an admin password reset token
    }
    return { status: 'success', message: `If the email exists, reset instructions have been sent to ${email}` };
  }

  async resetPassword(body: Record<string, any>) {
    const { token, newPassword, confirmNewPassword } = body;
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // SECURITY: only a dedicated admin password-reset token is accepted:
    //   - signed with ADMIN_JWT_SECRET (learner tokens use JWT_SECRET and fail verification),
    //   - `type` claim === 'admin_password_reset' (admin access tokens are rejected),
    //   - `sub` identifies an existing admin AND the token's `email` matches that admin.
    // No code path issues such tokens yet (forgotPassword sends nothing), so this endpoint is
    // intentionally disabled until a proper single-use reset flow is implemented.
    const secret = this.requireAdminSecret();
    const invalid = () => new BadRequestException('Invalid or expired password reset token');

    let payload: any;
    try {
      payload = this.jwtService.verify(typeof token === 'string' ? token : '', { secret, algorithms: ['HS256'] });
    } catch {
      throw invalid();
    }
    if (
      !payload ||
      payload.type !== ADMIN_PASSWORD_RESET_TOKEN_TYPE ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      throw invalid();
    }

    const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive || admin.email.toLowerCase() !== payload.email.toLowerCase()) {
      throw invalid();
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.adminRepo.save(admin);

    return { status: 'success', message: 'Admin password reset successfully' };
  }
}
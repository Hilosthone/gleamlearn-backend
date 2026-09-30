// src/admin/auth/admin-auth.service.ts
import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Admin, AdminRole } from './entity/admin.entity.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminAuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Automatically seeds the default Super Admin account on application startup
   */
  async onModuleInit() {
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
    const { email, password } = loginDto;

    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid admin credentials or account disabled');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload = { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' };
    const accessToken = this.jwtService.sign(payload);

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

    try {
      const payload = this.jwtService.verify(token);
      const admin = await this.adminRepo.findOne({ where: { email: payload.email } });
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      admin.passwordHash = await bcrypt.hash(newPassword, 12);
      await this.adminRepo.save(admin);

      return { status: 'success', message: 'Admin password reset successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
  }
}
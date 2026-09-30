// src/admin/auth/strategies/admin-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Admin } from '../entity/admin.entity.js';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-super-secret-key',
    });
  }

  async validate(payload: any) {
    // This explicitly queries the admins table using the token's sub (id)
    const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive, frozen, or deleted.');
    }
    return admin;
  }
}
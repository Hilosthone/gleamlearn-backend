// src/admin/auth/strategies/admin-jwt.strategy.ts
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Admin } from '../entity/admin.entity.js';
import { ADMIN_TOKEN_TYPE, getAdminJwtSecret } from '../admin-jwt.config.js';

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
      algorithms: ['HS256'],
      // Admin tokens are verified ONLY with ADMIN_JWT_SECRET (never JWT_SECRET or a default).
      // When it is not configured, every admin request fails with 503 instead of the app crashing.
      secretOrKeyProvider: (_req: unknown, _rawJwt: unknown, done: (err: unknown, secret?: string) => void) => {
        const secret = getAdminJwtSecret(configService);
        if (!secret) return done(new ServiceUnavailableException('Admin authentication is not configured.'));
        return done(null, secret);
      },
    });
  }

  async validate(payload: any) {
    // Only admin access tokens: learner tokens and password-reset tokens are rejected here
    if (!payload || payload.type !== ADMIN_TOKEN_TYPE || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Admin authentication required');
    }
    const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive, frozen, or deleted.');
    }
    return admin;
  }
}

// // src/auth/strategies/jwt.strategy.ts
// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { ConfigService } from '@nestjs/config';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor(private configService: ConfigService) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false,
//       secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key',
//     });
//   }

//   async validate(payload: any) {
//     return { id: payload.sub, email: payload.email, username: payload.username };
//   }
// }



// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { LEARNER_TOKEN_TYPE } from '../../admin/auth/admin-jwt.config.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    // Only learner access tokens. Admin and admin-reset tokens are signed with ADMIN_JWT_SECRET and would
    // already fail signature verification; the type check is defense in depth. Learner tokens issued before
    // the `type` claim existed (no claim) are accepted until they expire (JWT_EXPIRES_IN, 7 days by default).
    if (!payload || (payload.type !== undefined && payload.type !== LEARNER_TOKEN_TYPE)) {
      throw new UnauthorizedException('Learner authentication required');
    }
    const userId = payload.sub || payload.id;
    if (typeof userId !== 'string' || !userId) {
      throw new UnauthorizedException('Learner authentication required');
    }
    const user = (await this.userRepository.findOne({ where: { id: userId } })) as any;

    if (!user || user.deletedAt || user.isFrozen) {
      throw new UnauthorizedException('Account is inactive, frozen, or deleted.');
    }

    return { id: user.id, email: user.email, username: user.username, role: user.role };
  }
}
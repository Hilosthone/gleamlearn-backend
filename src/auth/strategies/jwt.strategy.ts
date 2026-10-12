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
import { AccountStatusService } from '../account-status.service.js';
import { LEARNER_AUTH_NOT_CONFIGURED, readLearnerJwtSecret } from '../learner-jwt.config.js';

/**
 * Routes a FROZEN account may still use (so the learner can see their account and unfreeze it).
 * Every other authenticated route rejects frozen accounts with 403 ACCOUNT_FROZEN.
 */
export const FROZEN_ACCOUNT_ALLOWED_ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['GET', '/api/v1/users/me'],
  ['GET', '/api/v1/auth/me'],
  ['POST', '/api/v1/users/me/unfreeze'],
  ['POST', '/api/v1/auth/logout'],
];

export function isFrozenAllowedRequest(req: { method?: string; path?: string; originalUrl?: string }): boolean {
  const method = (req.method ?? '').toUpperCase();
  const path = (req.path ?? (req.originalUrl ?? '').split('?')[0]).replace(/\/+$/, '');
  return FROZEN_ACCOUNT_ALLOWED_ROUTES.some(([m, routePath]) => m === method && routePath === path);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accountStatus: AccountStatusService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // No hard-coded fallback: a missing JWT_SECRET rejects every learner token (fail closed)
      secretOrKeyProvider: (_req: unknown, _rawJwt: unknown, done: (err: unknown, secret?: string) => void) => {
        const secret = readLearnerJwtSecret((k) => configService.get<string>(k));
        if (secret) done(null, secret);
        else done(new UnauthorizedException(LEARNER_AUTH_NOT_CONFIGURED));
      },
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
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

    // Account status is re-checked on EVERY request, so an already-issued token stops working as soon as
    // the account is restricted, suspended, frozen or deleted (no need to wait for the token to expire).
    const status = await this.accountStatus.getStatus(userId);
    AccountStatusService.assertAllowed(status, {
      allowFrozen: isFrozenAllowedRequest(req),
      unauthorizedMessage: 'Account is inactive or no longer exists.',
    });

    const user = (await this.userRepository.findOne({ where: { id: userId } })) as any;
    if (!user) {
      throw new UnauthorizedException('Account is inactive or no longer exists.');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: status.role ?? undefined,
      accountStatus: AccountStatusService.stateOf(status),
    };
  }
}

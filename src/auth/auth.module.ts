// // src/auth/auth.module.ts
// import { Module, Global } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { AuthService } from './auth.service.js';
// import { AuthController } from './auth.controller.js';
// import { User } from './entities/user.entity.js';
// import { JwtStrategy } from './strategies/jwt.strategy.js';
// import { MailModule } from '../mail/mail.module.js'; // <-- 1. Import MailModule

// @Global()
// @Module({
//   imports: [
//     TypeOrmModule.forFeature([User]),
//     PassportModule.register({ defaultStrategy: 'jwt' }),
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => ({
//         secret: config.get<string>('JWT_SECRET') || 'super-secret-jwt-key',
//         signOptions: { 
//           expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as any, 
//         },
//       }),
//     }),
//     MailModule, // <-- 2. Add MailModule here to fix the unknown dependency error
//   ],
//   controllers: [AuthController],
//   providers: [AuthService, JwtStrategy],
//   exports: [JwtStrategy, PassportModule, JwtModule, MailModule], // Optional: export MailModule if other modules need it via AuthModule
// })
// export class AuthModule {}



// src/auth/auth.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { User } from './entities/user.entity.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { MailModule } from '../mail/mail.module.js'; 
import { NotificationsModule } from '../notifications/notifications.module.js'; // <-- 1. Import NotificationsModule

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'super-secret-jwt-key',
        signOptions: { 
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as any, 
        },
      }),
    }),
    MailModule, 
    NotificationsModule, // <-- 2. Add NotificationsModule here so NestJS resolves it in AuthService
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule, JwtModule, MailModule, NotificationsModule], // Optional: exported so other modules can access it if needed
})
export class AuthModule {}
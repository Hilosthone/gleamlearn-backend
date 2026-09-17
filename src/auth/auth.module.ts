// // src/auth/auth.module.ts
// import { Module, Global } from '@nestjs/common'; // <-- Import Global
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { AuthService } from './auth.service.js';
// import { AuthController } from './auth.controller.js';
// import { User } from './entities/user.entity.js';
// import { JwtStrategy } from './strategies/jwt.strategy.js';

// @Global() // <-- Makes AuthModule available globally across all modules
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
//   ],
//   controllers: [AuthController],
//   providers: [AuthService, JwtStrategy],
//   exports: [JwtStrategy, PassportModule, JwtModule],
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
import { MailModule } from '../mail/mail.module.js'; // <-- 1. Import MailModule

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
    MailModule, // <-- 2. Add MailModule here to fix the unknown dependency error
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule, JwtModule, MailModule], // Optional: export MailModule if other modules need it via AuthModule
})
export class AuthModule {}
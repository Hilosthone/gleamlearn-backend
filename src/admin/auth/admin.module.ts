// // src/admin/admin.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { Admin } from './entity/admin.entity.js';
// import { AdminAuthService } from './admin-auth.service.js';
// import { AdminAuthController } from './admin-auth.controller.js';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([Admin]),
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
//   controllers: [AdminAuthController],
//   providers: [AdminAuthService],
//   exports: [AdminAuthService],
// })
// export class AdminAuthModule {}



// src/admin/auth/admin-auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Admin } from './entity/admin.entity.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
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
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy], 
  exports: [AdminAuthService, AdminJwtStrategy],
})
export class AdminAuthModule {}
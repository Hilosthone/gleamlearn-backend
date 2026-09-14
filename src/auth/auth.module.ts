// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { AuthController } from './auth.controller.js';
// import { AuthService } from './auth.service.js';
// import { UserEntity } from '../users/users.entity.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([UserEntity])],
//   controllers: [AuthController],
//   providers: [AuthService],
//   exports: [AuthService],
// })
// export class AuthModule {}


// // src/auth/auth.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { AuthService } from './auth.service.js';
// import { AuthController } from './auth.controller.js';
// import { User } from './entities/user.entity.js';
// import { JwtStrategy } from './strategies/jwt.strategy.js';

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
import { Module, Global } from '@nestjs/common'; // <-- Import Global
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { User } from './entities/user.entity.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Global() // <-- Makes AuthModule available globally across all modules
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
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
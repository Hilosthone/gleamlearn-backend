// // src/auth/auth.controller.spec.ts
// import { Test, TestingModule } from '@nestjs/testing';
// import { AuthController } from './auth.controller.js';
// import { AuthService } from './auth.service.js';
// import { jest } from '@jest/globals';

// describe('AuthController', () => {
//   let controller: AuthController;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [AuthController],
//       providers: [
//         {
//           provide: AuthService,
//           useValue: {
//             signup: jest.fn().mockResolvedValue({ message: 'Mock signup' }),
//             login: jest.fn().mockResolvedValue({ message: 'Mock login' }),
//             logout: jest.fn().mockReturnValue({ message: 'Mock logout' }),
//             refreshToken: jest.fn().mockReturnValue({ message: 'Mock refresh' }),
//             verifyEmail: jest.fn().mockReturnValue({ message: 'Mock verify' }),
//             resendVerification: jest.fn().mockReturnValue({ message: 'Mock resend' }),
//             forgotPassword: jest.fn().mockReturnValue({ message: 'Mock forgot' }),
//             resetPassword: jest.fn().mockReturnValue({ message: 'Mock reset' }),
//             changePassword: jest.fn().mockReturnValue({ message: 'Mock change' }),
//             getMe: jest.fn().mockResolvedValue({ message: 'Mock getMe' }),
//           } as any, // <-- This forces TypeScript to bypass strict method signature checks on the mock
//         },
//       ],
//     }).compile();

//     controller = module.get<AuthController>(AuthController);
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });
// });


// src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../users/users.entity.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: () => {},
            create: () => {},
            save: () => {},
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
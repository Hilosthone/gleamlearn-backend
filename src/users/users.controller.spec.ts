import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service.js';
import { User } from '../auth/entities/user.entity.js';
import { AccountStatusService } from '../auth/account-status.service.js';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
  { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })), setRestricted: vi.fn(async () => 1), setFrozen: vi.fn(async () => 1), softDelete: vi.fn(async () => 1) } },UsersService, { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(), update: vi.fn() } }, { provide: DataSource, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

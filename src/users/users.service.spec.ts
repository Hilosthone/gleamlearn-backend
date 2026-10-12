import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { User } from '../auth/entities/user.entity.js';
import { AccountStatusService } from '../auth/account-status.service.js';

const usersServiceTestProviders = [
  { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })), setRestricted: vi.fn(async () => 1), setFrozen: vi.fn(async () => 1), softDelete: vi.fn(async () => 1) } },
  UsersService,
  { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(), update: vi.fn() } },
];

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: usersServiceTestProviders,
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

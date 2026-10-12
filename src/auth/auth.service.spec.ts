import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AccountStatusService } from './account-status.service.js';

// Shared mock providers for AuthService's real constructor dependencies
const authServiceTestProviders = [
  { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })), setRestricted: vi.fn(async () => 1), setFrozen: vi.fn(async () => 1), softDelete: vi.fn(async () => 1) } },
  AuthService,
  { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(), create: vi.fn(), save: vi.fn() } },
  { provide: JwtService, useValue: { sign: vi.fn(), signAsync: vi.fn(), verify: vi.fn() } },
  { provide: MailService, useValue: {} },
  { provide: NotificationsService, useValue: {} },
];

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: authServiceTestProviders,
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

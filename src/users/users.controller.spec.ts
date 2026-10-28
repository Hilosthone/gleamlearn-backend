import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service.js';
import { User } from '../auth/entities/user.entity.js';
import { AccountStatusService } from '../auth/account-status.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  const notifications = { updateSettings: vi.fn(async (userId: string, dto: object) => ({ status: 'success', data: { userId, ...dto } })) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
  { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })), setRestricted: vi.fn(async () => 1), setFrozen: vi.fn(async () => 1), softDelete: vi.fn(async () => 1) } },UsersService, { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(), update: vi.fn() } }, { provide: DataSource, useValue: {} }, { provide: NotificationsService, useValue: notifications }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('notification preferences are stored through the notification settings (not echoed back)', async () => {
    await expect(controller.updateNotifications('u1', { emailAlerts: false })).resolves.toMatchObject({ data: { userId: 'u1', emailAlerts: false } });
    expect(notifications.updateSettings).toHaveBeenCalledWith('u1', { emailAlerts: false });
  });

  it('privacy settings answer 501 instead of a fake success', () => {
    let err: any;
    try {
      controller.updatePrivacy('u1', { profileVisibility: 'private' });
    } catch (e) {
      err = e;
    }
    expect(err?.getResponse()).toMatchObject({ statusCode: 501, code: 'FEATURE_UNAVAILABLE', feature: 'Privacy settings' });
  });
});

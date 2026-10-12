import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminUsersService, toAdminUserView } from './users.service.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';

const user = {
  id: 'u1',
  fullName: 'Ada Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  passwordHash: '$2b$10$hash',
  verificationOtp: '481516',
  otpExpiresAt: new Date(),
  refreshToken: 'refresh-secret',
  isEmailVerified: true,
  isRestricted: false,
  createdAt: new Date(),
} as any;

describe('admin user responses never contain secrets', () => {
  const SECRET_KEYS = ['passwordHash', 'verificationOtp', 'otpExpiresAt', 'refreshToken'];

  it('toAdminUserView removes secret fields and keeps profile fields', () => {
    const view = toAdminUserView(user) as Record<string, unknown>;
    for (const key of SECRET_KEYS) expect(view).not.toHaveProperty(key);
    expect(view).toMatchObject({ id: 'u1', email: 'ada@example.com', username: 'ada', isEmailVerified: true });
    expect(user.verificationOtp).toBe('481516'); // the entity itself is not mutated
  });

  it('GET /admin/users and GET /admin/users/:id responses are sanitized', async () => {
    const userRepo = {
      findAndCount: vi.fn().mockResolvedValue([[user], 1]),
      findOne: vi.fn().mockResolvedValue(user),
    };
    const service = new AdminUsersService(userRepo as any, {} as any);

    const list = await service.findAll({ page: 1, limit: 10 });
    const one = await service.findOne('u1');
    const serialized = JSON.stringify([list, one]);
    for (const secret of ['481516', 'refresh-secret', '$2b$10$hash']) expect(serialized).not.toContain(secret);
    expect(list.data.pagination).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('limit is capped at 100', async () => {
    const tooMany = await validate(plainToInstance(AdminUsersQueryDto, { limit: '500' }));
    expect(tooMany.some((e) => e.property === 'limit')).toBe(true);
    const ok = await validate(plainToInstance(AdminUsersQueryDto, { limit: '100', page: '2' }));
    expect(ok).toHaveLength(0);
  });
});

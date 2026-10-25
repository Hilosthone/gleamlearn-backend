import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service.js';
import { UpdateAcademicProfileDto, UpdateUserDto } from './dto/update-user.dto.js';

const me = { id: 'u1', username: 'ada', email: 'ada@example.com', fullName: 'Ada' };

function build(rows: Array<Record<string, unknown>>) {
  const repo = {
    findOne: vi.fn(async ({ where }: any) => rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const service = new UsersService(repo as never, {} as never, {} as never);
  return { service, repo };
}

describe('PATCH /users/me (UsersService.updateProfile)', () => {
  it('a username another learner has is a 409, and nothing is written', async () => {
    const { service, repo } = build([me, { id: 'u2', username: 'grace' }]);
    await expect(service.updateProfile('u1', { username: 'grace' })).rejects.toThrow(new ConflictException('That username is already taken.'));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('keeping your own username, or choosing a free one, is saved', async () => {
    const { service, repo } = build([me]);
    await service.updateProfile('u1', { username: 'ada', fullName: 'Ada L.' });
    await service.updateProfile('u1', { username: 'ada_l' });
    expect(repo.update).toHaveBeenNthCalledWith(1, 'u1', { username: 'ada', fullName: 'Ada L.' });
    expect(repo.update).toHaveBeenNthCalledWith(2, 'u1', { username: 'ada_l' });
  });
});

describe('profile DTO limits (400 instead of a database error)', () => {
  const fields = async (cls: any, body: object) => (await validate(plainToInstance(cls, body))).map((e) => e.property);

  it('basic details use the same limits as sign-up', async () => {
    expect(await fields(UpdateUserDto, { fullName: 'Ada', username: 'ada', country: 'Nigeria', dateOfBirth: '2008-04-01' })).toEqual([]);
    expect(await fields(UpdateUserDto, { fullName: 'x'.repeat(151) })).toEqual(['fullName']);
    expect(await fields(UpdateUserDto, { username: 'x'.repeat(101) })).toEqual(['username']);
    expect(await fields(UpdateUserDto, { country: 'x'.repeat(101) })).toEqual(['country']);
    expect(await fields(UpdateUserDto, { dateOfBirth: '01/04/2008' })).toEqual(['dateOfBirth']);
  });

  it('academic details are capped (255, goals 2000)', async () => {
    expect(await fields(UpdateAcademicProfileDto, { university: 'Test University', examAimOrGoals: 'x'.repeat(1500) })).toEqual([]);
    expect(await fields(UpdateAcademicProfileDto, { department: 'x'.repeat(256) })).toEqual(['department']);
    expect(await fields(UpdateAcademicProfileDto, { examAimOrGoals: 'x'.repeat(2001) })).toEqual(['examAimOrGoals']);
  });
});

import { Body, Controller, INestApplication, Post, Get, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createGlobalValidationPipe, isRequestValidationEnabled } from './global-validation.pipe.js';
import { ChangePasswordDto } from '../../auth/dto/password.dto.js';
import { TutorActionDto } from '../../ai-tutor/dto/ai-tutor.dto.js';
import { AdminUsersQueryDto } from '../../admin/users/dto/admin-users-query.dto.js';

@Controller('t')
class ProbeController {
  @Post('change-password')
  changePassword(@Body() body: ChangePasswordDto) {
    return body;
  }

  @Post('tutor')
  tutor(@Body() body: TutorActionDto) {
    return body;
  }

  @Get('users')
  users(@Query() query: AdminUsersQueryDto) {
    return { page: query.page, limit: query.limit, pageType: typeof query.page };
  }

  @Post('untyped')
  untyped(@Body() body: any) {
    return body;
  }
}

describe('global ValidationPipe', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a body that violates declared validators, without echoing values', async () => {
    const res = await request(app.getHttpServer()).post('/t/change-password').send({ oldPassword: 'secret-old', newPassword: '123' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('secret-old');
  });

  it('keeps undeclared fields that existing services read (no whitelist stripping)', async () => {
    const res = await request(app.getHttpServer())
      .post('/t/change-password')
      .send({ oldPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' });
    expect(res.status).toBe(201);
    expect(res.body.confirmNewPassword).toBe('NewPass1!');
  });

  it('enforces required fields on AI tutor actions', async () => {
    expect((await request(app.getHttpServer()).post('/t/tutor').send({})).status).toBe(400);
    expect((await request(app.getHttpServer()).post('/t/tutor').send({ input: 'Cells', context: { level: 'SS2' } })).status).toBe(201);
  });

  it('converts query strings and applies DTO defaults', async () => {
    const res = await request(app.getHttpServer()).get('/t/users?page=2');
    expect(res.body).toEqual({ page: 2, limit: 10, pageType: 'number' });
    expect((await request(app.getHttpServer()).get('/t/users?page=0')).status).toBe(400);
  });

  it('leaves untyped (any) bodies untouched', async () => {
    const res = await request(app.getHttpServer()).post('/t/untyped').send({ anything: 1 });
    expect(res.body).toEqual({ anything: 1 });
  });

  it('can be switched off with REQUEST_VALIDATION=off', () => {
    const saved = process.env.REQUEST_VALIDATION;
    process.env.REQUEST_VALIDATION = 'off';
    expect(isRequestValidationEnabled()).toBe(false);
    delete process.env.REQUEST_VALIDATION;
    expect(isRequestValidationEnabled()).toBe(true);
    if (saved !== undefined) process.env.REQUEST_VALIDATION = saved;
  });
});

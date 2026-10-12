import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { FlashcardsController } from './flashcards.controller.js';
import { FlashcardDecksController } from './flashcard-decks.controller.js';
import { FlashcardsService } from './flashcards.service.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { User } from '../auth/entities/user.entity.js';
import { AccountStatusService } from '../auth/account-status.service.js';

const LEARNER_SECRET = 'learner-secret-for-tests-0123456789abcdef';
const USER_ID = '66666666-6666-4666-8666-666666666666';
const CARD = '77777777-7777-4777-8777-777777777777';

// The 12 flashcard calls made by gleamlearn-landing/src/lib/api.ts, mapped to their service method
const CALLS: Array<[string, string, string]> = [
  ['post', '/flashcards', 'createFlashcard'],
  ['get', '/flashcards', 'findAllFlashcards'],
  ['get', '/flashcards/review/today', 'getCardsDueToday'],
  ['get', `/flashcards/${CARD}`, 'findOneFlashcard'],
  ['patch', `/flashcards/${CARD}`, 'updateFlashcard'],
  ['delete', `/flashcards/${CARD}`, 'removeFlashcard'],
  ['post', `/flashcards/${CARD}/review`, 'reviewFlashcard'],
  ['post', '/flashcard-decks', 'createDeck'],
  ['get', '/flashcard-decks', 'findAllDecks'],
  ['get', `/flashcard-decks/${CARD}`, 'findOneDeck'],
  ['patch', `/flashcard-decks/${CARD}`, 'updateDeck'],
  ['delete', `/flashcard-decks/${CARD}`, 'removeDeck'],
];

describe('flashcards routes: /api/v1 prefix added, original paths kept', () => {
  let app: INestApplication;
  const service: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const [, , method] of CALLS) service[method] = vi.fn(async () => ({ ok: method }));
  const token = new JwtService({}).sign({ sub: USER_ID, type: 'learner' }, { secret: LEARNER_SECRET, expiresIn: '1h' });
  const adminToken = new JwtService({}).sign({ sub: USER_ID, type: 'admin' }, { secret: LEARNER_SECRET, expiresIn: '1h' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [FlashcardsController, FlashcardDecksController],
      providers: [
  { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })), setRestricted: vi.fn(async () => 1), setFrozen: vi.fn(async () => 1), softDelete: vi.fn(async () => 1) } },
        JwtStrategy,
        { provide: FlashcardsService, useValue: service },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'JWT_SECRET' ? LEARNER_SECRET : undefined) } },
        { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(async () => ({ id: USER_ID, email: 'a@x.test' })) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => Object.values(service).forEach((fn) => fn.mockClear()));

  const send = (method: string, path: string, auth?: string) => {
    const req = (request(app.getHttpServer()) as any)[method](path);
    if (auth) req.set('Authorization', `Bearer ${auth}`);
    return method === 'post' || method === 'patch' ? req.send({}) : req;
  };

  describe.each([['/api/v1', '/api/v1'], ['legacy (no prefix)', '']])('%s', (_label, prefix) => {
    it.each(CALLS)('%s %s reaches %s for the authenticated learner', async (method, path, serviceMethod) => {
      const res = await send(method, `${prefix}${path}`, token);
      expect(res.status).toBeLessThan(300);
      expect(res.body).toEqual({ ok: serviceMethod });
      expect(service[serviceMethod]).toHaveBeenCalledTimes(1);
      expect(service[serviceMethod].mock.calls[0]).toContain(USER_ID); // scoped to the caller
    });

    it.each(CALLS)('%s %s without a token is 401 and never reaches the service', async (method, path, serviceMethod) => {
      const res = await send(method, `${prefix}${path}`);
      expect(res.status).toBe(401);
      expect(service[serviceMethod]).not.toHaveBeenCalled();
    });

    it('rejects a non-learner (admin-typed) token', async () => {
      expect((await send('get', `${prefix}/flashcards`, adminToken)).status).toBe(401);
    });

    it('propagates service errors identically (404)', async () => {
      service.findOneFlashcard.mockRejectedValueOnce(new NotFoundException('Flashcard not found'));
      const res = await send('get', `${prefix}/flashcards/${CARD}`, token);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Flashcard not found');
    });
  });

  it('both prefixes resolve to the same handler (no duplicated controller)', async () => {
    await send('get', '/api/v1/flashcards/review/today', token);
    await send('get', '/flashcards/review/today', token);
    expect(service.getCardsDueToday).toHaveBeenCalledTimes(2);
    expect(service.findOneFlashcard).not.toHaveBeenCalled(); // 'review/today' is not captured by ':id'
  });
});

import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { trackerFor, UserAwareThrottlerGuard } from './user-throttler.guard.js';
import { trustProxySetting } from '../security/trust-proxy.js';
import { currentUserId, runWithUser } from '../request-context.js';
import { AI_USER_HEADER, getAiHttpClient } from '../ai-service/ai-http.client.js';

const jwt = new JwtService();
const secrets: [string, string][] = [['user', 'learner-secret-for-tests'], ['admin', 'admin-secret-for-tests']];
const bearer = (payload: object, secret: string) => ({ headers: { authorization: `Bearer ${jwt.sign(payload, { secret })}` }, ip: '10.0.0.1' });

/** Behind Render's proxy every learner had the same req.ip, so one learner's requests used up everyone's limits. */
describe('rate limits are tracked per account', () => {
  it('two learners behind the same proxy address get separate buckets', () => {
    expect(trackerFor(bearer({ sub: 'learner-a' }, secrets[0][1]), secrets)).toBe('user:learner-a');
    expect(trackerFor(bearer({ sub: 'learner-b' }, secrets[0][1]), secrets)).toBe('user:learner-b');
  });
  it('admin tokens are tracked separately from learners', () => {
    expect(trackerFor(bearer({ sub: 'adm-1' }, secrets[1][1]), secrets)).toBe('admin:adm-1');
  });
  it('a forged, expired or missing token falls back to the IP (no fresh bucket for forgeries)', () => {
    expect(trackerFor(bearer({ sub: 'learner-a' }, 'attacker-secret'), secrets)).toBe('ip:10.0.0.1');
    expect(trackerFor(bearer({ sub: 'learner-a', exp: Math.floor(Date.now() / 1000) - 10 }, secrets[0][1]), secrets)).toBe('ip:10.0.0.1');
    expect(trackerFor({ headers: {}, ip: '10.0.0.2' }, secrets)).toBe('ip:10.0.0.2');
  });
  it('a 429 carries a standard Retry-After header and a body the app can act on', async () => {
    const guard = Object.create(UserAwareThrottlerGuard.prototype) as UserAwareThrottlerGuard;
    const headers: Record<string, string> = {};
    const ctx: any = { switchToHttp: () => ({ getResponse: () => ({ header: (k: string, v: string) => (headers[k] = v) }) }) };
    const err = await (guard as any).throwThrottlingException(ctx, { timeToBlockExpire: 1.2, timeToExpire: 2 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(headers['Retry-After']).toBe('2');
    expect((err as HttpException).getResponse()).toMatchObject({ statusCode: 429, code: 'RATE_LIMITED', retryAfterSeconds: 2 });
  });
});

describe('trust proxy', () => {
  it.each([
    [{ RENDER: 'true' }, 1],
    [{}, false],
    [{ TRUST_PROXY: '2' }, 2],
    [{ TRUST_PROXY: 'false', RENDER: 'true' }, false],
    [{ TRUST_PROXY: 'true' }, 1],
  ])('%o → %s', (env, expected) => expect(trustProxySetting(env)).toBe(expected));
});

describe('the AI service learns which learner is asking', () => {
  it('the request context carries the learner id into the AI HTTP client', async () => {
    expect(currentUserId()).toBeUndefined();
    const client = getAiHttpClient();
    const handlers = (client.interceptors.request as any).handlers.filter(Boolean);
    const apply = async () => {
      let config: any = { headers: new (await import('axios')).AxiosHeaders() };
      for (const h of handlers) config = await h.fulfilled(config);
      return config.headers.get(AI_USER_HEADER);
    };
    expect(await runWithUser('learner-a', apply)).toBe('learner-a');
    expect(await apply()).toBeUndefined();
  });
});

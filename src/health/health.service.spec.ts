import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { HealthService } from './health.service.js';

/** GET /health/ai: a real reachability check of the AI service's root (no inference), against a local server. */
let server: http.Server;
let base = '';
let hits: http.IncomingHttpHeaders[] = [];
let reply: (res: http.ServerResponse) => void;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hits.push(req.headers);
    reply(res);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const saved = { ...process.env };
beforeEach(() => {
  hits = [];
  reply = (res) => res.end('{"status":"operational"}');
  process.env.AI_SERVICE_URL = base;
  process.env.AI_API_KEY = 'unit-test-ai-key';
  delete process.env.AI_HEALTH_TIMEOUT_MS;
});
afterEach(() => {
  process.env = { ...saved };
});

const service = () => new HealthService({} as never);

describe('HealthService.checkAi', () => {
  it('reports up with the latency, without sending the AI key or exposing the URL', async () => {
    const res = await service().checkAi();
    expect(res).toMatchObject({ status: 'up', provider: 'AI Service' });
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(hits).toHaveLength(1);
    expect(hits[0].authorization).toBeUndefined();
    expect(hits[0]['x-api-key']).toBeUndefined();
    expect(JSON.stringify(res)).not.toContain(base);
  });

  it('reports down when the AI service is not running (a category, not the raw error)', async () => {
    const dead = http.createServer();
    await new Promise<void>((r) => dead.listen(0, '127.0.0.1', r));
    const port = (dead.address() as AddressInfo).port;
    await new Promise<void>((r) => dead.close(() => r()));
    process.env.AI_SERVICE_URL = `http://127.0.0.1:${port}`;
    const res = await service().checkAi();
    expect(res).toMatchObject({ status: 'down', error: 'connection_refused' });
    expect(JSON.stringify(res)).not.toContain(String(port));
  });

  it('gives up quickly when the AI service hangs (bounded timeout)', async () => {
    process.env.AI_HEALTH_TIMEOUT_MS = '200';
    reply = (res) => setTimeout(() => res.end('{}'), 2000);
    const started = Date.now();
    const res = await service().checkAi();
    expect(res).toMatchObject({ status: 'down', error: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it('a server error is down; a rate-limited answer still means it is running', async () => {
    reply = (res) => {
      res.statusCode = 502;
      res.end();
    };
    expect(await service().checkAi()).toMatchObject({ status: 'down', error: 'http_502' });
    reply = (res) => {
      res.statusCode = 429;
      res.end();
    };
    expect(await service().checkAi()).toMatchObject({ status: 'up' });
  });

  it('reuses a recent result and runs one check at a time (the route is public)', async () => {
    const s = service();
    const [a, b] = await Promise.all([s.checkAi(), s.checkAi()]);
    const c = await s.checkAi();
    expect(a).toBe(b);
    expect(c).toBe(a);
    expect(hits).toHaveLength(1);
  });
});

import { getAiHttpClient, DEFAULT_AI_SERVICE_URL, DEFAULT_AI_HTTP_TIMEOUT_MS } from './ai-http.client.js';

describe('getAiHttpClient', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('sends the shared key as both Bearer and X-API-Key, with a timeout', () => {
    process.env.AI_SERVICE_URL = 'http://ai.local:8000/';
    process.env.AI_API_KEY = 'unit-test-key';
    process.env.AI_HTTP_TIMEOUT_MS = '5000';
    const client = getAiHttpClient();
    expect(client.defaults.baseURL).toBe('http://ai.local:8000');
    expect(client.defaults.timeout).toBe(5000);
    expect(client.defaults.headers['Authorization']).toBe('Bearer unit-test-key');
    expect(client.defaults.headers['X-API-Key']).toBe('unit-test-key');
  });

  it('defaults to a local AI service and never uses a hard-coded secret', () => {
    delete process.env.AI_SERVICE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_HTTP_TIMEOUT_MS;
    const client = getAiHttpClient();
    expect(client.defaults.baseURL).toBe(DEFAULT_AI_SERVICE_URL);
    expect(client.defaults.timeout).toBe(DEFAULT_AI_HTTP_TIMEOUT_MS);
    expect(client.defaults.headers['X-API-Key']).toBe('');
    expect(client.defaults.headers['Authorization']).toBe('Bearer ');
  });
});

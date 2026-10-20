// LIVE cross-service contract test: NestJS backend (127.0.0.1:5055) → real FastAPI AI service (127.0.0.1:8765)
// → mock NIM (127.0.0.1:8799). Proves routing, payloads, service auth, error mapping and timeouts.
// It does NOT prove that real NVIDIA calls work (the provider is mocked). Prints no secrets.
// Usage: node test/live/ai-integration.mjs   (start mock_nim.py, start-ai-service.mjs and start-backend.mjs first)
const BE = 'http://127.0.0.1:5055/api/v1';
const AI = 'http://127.0.0.1:8765';
const NIM = 'http://127.0.0.1:8799';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let failed = 0;
const check = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!cond) failed++; };

async function http(method, url, { token, body, headers = {} } = {}) {
  const started = Date.now();
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, ms: Date.now() - started };
}
const mode = (m) => http('POST', `${NIM}/__mode?m=${m}`);
const stats = async () => (await http('GET', `${NIM}/__stats`)).json;

const stamp = Date.now();
const signup = await http('POST', `${BE}/auth/signup`, { body: { fullName: 'AI Probe', username: `ai_${stamp}`, email: `ai.${stamp}@example.test`, password: 'Ai-Probe-1!', confirmPassword: 'Ai-Probe-1!' } });
const token = signup.json?.accessToken;
check('learner signed up', signup.status === 201 && typeof token === 'string', `status ${signup.status}`);

// ---- service auth on the AI service itself ----
let r = await http('POST', `${AI}/api/v1/ai/explain`, { body: { input: 'x' } });
check('FastAPI without the shared key → 401', r.status === 401, `status ${r.status}`);
r = await http('POST', `${AI}/api/v1/ai/explain`, { body: { input: 'x' }, headers: { Authorization: 'Bearer wrong-key' } });
check('FastAPI with a wrong key → 401', r.status === 401, `status ${r.status}`);

// ---- SSRF protection: even WITH the shared key, the AI service refuses non-storage URLs ----
const KEY = process.env.E2E_AI_KEY || 'e2e-internal-key-not-a-secret';
for (const url of ['https://169.254.169.254/latest/meta-data/', 'http://res.cloudinary.com/demo/doc.pdf', 'https://example.org/doc.pdf']) {
  r = await http('POST', `${AI}/api/v1/ai/documents/f1/generate-summary`, { body: { fileId: 'f1', fileUrl: url, options: {} }, headers: { Authorization: `Bearer ${KEY}` } });
  check(`AI service refuses document URL ${url} → 400`, r.status === 400 && /allowed storage location/.test(r.text), `status ${r.status}`);
}

// ---- happy path through all three services ----
await mode('ok');
const before = (await stats()).requests;
await sleep(2200);
r = await http('POST', `${BE}/ai/explain`, { token, body: { input: 'Explain photosynthesis', context: { subject: 'Biology', level: 'SS 2' } } });
const after = await stats();
check('learner → NestJS /ai/explain → FastAPI → NIM → 2xx', r.status < 300, `status ${r.status} in ${r.ms} ms`);
check('the generated text comes back to the learner', r.text.includes('MOCK-NIM: photosynthesis'), r.text.slice(0, 120));
check('exactly one provider call, with the configured model and a bearer key', after.requests === before + 1 && after.lastModel === 'mock-model' && after.lastHadAuth, JSON.stringify({ calls: after.requests - before, model: after.lastModel }));
await sleep(2200);
r = await http('POST', `${BE}/ai/explain`, { body: { input: 'x' } });
check('NestJS AI route without a learner token → 401 (no provider call)', r.status === 401 && (await stats()).requests === after.requests, `status ${r.status}`);

// ---- provider failure ----
await mode('error');
await sleep(2200);
r = await http('POST', `${BE}/ai/explain`, { token, body: { input: 'x' } });
check('provider error → backend 5xx (502/503), not a hang', r.status >= 500 && r.status < 600 && r.ms < 15000, `status ${r.status} in ${r.ms} ms`);
check('error body does not leak provider internals', !/mock provider failure|Traceback|api[_-]?key/i.test(r.text), r.text.slice(0, 160));

// ---- provider timeout (mock sleeps 5 s; AI service NVIDIA_TIMEOUT_SECONDS=3, no retries) ----
await mode('slow');
await sleep(2200);
r = await http('POST', `${BE}/ai/explain`, { token, body: { input: 'x' } });
check('slow provider → bounded failure (≈3 s timeout), not a hang', r.status >= 500 && r.ms < 12000, `status ${r.status} in ${r.ms} ms`);

// ---- empty provider answer ----
await mode('empty');
await sleep(2200);
r = await http('POST', `${BE}/ai/explain`, { token, body: { input: 'x' } });
check('empty provider answer is returned as empty, not fabricated', r.status < 600 && !r.text.includes('MOCK-NIM'), `status ${r.status}: ${r.text.slice(0, 120)}`);
await mode('ok');

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);

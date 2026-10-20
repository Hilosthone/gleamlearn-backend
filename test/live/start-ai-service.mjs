// Starts the REAL FastAPI AI service (gleamlearn-ai-service) for e2e contract runs, pointed at the local mock NIM.
// Overrides (process env wins over the AI service's .env, because load_dotenv does not override):
//   AI_API_KEY      → the same test-only key the e2e backend uses (never the real key)
//   NVIDIA_API_KEY  → a dummy value; NVIDIA_BASE_URL → test/live/mock_nim.py on 127.0.0.1:8799
//   NVIDIA_MODEL    → "mock-model"; NVIDIA_TIMEOUT_SECONDS → 3 (so the "slow" mode exercises the timeout path)
// No request can reach NVIDIA. Usage: node test/live/start-ai-service.mjs <ai-service repo> [logfile]
import fs from 'fs';
import { spawn } from 'child_process';

const [repo, logFile] = process.argv.slice(2);
if (!repo || !fs.existsSync(`${repo}/main.py`)) { console.log('usage: start-ai-service.mjs <ai-service repo> [logfile]'); process.exit(2); }
const overrides = {
  AI_API_KEY: process.env.E2E_AI_KEY || 'e2e-internal-key-not-a-secret',
  NVIDIA_API_KEY: 'e2e-dummy-nvidia-key',
  NVIDIA_BASE_URL: process.env.E2E_NIM_URL || 'http://127.0.0.1:8799/v1',
  NVIDIA_MODEL: 'mock-model',
  NVIDIA_TIMEOUT_SECONDS: process.env.E2E_NIM_TIMEOUT || '3',
  NVIDIA_MAX_RETRIES: '0',
};
const child = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', process.env.E2E_AI_PORT || '8765'], {
  cwd: repo,
  env: { ...process.env, ...overrides },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const log = fs.createWriteStream(logFile || (process.env.TEMP || '/tmp') + '/gleamlearn-e2e-ai.log');
child.stdout.pipe(log);
child.stderr.pipe(log);
child.on('exit', (code) => { log.write(`\n[exit ${code}]\n`); process.exit(code ?? 0); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill());

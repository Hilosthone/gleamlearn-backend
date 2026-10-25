// src/common/security/cors.ts
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * CORS for browser clients. The API uses Bearer tokens (no cookies), so CORS is not a CSRF control here; an
 * allowlist still stops other websites from calling the API from a learner's browser.
 *
 *   CORS_ORIGINS unset  → every origin allowed (the behaviour before this option existed; unchanged by default)
 *   CORS_ORIGINS=a,b    → only these exact origins (scheme + host + optional port, no path, no trailing slash)
 *
 * Recommended production value (the only deployed frontend): https://gleamlearn.vercel.app
 * Add http://localhost:3000 only on development backends. Requests without an Origin header (server-to-server,
 * curl, the AI service) are not affected by CORS.
 */
export function corsOptionsFromEnv(raw: string | undefined): CorsOptions {
  const origins = (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (origins.length === 0) return {};
  const allowed = new Set(origins);
  return {
    origin: (origin, callback) => callback(null, !origin || allowed.has(origin)),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  };
}

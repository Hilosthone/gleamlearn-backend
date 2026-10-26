/**
 * Express `trust proxy` setting.
 *
 *   TRUST_PROXY=false|0      → off (req.ip is the direct peer)
 *   TRUST_PROXY=<n>          → trust n proxy hops (Render: 1)
 *   unset, RENDER=true       → 1 (Render sets RENDER=true on every service; its load balancer is one hop)
 *   unset, anywhere else     → off: without a proxy, trusting X-Forwarded-For would let clients choose their IP
 */
export function trustProxySetting(env: Record<string, string | undefined>): number | false {
  const raw = env.TRUST_PROXY?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw && /^\d+$/.test(raw)) return Math.min(Number(raw), 5);
  if (raw === 'true') return 1;
  return env.RENDER === 'true' ? 1 : false;
}

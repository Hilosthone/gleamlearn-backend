import { corsOptionsFromEnv } from './cors.js';

function allows(options: ReturnType<typeof corsOptionsFromEnv>, origin: string | undefined): boolean {
  let result = false;
  (options.origin as (o: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => void)(origin, (_e, ok) => {
    result = Boolean(ok);
  });
  return result;
}

describe('corsOptionsFromEnv', () => {
  it('unset or empty keeps the previous behaviour (Nest default: every origin)', () => {
    expect(corsOptionsFromEnv(undefined)).toEqual({ exposedHeaders: ['Retry-After'] });
    expect(corsOptionsFromEnv(' , ')).toEqual({ exposedHeaders: ['Retry-After'] });
  });

  it('allows only the listed exact origins (trailing slashes ignored)', () => {
    const options = corsOptionsFromEnv('https://gleamlearn.vercel.app/, http://localhost:3000');
    expect(allows(options, 'https://gleamlearn.vercel.app')).toBe(true);
    expect(allows(options, 'http://localhost:3000')).toBe(true);
    expect(allows(options, 'https://evil.example')).toBe(false);
    expect(allows(options, 'https://gleamlearn.vercel.app.evil.example')).toBe(false);
    expect(allows(options, 'https://gleamlearn-git-branch-someone.vercel.app')).toBe(false);
  });

  it('requests without an Origin header (server-to-server) are not blocked', () => {
    expect(allows(corsOptionsFromEnv('https://gleamlearn.vercel.app'), undefined)).toBe(true);
  });
});

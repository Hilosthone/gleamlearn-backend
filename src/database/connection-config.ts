/**
 * Which PostgreSQL database the backend connects to, from environment variables. Used by AppModule (TypeORM).
 *
 * The migration runner (scripts/db/migrator.mjs, plain Node so it runs without a build) resolves the target with the
 * same rules; src/database/connection-config.spec.ts checks that both agree, so a migration is applied to the same
 * database the API uses.
 *
 * Rules (unchanged from the previous inline AppModule configuration):
 *   - DATABASE_URL is used only when it points at Supabase ("supabase.co" in the URL), with TLS
 *     (rejectUnauthorized: false, as before);
 *   - otherwise DATABASE_HOST / DATABASE_PORT / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME, with local defaults;
 *   - schema auto-sync only when DB_SYNCHRONIZE=true. It must stay off for shared and production databases: schema
 *     changes go through database/migrations (see database/README.md).
 */
export type EnvGetter = (name: string) => string | undefined;

export interface PostgresConnectionConfig {
  type: 'postgres';
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl?: { rejectUnauthorized: boolean };
  autoLoadEntities: true;
  synchronize: boolean;
}

export function typeOrmConnectionConfig(get: EnvGetter): PostgresConnectionConfig {
  const databaseUrl = get('DATABASE_URL');
  const synchronize = (get('DB_SYNCHRONIZE') ?? 'false').toLowerCase() === 'true';

  if (databaseUrl && databaseUrl.includes('supabase.co')) {
    return { type: 'postgres', url: databaseUrl, autoLoadEntities: true, synchronize, ssl: { rejectUnauthorized: false } };
  }
  return {
    type: 'postgres',
    host: get('DATABASE_HOST') ?? 'localhost',
    port: parseInt(get('DATABASE_PORT') ?? '5432', 10),
    username: get('DATABASE_USER') ?? 'postgres',
    password: get('DATABASE_PASSWORD') ?? 'postgres',
    database: get('DATABASE_NAME') ?? 'mycoursea_db',
    autoLoadEntities: true,
    synchronize,
  };
}

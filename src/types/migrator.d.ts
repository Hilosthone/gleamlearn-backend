declare module '../../scripts/db/migrator.mjs' {
  export const HISTORY: string;
  export const LOCK_KEY: string;
  export const FILE_PATTERN: RegExp;
  export const TARGET_VARS: string[];
  
  export class MigrationError extends Error {}
  
  export function loadEnvironment(options: any): Record<string, string | undefined>;
  export function resolveTarget(env: any, options?: { strict?: boolean }): any;
  export function describeTarget(target: any): string;
  export function confirmationFor(target: any): string;
  export function assertConnectedTarget(client: any, target: any): Promise<void>;
  export function checksum(text: string): string;
  export function parseMigrationSql(sql: string, file?: string): any[];
  export function discoverMigrations(dir: string): any[];
  export function newMigrationFileName(rawName: string, now?: Date): string;
  export function MIGRATION_TEMPLATE(file: string): string;
  export function loadPinnedSnapshot(m: any): any;
  export function status(client: any, migrations: any[]): Promise<any>;
  export function summarise(migrations: any[], history: any[]): any;
  export function describeSqlError(err: any, sql: string, statement: any): string;
  export function run(client: any, migrations: any[], options?: any): Promise<any>;
  export function baseline(client: any, migrations: any[], version: string, options?: any): Promise<any>;
}
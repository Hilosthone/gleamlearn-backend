// src/health/schema-report.service.ts
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * READ-ONLY startup report: compares the tables the TypeORM entities expect with the tables that exist in
 * the connected database, and logs any that are missing (table names only — never connection details or data).
 *
 * Why: there are no migrations and synchronize is off, so a missing table (production 2026-10-20: "users")
 * only surfaced as HTTP 500s on the routes that use it. This makes the cause visible in the deploy log.
 * It never creates, alters or drops anything, and a failure here never stops the application.
 */
@Injectable()
export class SchemaReportService implements OnApplicationBootstrap {
  private readonly logger = new Logger('SchemaReport');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const report = await this.check();
      if (report.missing.length === 0) {
        this.logger.log(`Database schema check: all ${report.expected} entity tables are present.`);
      } else {
        this.logger.error(
          `Database schema check: ${report.missing.length} of ${report.expected} entity tables are MISSING: ${report.missing.join(', ')}. ` +
            'Routes using them will fail. See docs/DATABASE.md and docs/PRODUCTION_RECOVERY.md (no automatic changes are made).',
        );
      }
    } catch (error) {
      this.logger.warn(`Database schema check could not run: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /** Expected = entity table names (schema-qualified when an entity declares one); existing = catalog lookup. */
  async check(): Promise<{ expected: number; missing: string[] }> {
    const expected = [
      ...new Set(
        this.dataSource.entityMetadatas
          .filter((m) => m.tableType !== 'view')
          .map((m) => (m.schema ? `${m.schema}.${m.tableName}` : m.tableName)),
      ),
    ].sort();
    const rows: Array<{ schema: string; name: string; on_path: boolean }> = await this.dataSource.query(
      `SELECT n.nspname AS schema, c.relname AS name, n.nspname = ANY (current_schemas(false)) AS on_path
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relkind IN ('r', 'p') AND c.relname = ANY ($1)`,
      [expected.map((t) => t.split('.').pop())],
    );
    const exists = (table: string) => {
      const [schema, name] = table.includes('.') ? table.split('.') : [null, table];
      return rows.some((r) => r.name === name && (schema ? r.schema === schema : r.on_path));
    };
    return { expected: expected.length, missing: expected.filter((t) => !exists(t)) };
  }
}

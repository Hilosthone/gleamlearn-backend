// src/auth/account-status.service.ts
import { ForbiddenException, Injectable, Logger, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Single source of truth for learner account status (sign-in and every authenticated request).
 *
 * WHY RAW SQL: two TypeORM entities map the same `users` table (audit item B2). The entity used by
 * authentication (src/auth/entities/user.entity.ts) declares `is_restricted` but NOT `isFrozen` or
 * `deletedAt` (those come from src/users/users.entity.ts). Adding them to the auth entity would break
 * every auth query on a database where those columns do not exist. Instead, this service detects at
 * startup which status columns exist and reads/writes only those. No migration is required.
 */
export type AccountState = 'active' | 'frozen' | 'restricted' | 'deleted' | 'missing';

export interface AccountStatus {
  exists: boolean;
  restricted: boolean;
  restrictionReason: string | null;
  frozen: boolean;
  deleted: boolean;
  role: string | null;
}

export const ACCOUNT_RESTRICTED_MESSAGE = 'This account has been restricted. Please contact support.';
export const ACCOUNT_FROZEN_MESSAGE = 'This account is frozen. Unfreeze it to continue.';

// Fixed column names (never user input). Keys are logical names.
const COLUMNS = {
  restricted: 'is_restricted',
  restrictionReason: 'restriction_reason',
  frozen: 'isFrozen',
  deleted: 'deletedAt',
  role: 'role',
} as const;

type LogicalColumn = keyof typeof COLUMNS;

@Injectable()
export class AccountStatusService implements OnModuleInit {
  private readonly logger = new Logger('AccountStatus');
  private available: Set<LogicalColumn> | null = null;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.detectColumns();
  }

  /** Detects which status columns exist on `users`. Logs (names only) what cannot be enforced. */
  async detectColumns(): Promise<Set<LogicalColumn>> {
    try {
      const rows: Array<{ column_name: string }> = await this.dataSource.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = current_schema()`,
      );
      const present = new Set(rows.map((r) => r.column_name));
      this.available = new Set(
        (Object.keys(COLUMNS) as LogicalColumn[]).filter((key) => present.has(COLUMNS[key])),
      );
      const missing = (Object.keys(COLUMNS) as LogicalColumn[]).filter((k) => !this.available!.has(k));
      if (missing.length) {
        this.logger.warn(
          `users columns not found, so these states cannot be enforced: ${missing.map((k) => COLUMNS[k]).join(', ')}`,
        );
      }
    } catch {
      this.available = null; // retried lazily on next use
      this.logger.error('Could not inspect the users table; account status checks will retry.');
    }
    return this.available ?? new Set();
  }

  private async columns(): Promise<Set<LogicalColumn>> {
    return this.available ?? (await this.detectColumns());
  }

  supports(column: LogicalColumn): boolean {
    return Boolean(this.available?.has(column));
  }

  async getStatus(userId: string): Promise<AccountStatus> {
    const cols = await this.columns();
    const select = ['"id"', ...[...cols].map((k) => `"${COLUMNS[k]}" AS "${k}"`)].join(', ');
    const rows: any[] = await this.dataSource.query(`SELECT ${select} FROM "users" WHERE "id" = $1 LIMIT 1`, [userId]);
    const row = rows[0];
    if (!row) {
      return { exists: false, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: null };
    }
    return {
      exists: true,
      restricted: row.restricted === true,
      restrictionReason: row.restrictionReason ?? null,
      frozen: row.frozen === true,
      deleted: row.deleted !== null && row.deleted !== undefined,
      role: row.role ?? null,
    };
  }

  static stateOf(status: AccountStatus): AccountState {
    if (!status.exists) return 'missing';
    if (status.deleted) return 'deleted';
    if (status.restricted) return 'restricted';
    if (status.frozen) return 'frozen';
    return 'active';
  }

  /**
   * Throws the response for a state that may not proceed.
   * deleted/missing → 401 (indistinguishable from bad credentials); restricted → 403;
   * frozen → 403 unless `allowFrozen` (sign-in, own profile, unfreeze, logout).
   */
  static assertAllowed(status: AccountStatus, options: { allowFrozen: boolean; unauthorizedMessage: string }) {
    const state = AccountStatusService.stateOf(status);
    if (state === 'missing' || state === 'deleted') throw new UnauthorizedException(options.unauthorizedMessage);
    if (state === 'restricted') throw new ForbiddenException({ statusCode: 403, code: 'ACCOUNT_RESTRICTED', message: ACCOUNT_RESTRICTED_MESSAGE });
    if (state === 'frozen' && !options.allowFrozen) {
      throw new ForbiddenException({ statusCode: 403, code: 'ACCOUNT_FROZEN', message: ACCOUNT_FROZEN_MESSAGE });
    }
  }

  private async requireColumn(column: LogicalColumn) {
    const cols = await this.columns();
    if (!cols.has(column)) {
      throw new ServiceUnavailableException(`This account action is unavailable: the ${COLUMNS[column]} column does not exist.`);
    }
  }

  /** Returns the number of rows changed (0 when the user does not exist). */
  async setRestricted(userId: string, restricted: boolean, reason: string | null): Promise<number> {
    await this.requireColumn('restricted');
    const withReason = (await this.columns()).has('restrictionReason');
    const sql = withReason
      ? `UPDATE "users" SET "is_restricted" = $2, "restriction_reason" = $3 WHERE "id" = $1`
      : `UPDATE "users" SET "is_restricted" = $2 WHERE "id" = $1`;
    const params = withReason ? [userId, restricted, restricted ? reason : null] : [userId, restricted];
    return this.affected(await this.dataSource.query(sql, params));
  }

  async setFrozen(userId: string, frozen: boolean): Promise<number> {
    await this.requireColumn('frozen');
    return this.affected(await this.dataSource.query(`UPDATE "users" SET "isFrozen" = $2 WHERE "id" = $1`, [userId, frozen]));
  }

  /** Soft delete: sets deletedAt (and freezes, when supported). Data is retained. */
  async softDelete(userId: string): Promise<number> {
    await this.requireColumn('deleted');
    const freeze = (await this.columns()).has('frozen');
    const sql = freeze
      ? `UPDATE "users" SET "deletedAt" = now(), "isFrozen" = true WHERE "id" = $1 AND "deletedAt" IS NULL`
      : `UPDATE "users" SET "deletedAt" = now() WHERE "id" = $1 AND "deletedAt" IS NULL`;
    return this.affected(await this.dataSource.query(sql, [userId]));
  }

  private affected(result: unknown): number {
    // pg driver via TypeORM returns [rows, affectedCount] for UPDATE
    if (Array.isArray(result) && typeof result[1] === 'number') return result[1];
    return 0;
  }
}

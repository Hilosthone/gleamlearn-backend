-- 20261102090000_streak_recovery_and_engagement_rewards.sql
-- What this changes and why:
--   Streak recovery and engagement rewards. Purely additive: three new tables; no existing table is altered and no
--   existing row is touched.
--
--   streak_recoveries   One row per recovered calendar day (the audit trail). The monthly allowance (4 per calendar
--                       month in the app time zone) is COUNTED from these rows, so there is no counter to tamper with,
--                       and the unique key means a missed day can never be recovered twice. user_streaks.recoveryTokens
--                       is left in place but no longer used.
--   engagement_rewards  One row per granted engagement reward ("daily_visit" for a day, "active_time" for a day and
--                       10-minute block). The unique key is the idempotency guard: the matching XP and coin rows are
--                       written to the existing xp_transactions / coin_transactions ledgers in the SAME transaction,
--                       only when this row is inserted. There is no second XP or coin balance.
--   engagement_days     Per learner and day: active seconds credited from heartbeats and when the last one arrived.
--
--   Column types follow the tables they relate to: streak tables keep "userId" as varchar; user_id here is varchar
--   for streak_recoveries (joins streak_history / user_streaks) and uuid for the reward tables (like the ledgers).
--   No foreign keys to "users", as for the other learner tables (ownership comes from the signed-in token).
--
-- Rules (database/README.md): one transaction; never edit after it is applied anywhere shared; committing this
-- file does NOT apply it to production.

CREATE TABLE "streak_recoveries" (
  "id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       varchar      NOT NULL,
  "missed_date"   date         NOT NULL,
  "recovered_on"  date         NOT NULL,
  "month_key"     char(7)      NOT NULL,
  "streak_before" integer      NOT NULL DEFAULT 0,
  "created_at"    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_streak_recoveries_day" UNIQUE ("user_id", "missed_date"),
  CONSTRAINT "CHK_streak_recoveries_order" CHECK ("missed_date" < "recovered_on"),
  CONSTRAINT "CHK_streak_recoveries_month" CHECK ("month_key" ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT "CHK_streak_recoveries_before" CHECK ("streak_before" >= 0)
);
CREATE INDEX "IDX_streak_recoveries_month" ON "streak_recoveries" ("user_id", "month_key");

CREATE TABLE "engagement_rewards" (
  "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid         NOT NULL,
  "kind"        varchar(20)  NOT NULL,
  "period_key"  varchar(20)  NOT NULL,
  "xp"          integer      NOT NULL,
  "coins"       integer      NOT NULL,
  "created_at"  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_engagement_rewards_period" UNIQUE ("user_id", "kind", "period_key"),
  CONSTRAINT "CHK_engagement_rewards_kind" CHECK ("kind" IN ('daily_visit', 'active_time')),
  CONSTRAINT "CHK_engagement_rewards_amounts" CHECK ("xp" >= 0 AND "coins" >= 0)
);
CREATE INDEX "IDX_engagement_rewards_user" ON "engagement_rewards" ("user_id", "created_at" DESC);

CREATE TABLE "engagement_days" (
  "user_id"            uuid         NOT NULL,
  "day"                date         NOT NULL,
  "active_seconds"     integer      NOT NULL DEFAULT 0,
  "rewarded_blocks"    integer      NOT NULL DEFAULT 0,
  "last_heartbeat_at"  timestamptz  NULL,
  "updated_at"         timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "day"),
  CONSTRAINT "CHK_engagement_days_seconds" CHECK ("active_seconds" >= 0 AND "active_seconds" <= 86400),
  CONSTRAINT "CHK_engagement_days_blocks" CHECK ("rewarded_blocks" >= 0 AND "rewarded_blocks" <= 144)
);

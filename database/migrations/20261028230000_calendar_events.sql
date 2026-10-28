-- 20261028230000_calendar_events.sql
-- What this changes and why:
--   The calendar (GET /calendar, /calendar/month|week|day, POST/PATCH/DELETE /calendar/events) used a Prisma model
--   whose table never existed anywhere (docs/DATABASE.md: "calendar_events is missing even locally"; production
--   confirmed missing on 2026-10-23), so every route answered 501. The calendar now uses TypeORM
--   (src/calendar/calendar-event.entity.ts) and this creates its table. Purely additive.
--   * Column names follow the old Prisma model (snake_case).
--   * No foreign key to "users": ownership is enforced by every query filtering on user_id from the signed-in token
--     (the same approach as the learner-content tables).
--   * An event cannot end before it starts.
--
-- Rules (database/README.md): one transaction; never edit after it is applied anywhere shared; committing this
-- file does NOT apply it to production.

CREATE TABLE "calendar_events" (
  "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid         NOT NULL,
  "title"       varchar(200) NOT NULL,
  "description" text         NULL,
  "start_time"  timestamptz  NOT NULL,
  "end_time"    timestamptz  NOT NULL,
  "is_all_day"  boolean      NOT NULL DEFAULT false,
  "created_at"  timestamptz  NOT NULL DEFAULT now(),
  "updated_at"  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_calendar_events_range" CHECK ("end_time" >= "start_time")
);

CREATE INDEX "IDX_calendar_events_user_start" ON "calendar_events" ("user_id", "start_time");

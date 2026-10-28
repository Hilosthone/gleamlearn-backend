-- 20261029090000_learner_feedback.sql
-- What this changes and why:
--   POST /feedback (a star rating plus a message from Help & Support) used a Prisma "feedback" model whose table never
--   existed, so it answered 501 and the app could only offer an email link. Feedback now uses TypeORM
--   (src/reports/learner-feedback.entity.ts) and this creates its table. Purely additive.
--   * Problem reports (POST /reports, /questions/:id/report, /content/:id/report) need no new table: they are stored
--     in the existing "admin_reports" table that the admin moderation routes already read.
--   * No foreign key to "users": ownership comes from the signed-in token (the same approach as the learner tables).
--   * Ratings are 1..5; a message is required and capped at 4000 characters (the API validates the same).
--
-- Rules (database/README.md): one transaction; never edit after it is applied anywhere shared; committing this
-- file does NOT apply it to production.

CREATE TABLE "learner_feedback" (
  "id"        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid        NOT NULL,
  "rating"    smallint    NOT NULL,
  "message"   text        NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_learner_feedback_rating" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "CHK_learner_feedback_message" CHECK (char_length("message") BETWEEN 1 AND 4000)
);

CREATE INDEX "IDX_learner_feedback_created" ON "learner_feedback" ("createdAt");

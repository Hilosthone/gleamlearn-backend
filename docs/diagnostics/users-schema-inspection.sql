-- =====================================================================================
-- READ-ONLY schema DISCOVERY for the GleamLearn backend (revision 2, 2026-10-20)
-- =====================================================================================
-- Revision 1 assumed public.users exists and failed in Supabase with 42P01 (it does not).
-- This revision NEVER reads an application table directly: every statement queries only the
-- system catalogs (pg_catalog / information_schema), so it runs even if tables are missing.
--
-- Safe: SELECTs on catalogs inside a READ ONLY transaction, then ROLLBACK. Nothing is created,
-- changed or deleted. No user rows, emails, names or secrets are read. Row counts are the
-- planner's ESTIMATES from pg_class.reltuples (no table is scanned).
--
-- Run: Supabase → SQL Editor → New query → paste → Run (or run sections one by one).
--      Locally: pgAdmin → mycoursea_db → Query Tool → paste → F5 (same file, for comparison).
-- =====================================================================================

BEGIN READ ONLY;

-- D1. Session identity (no secrets): which database / role / search_path this session uses.
--     The backend's TypeORM sets NO schema, so it uses the first existing schema in ITS search_path.
SELECT current_database() AS database, current_user AS role, current_setting('search_path') AS search_path,
       split_part(version(), ' ', 2) AS postgres_version;

-- D2. Non-system schemas and how many tables each holds (where did the app's tables go?)
SELECT n.nspname AS schema, count(c.oid) FILTER (WHERE c.relkind IN ('r','p')) AS tables
FROM pg_namespace n LEFT JOIN pg_class c ON c.relnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname NOT LIKE 'pg_temp%' AND n.nspname NOT LIKE 'pg_toast_temp%'
GROUP BY n.nspname ORDER BY tables DESC, schema;

-- D3. Every table whose name contains user / account / admin / learner / student / profile, in ANY schema.
--     (auth.users is Supabase Auth's own table and is listed only for orientation.)
SELECT n.nspname AS schema, c.relname AS table, c.reltuples::bigint AS estimated_rows,
       pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p','v','m')
  AND c.relname ~* '(user|account|admin|learner|student|profile)'
  AND n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY n.nspname, c.relname;

-- D4. The 62 tables the backend code expects (61 TypeORM @Entity names + Prisma calendar_events; Prisma
--     "users" is the same table), and where
--     each one exists. Many MISSING = wrong database/project; only "users" missing = that table is gone.
WITH expected(table_name) AS (VALUES
  ('achievements'),('admin_activity_logs'),('admin_ai_generated_content'),('admin_courses'),('admin_dashboard_metrics'),
  ('admin_notifications'),('admin_performance_metrics'),('admin_questions'),('admin_reports'),('admin_user_actions'),
  ('admins'),('ai_companions'),('ai_conversations'),('ai_generated_contents'),('ai_messages'),('badges'),
  ('calendar_events'),('coin_transactions'),('courses'),('decks'),('departments'),('enrollments'),('exam_preps'),
  ('examinations'),('exams'),('faculties'),('files'),('flashcards'),('institutions'),('lesson_progress'),('lessons'),
  ('library_favorites'),('library_saved_courses'),('notes'),('notification_settings'),('notifications'),
  ('past_questions'),('permissions'),('push_tokens'),('questions'),('quizzes'),('roles'),('security_events'),
  ('streak_history'),('study_goals'),('study_plan_items'),('study_sessions'),('subscriptions'),('system_settings'),
  ('tests'),('topic_masteries'),('topics'),('tutor_messages'),('tutor_sessions'),('user_achievements'),
  ('user_badges'),('user_performances'),('user_progress'),('user_streaks'),('users'),('xp_transactions'),
  ('youtube_resources'))
SELECT e.table_name,
       COALESCE(string_agg(n.nspname, ', ' ORDER BY n.nspname) FILTER (WHERE n.nspname <> 'auth'), 'MISSING') AS found_in_schema
FROM expected e
LEFT JOIN pg_class c ON c.relname = e.table_name AND c.relkind IN ('r','p')
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
GROUP BY e.table_name
ORDER BY (COALESCE(string_agg(n.nspname, ', ') FILTER (WHERE n.nspname <> 'auth'), 'MISSING') = 'MISSING') DESC, e.table_name;

-- D5. Was users RENAMED or moved? Any table (outside Supabase's auth schema) that has the learner-account
--     signature columns "email" AND "passwordHash" (column names only).
SELECT table_schema, table_name, count(*) AS matching_signature_columns
FROM information_schema.columns
WHERE column_name IN ('email','passwordHash','username','fullName') AND table_schema <> 'auth'
GROUP BY table_schema, table_name
HAVING count(*) FILTER (WHERE column_name IN ('email','passwordHash')) = 2
ORDER BY 1, 2;

-- D6. Foreign keys of the tables whose entities reference users (coin_transactions, decks, enrollments,
--     library_saved_courses, user_achievements, user_badges, xp_transactions, library_favorites).
--     RENAMED users  → their FKs point at the new name.  DROPPED users (… CASCADE) → no FK to a users table remains.
SELECT tn.nspname AS schema, t.relname AS table, con.conname AS constraint_name,
       rn.nspname AS references_schema, r.relname AS references_table
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid JOIN pg_namespace tn ON tn.oid = t.relnamespace
JOIN pg_class r ON r.oid = con.confrelid JOIN pg_namespace rn ON rn.oid = r.relnamespace
WHERE con.contype = 'f'
  AND t.relname IN ('coin_transactions','decks','enrollments','library_saved_courses','user_achievements','user_badges','xp_transactions','library_favorites')
ORDER BY 1, 2, 3;

-- D7. Do those dependent tables still have their user id column? (names only)
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('coin_transactions','decks','enrollments','library_saved_courses','user_achievements','user_badges','xp_transactions','library_favorites')
  AND column_name IN ('userId','user_id')
ORDER BY 1, 2;

-- D8. Any migration bookkeeping tables, in any schema (none = the schema came only from TypeORM synchronize)
SELECT n.nspname AS schema, c.relname AS table
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND c.relname IN ('migrations','typeorm_metadata','_prisma_migrations','schema_migrations')
ORDER BY 1, 2;

-- D9. Does any schema have the same name as a database role? ("$user" comes first in search_path, so a role
--     that owns a same-named schema would create/find tables THERE instead of in public.)
SELECT n.nspname AS schema_named_like_a_role
FROM pg_namespace n JOIN pg_roles r ON r.rolname = n.nspname
WHERE n.nspname NOT IN ('pg_catalog','information_schema','public');

ROLLBACK;

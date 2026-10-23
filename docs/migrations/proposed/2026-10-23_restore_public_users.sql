-- =====================================================================================================
-- PROPOSED, NOT EXECUTED. Restores the application's learner table public.users in production (Supabase).
-- Plan and reasoning: docs/PRODUCTION_USERS_TABLE_RECOVERY_PLAN.md. Supersedes 2026-10-20_users_table_recovery.sql
-- (that file's scenario B, refined with the owner's 2026-10-23 Supabase findings).
--
-- Run in the Supabase SQL Editor of the project that Render's DATABASE_URL points to, one PART at a time,
-- only after the owner has approved that PART. Do NOT enable DB_SYNCHRONIZE. Supabase Auth (schema "auth")
-- is not touched by anything in this file.
--
--   PART 0  preflight            read-only     run first, compare with the expected results
--   PART 1  create public.users  writes        approval 1 (required for sign-up / login)
--   PART 2  foreign keys         writes        approval 2 (optional, recommended; independent of PART 1's success path)
--   PART 3  verification         read-only     after PART 1 (and PART 2)
--   PART 4  rollback             writes        only if needed, only while public.users is empty
-- =====================================================================================================


-- =====================================================================================================
-- PART 0 — PREFLIGHT (read-only; changes nothing)
-- =====================================================================================================

-- P1. Which database am I in? Expected: database "postgres", server 17.x, search_path starting with public.
SELECT current_database() AS database, current_user AS role, current_setting('server_version') AS version,
       current_setting('search_path') AS search_path;

-- P2. public.users must still be absent (PART 1 is skipped harmlessly if it exists, but then STOP and report).
--     Expected: users_exists = false. auth_users_exists = true (Supabase Auth; left alone).
SELECT to_regclass('public.users') IS NOT NULL AS users_exists,
       to_regclass('auth.users')   IS NOT NULL AS auth_users_exists,
       to_regclass('public.admins') IS NOT NULL AS admins_exists;

-- P3. Nothing named like the learner table elsewhere (rules out a rename/move). Expected: 0 rows.
SELECT n.nspname AS schema, c.relname AS name, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime', 'supabase_functions',
                        'extensions', 'graphql', 'graphql_public', 'pgsodium', 'pgsodium_masks', 'vault', 'net', 'cron')
  AND (c.relname ILIKE '%user%' AND c.relname NOT IN ('user_achievements', 'user_badges', 'user_streaks', 'user_progress',
       'user_performance', 'user_performances', 'admin_users', 'admin_user_actions'))
ORDER BY 1, 2;

-- P4. gen_random_uuid() is available (built into PostgreSQL 13+). Expected: 1 row, schema pg_catalog.
SELECT n.nspname AS schema, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'gen_random_uuid';

-- P5. The 8 tables that reference users: existence, type of their user column (must be uuid for PART 2),
--     existing FK, and row count. Expected: column_type uuid, has_fk false; rows ideally 0 (no learners yet).
--     If a table is MISSING, PART 2 skips it. If rows > 0 they are orphans: PART 2 still works (NOT VALID),
--     but do not run the optional VALIDATE step.
WITH dep(tbl, col) AS (VALUES
  ('coin_transactions', 'user_id'), ('decks', 'userId'), ('enrollments', 'userId'), ('library_favorites', 'userId'),
  ('library_saved_courses', 'userId'), ('user_achievements', 'userId'), ('user_badges', 'userId'), ('xp_transactions', 'userId'))
SELECT d.tbl,
       to_regclass('public.' || d.tbl) IS NOT NULL AS table_exists,
       (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
         WHERE a.attrelid = to_regclass('public.' || d.tbl) AND a.attname = d.col AND NOT a.attisdropped) AS column_type,
       EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = to_regclass('public.' || d.tbl) AND c.contype = 'f'
                 AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = d.col)]) AS has_fk,
       CASE WHEN to_regclass('public.' || d.tbl) IS NULL THEN NULL
            ELSE (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', d.tbl), false, true, '')))[1]::text::int
       END AS rows
FROM dep d ORDER BY d.tbl;

-- P6. Supabase Data API exposure of the new table: which API roles exist, and what new public tables get by
--     default. Expected: anon / authenticated exist; default privileges usually grant them ALL on new tables.
--     PART 1 therefore revokes them from public.users (it holds password hashes, codes and tokens).
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres') ORDER BY 1;
SELECT pg_get_userbyid(d.defaclrole) AS owner, d.defaclacl
FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public' AND d.defaclobjtype = 'r';

-- P7. For information (no change proposed here): is public.admins readable through the Data API?
--     If anon_select is true and rls_enabled is false, admin password hashes are exposed via the anon key.
SELECT relname, relrowsecurity AS rls_enabled,
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN has_table_privilege('anon', oid, 'SELECT') END AS anon_select
FROM pg_class WHERE oid = to_regclass('public.admins');


-- =====================================================================================================
-- PART 1 — CREATE public.users (approval 1)
-- Structure = the table TypeORM builds from the current code: union of src/auth/entities/user.entity.ts
-- (auth, sign-up, login, /auth/me, admin users) and src/users/users.entity.ts (admin gamification and
-- AccountStatusService: isFrozen, role, deletedAt). Verified 2026-10-23 against the catalog of two local
-- databases built by the app. Constraint names are TypeORM's, so the app's metadata matches.
-- One deliberate difference: id defaults to gen_random_uuid() (built in) instead of uuid_generate_v4()
-- (needs the uuid-ossp extension, which Supabase installs outside "public"). TypeORM treats both as uuid generation.
-- Idempotent: if public.users already exists nothing is created (NOTICE), and the REVOKE is harmless.
-- =====================================================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.users (
  "id"                    uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "fullName"              character varying(150)      NOT NULL,
  "username"              character varying(100)      NOT NULL,
  "email"                 character varying(255)      NOT NULL,
  "passwordHash"          character varying           NOT NULL,
  "dateOfBirth"           character varying,
  "country"               character varying(100),
  "educationType"         character varying,
  "secondarySchool"       character varying,
  "secondaryClass"        character varying,
  "secondaryStream"       character varying,
  "university"            character varying,
  "faculty"               character varying,
  "department"            character varying,
  "courseOfStudy"         character varying,
  "level"                 character varying,
  "examAimOrGoals"        character varying,
  "preferredStudyTime"    character varying,
  "isEmailVerified"       boolean                     NOT NULL DEFAULT false,
  "verification_otp"      character varying(6),
  "otp_expires_at"        timestamp without time zone,
  "refresh_token"         text,
  "is_restricted"         boolean                     NOT NULL DEFAULT false,
  "restriction_reason"    text,
  "created_at"            timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp without time zone NOT NULL DEFAULT now(),
  -- second entity (src/users/users.entity.ts); all nullable or defaulted, so auth inserts never need them
  "institution"           character varying,
  "levelOrClass"          character varying,
  "preferredLearningPace" character varying,
  "academicGoals"         text,
  "isFrozen"              boolean                     NOT NULL DEFAULT false,
  "role"                  character varying           NOT NULL DEFAULT 'student',
  "createdAt"             timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt"             timestamp without time zone NOT NULL DEFAULT now(),
  "deletedAt"             timestamp without time zone,
  CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
  CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")
);

-- Keep the table out of Supabase's Data API (PostgREST). The backend connects with the database role from
-- DATABASE_URL (postgres), which is unaffected. Skipped for roles that do not exist.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.users FROM %I', r);
    END IF;
  END LOOP;
END $$;

COMMIT;


-- =====================================================================================================
-- PART 2 — FOREIGN KEYS from the 8 dependent tables (approval 2; optional, recommended)
-- Matches the entities' @ManyToOne(() => User, { onDelete: 'CASCADE' }). Not needed for sign-up or login.
-- Added NOT VALID: enforced for every new or changed row, existing rows are not checked (none should exist).
-- Idempotent: each FK is added only if its table exists, the column is uuid and no FK exists on that column.
-- =====================================================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  fk record;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'public.users does not exist: run PART 1 first';
  END IF;
  FOR fk IN SELECT * FROM (VALUES
    ('coin_transactions',     'user_id', 'FK_e85b0a5bf336ec85a9c84c1c391'),
    ('decks',                 'userId',  'FK_d60e048034edfd232e0b8cedaeb'),
    ('enrollments',           'userId',  'FK_de33d443c8ae36800c37c58c929'),
    ('library_favorites',     'userId',  'FK_6839f79ea05acf9da28dee3fbb0'),
    ('library_saved_courses', 'userId',  'FK_7b79ae3ee5724ad537aaa2310f9'),
    ('user_achievements',     'userId',  'FK_3ac6bc9da3e8a56f3f7082012dd'),
    ('user_badges',           'userId',  'FK_7043fd1cb64ec3f5ebdb878966c'),
    ('xp_transactions',       'userId',  'FK_0c00e30c10daa7e964c62206729')
  ) AS t(tbl, col, conname) LOOP
    IF to_regclass('public.' || fk.tbl) IS NULL THEN
      RAISE NOTICE 'skip %: table missing', fk.tbl;
    ELSIF (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.' || fk.tbl) AND a.attname = fk.col AND NOT a.attisdropped) IS DISTINCT FROM 'uuid' THEN
      RAISE NOTICE 'skip %: column % missing or not uuid', fk.tbl, fk.col;
    ELSIF EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = to_regclass('public.' || fk.tbl) AND c.contype = 'f'
                    AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = fk.col)]) THEN
      RAISE NOTICE 'skip %: a foreign key on % already exists', fk.tbl, fk.col;
    ELSE
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.users ("id") ON DELETE CASCADE NOT VALID',
                     fk.tbl, fk.conname, fk.col);
      RAISE NOTICE 'added % on %.%', fk.conname, fk.tbl, fk.col;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- PART 2b (optional, only if P5 showed rows = 0 everywhere): mark the constraints as validated.
-- Fails (and changes nothing) if any orphan row exists.
-- DO $$
-- DECLARE c record;
-- BEGIN
--   FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
--            WHERE contype = 'f' AND confrelid = 'public.users'::regclass AND NOT convalidated LOOP
--     EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', c.tbl, c.conname);
--   END LOOP;
-- END $$;


-- =====================================================================================================
-- PART 3 — VERIFICATION (read-only)
-- =====================================================================================================

-- V1. Column-by-column comparison with the expected definition. Expected: 0 rows.
WITH expected(col, typ, not_null, def) AS (VALUES
  ('id', 'uuid', true, 'gen_random_uuid()'),
  ('fullName', 'character varying(150)', true, NULL), ('username', 'character varying(100)', true, NULL),
  ('email', 'character varying(255)', true, NULL), ('passwordHash', 'character varying', true, NULL),
  ('dateOfBirth', 'character varying', false, NULL), ('country', 'character varying(100)', false, NULL),
  ('educationType', 'character varying', false, NULL), ('secondarySchool', 'character varying', false, NULL),
  ('secondaryClass', 'character varying', false, NULL), ('secondaryStream', 'character varying', false, NULL),
  ('university', 'character varying', false, NULL), ('faculty', 'character varying', false, NULL),
  ('department', 'character varying', false, NULL), ('courseOfStudy', 'character varying', false, NULL),
  ('level', 'character varying', false, NULL), ('examAimOrGoals', 'character varying', false, NULL),
  ('preferredStudyTime', 'character varying', false, NULL), ('isEmailVerified', 'boolean', true, 'false'),
  ('verification_otp', 'character varying(6)', false, NULL), ('otp_expires_at', 'timestamp without time zone', false, NULL),
  ('refresh_token', 'text', false, NULL), ('is_restricted', 'boolean', true, 'false'),
  ('restriction_reason', 'text', false, NULL), ('created_at', 'timestamp without time zone', true, 'now()'),
  ('updated_at', 'timestamp without time zone', true, 'now()'), ('institution', 'character varying', false, NULL),
  ('levelOrClass', 'character varying', false, NULL), ('preferredLearningPace', 'character varying', false, NULL),
  ('academicGoals', 'text', false, NULL), ('isFrozen', 'boolean', true, 'false'),
  ('role', 'character varying', true, '''student''::character varying'),
  ('createdAt', 'timestamp without time zone', true, 'now()'), ('updatedAt', 'timestamp without time zone', true, 'now()'),
  ('deletedAt', 'timestamp without time zone', false, NULL)),
actual AS (
  SELECT a.attname AS col, format_type(a.atttypid, a.atttypmod) AS typ, a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS def
  FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = to_regclass('public.users') AND a.attnum > 0 AND NOT a.attisdropped)
SELECT coalesce(e.col, a.col) AS col, e.typ AS expected_type, a.typ AS actual_type, e.not_null AS expected_not_null,
       a.not_null AS actual_not_null, e.def AS expected_default, a.def AS actual_default
FROM expected e FULL JOIN actual a ON a.col = e.col
WHERE e.col IS NULL OR a.col IS NULL OR e.typ <> a.typ OR e.not_null <> a.not_null OR e.def IS DISTINCT FROM a.def;

-- V2. Keys. Expected: PK_a3ffb1c0c8416b9fc6f907b7433 (id), UQ_97672ac88f789774dd47f7c8be3 (email),
--     UQ_fe0bb3f6520ee0469504521e710 (username).
SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = to_regclass('public.users') AND contype IN ('p', 'u') ORDER BY conname;

-- V3. Data API closed. Expected: anon_select false, authenticated_select false.
SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN has_table_privilege('anon', 'public.users', 'SELECT') END AS anon_select,
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN has_table_privilege('authenticated', 'public.users', 'SELECT') END AS authenticated_select;

-- V4. After PART 2: the foreign keys. Expected: one row per dependent table that exists (8 if all exist).
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def, convalidated
FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.users') ORDER BY 1;

-- V5. Supabase Auth untouched. Expected: unchanged count compared with before PART 1 (run before and after).
SELECT count(*) AS auth_users FROM auth.users;


-- =====================================================================================================
-- PART 4 — ROLLBACK (writes; only if needed, and only while public.users holds no rows)
-- Removes exactly what PARTs 1–2 added. Never uses CASCADE.
-- =====================================================================================================
-- BEGIN;
-- DO $$
-- DECLARE c record;
-- BEGIN
--   IF to_regclass('public.users') IS NULL THEN RAISE NOTICE 'nothing to roll back'; RETURN; END IF;
--   IF EXISTS (SELECT 1 FROM public.users) THEN
--     RAISE EXCEPTION 'public.users has rows: rollback would delete learner accounts. Stop and decide.';
--   END IF;
--   FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
--            WHERE contype = 'f' AND confrelid = 'public.users'::regclass
--              AND conname IN ('FK_e85b0a5bf336ec85a9c84c1c391', 'FK_d60e048034edfd232e0b8cedaeb', 'FK_de33d443c8ae36800c37c58c929',
--                              'FK_6839f79ea05acf9da28dee3fbb0', 'FK_7b79ae3ee5724ad537aaa2310f9', 'FK_3ac6bc9da3e8a56f3f7082012dd',
--                              'FK_7043fd1cb64ec3f5ebdb878966c', 'FK_0c00e30c10daa7e964c62206729') LOOP
--     EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
--   END LOOP;
--   DROP TABLE public.users;  -- fails if any other (unexpected) object still depends on it
-- END $$;
-- COMMIT;

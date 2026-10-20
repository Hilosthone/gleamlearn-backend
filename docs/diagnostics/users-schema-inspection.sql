-- =====================================================================================
-- READ-ONLY inspection of public.users — run the SAME file in both environments:
--   PRODUCTION: Supabase dashboard → SQL Editor → New query → paste → Run
--   LOCAL:      pgAdmin → your local database (mycoursea_db) → Query Tool → paste → Run (F5)
-- Then compare the outputs (especially sections 3 and 4).
--
-- Safety: only SELECTs on system catalogs, inside a READ ONLY transaction that is rolled back.
-- Nothing is created, changed or deleted. No user rows, emails, names or secrets are returned;
-- section 7 returns a single number (row count).
-- Note: in the Supabase SQL Editor each statement's result appears in its own tab; if your
-- editor only shows the last result, run the sections one at a time (select text → Run).
-- =====================================================================================

BEGIN READ ONLY;

-- 1. Which database / schema / role this session uses (no secrets)
SELECT current_database() AS database, current_schema() AS default_schema,
       current_setting('search_path') AS search_path, current_user AS role,
       split_part(version(), ' ', 2) AS postgres_version;

-- 2. Every table called "users" (Supabase also has its own auth.users — that one is NOT the app's)
SELECT n.nspname AS schema, c.relname AS table, pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'users' AND c.relkind IN ('r', 'p', 'v')
ORDER BY 1;

-- 3. MAIN CHECK: every column the login / sign-up code uses (src/auth/entities/user.entity.ts),
--    with its status in public.users. Rows with status <> 'ok' explain the 500 errors.
WITH expected(column_name, expected_type, nullable) AS (
  VALUES ('id', 'uuid', 'NO'), ('fullName', 'character varying', 'NO'), ('username', 'character varying', 'NO'),
         ('email', 'character varying', 'NO'), ('passwordHash', 'character varying', 'NO'),
         ('dateOfBirth', 'character varying', 'YES'), ('country', 'character varying', 'YES'),
         ('educationType', 'character varying', 'YES'), ('secondarySchool', 'character varying', 'YES'),
         ('secondaryClass', 'character varying', 'YES'), ('secondaryStream', 'character varying', 'YES'),
         ('university', 'character varying', 'YES'), ('faculty', 'character varying', 'YES'),
         ('department', 'character varying', 'YES'), ('courseOfStudy', 'character varying', 'YES'),
         ('level', 'character varying', 'YES'), ('examAimOrGoals', 'character varying', 'YES'),
         ('preferredStudyTime', 'character varying', 'YES'), ('isEmailVerified', 'boolean', 'NO'),
         ('verification_otp', 'character varying', 'YES'), ('otp_expires_at', 'timestamp without time zone', 'YES'),
         ('refresh_token', 'text', 'YES'), ('is_restricted', 'boolean', 'NO'), ('restriction_reason', 'text', 'YES'),
         ('created_at', 'timestamp without time zone', 'NO'), ('updated_at', 'timestamp without time zone', 'NO')
)
SELECT e.column_name,
       CASE WHEN c.column_name IS NULL THEN 'MISSING'
            WHEN c.data_type <> e.expected_type THEN 'TYPE DIFFERS'
            ELSE 'ok' END AS status,
       e.expected_type, c.data_type AS actual_type, c.is_nullable AS actual_nullable,
       -- a differently-named twin (e.g. createdAt for created_at) points to a mapping fix, not a new column
       (SELECT string_agg(t.column_name, ', ') FROM information_schema.columns t
         WHERE t.table_schema = 'public' AND t.table_name = 'users'
           AND lower(replace(t.column_name, '_', '')) = lower(replace(e.column_name, '_', ''))
           AND t.column_name <> e.column_name) AS similar_named_column
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'users' AND c.column_name = e.column_name
ORDER BY (c.column_name IS NULL) DESC, e.column_name;

-- 4. Columns that exist in public.users but are NOT used by the login code
--    (left by the other User definitions: src/users/users.entity.ts and prisma/schema.prisma)
SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS has_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name NOT IN ('id','fullName','username','email','passwordHash','dateOfBirth','country','educationType',
    'secondarySchool','secondaryClass','secondaryStream','university','faculty','department','courseOfStudy','level',
    'examAimOrGoals','preferredStudyTime','isEmailVerified','verification_otp','otp_expires_at','refresh_token',
    'is_restricted','restriction_reason','created_at','updated_at')
ORDER BY ordinal_position;

-- 5. Sign-up would also fail if an unused column is NOT NULL without a default (the insert omits it)
SELECT column_name AS blocks_signup_insert
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND is_nullable = 'NO' AND column_default IS NULL
  AND column_name NOT IN ('id','fullName','username','email','passwordHash','isEmailVerified','is_restricted','created_at','updated_at');

-- 6. Access: row-level-security policies and table privileges on public.users
SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';
SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'users'
GROUP BY grantee ORDER BY grantee;

-- 7. Size only: how many accounts any fix would touch (a number, no data)
SELECT count(*) AS user_rows FROM public.users;

-- 8. Was a migration tool ever used? (no rows = schema came only from TypeORM synchronize)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('migrations', 'typeorm_metadata', '_prisma_migrations');

ROLLBACK;

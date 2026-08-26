-- Migration: make user emails case-insensitive identities
-- Date: 2026-08-26
--
-- Context
--   Login matched `email` exactly while studentAuth and admin/create-issuer
--   stored emails lowercased. An account created as "Registrar@Example.edu"
--   was stored as "registrar@example.edu", so logging in with the casing the
--   user was given failed with "Invalid credentials".
--
--   Application code now reads with LOWER(email) = LOWER($1) and writes
--   lowercase. This migration brings an existing database in line and makes
--   case-variant duplicates impossible going forward.
--
-- Apply with:
--   psql "$DATABASE_URL" -f backend/migrations/2026-08-26-email-case-insensitive.sql
--
-- New databases created from schema.sql already include the index in STEP 3
-- and do not need this file.
--
-- ⚠ STEP 1 IS A CHECK, NOT A CHANGE. Run it first, on its own. If it returns
--   any rows, stop and resolve those accounts by hand — steps 2 and 3 will
--   fail while they exist, and only you can decide which duplicate is real.


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1 — Find collisions (run this first; expect zero rows)
-- ─────────────────────────────────────────────────────────────────────────
SELECT LOWER(email) AS normalized_email,
       COUNT(*)     AS account_count,
       ARRAY_AGG(email ORDER BY created_at) AS variants,
       ARRAY_AGG(id ORDER BY created_at)    AS user_ids
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- If that returned rows, each group is two or more accounts that will become
-- one identity. Decide which to keep, then re-point or remove the others —
-- certificates.issuer_id / owner_id, wallets.user_id, audit_logs.user_id and
-- revocations.revoked_by all reference users(id), so deleting an account with
-- history will fail on those foreign keys. Re-assign before deleting.


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2 — Normalize existing addresses to lowercase
-- ─────────────────────────────────────────────────────────────────────────
BEGIN;

UPDATE users
SET    email = LOWER(email),
       updated_at = CURRENT_TIMESTAMP
WHERE  email <> LOWER(email);

-- Same treatment for pending OTP rows, whose primary key is the email.
-- Application code always wrote these lowercased, so this is normally a no-op.
DELETE FROM student_otp s
WHERE  s.email <> LOWER(s.email)
AND    EXISTS (SELECT 1 FROM student_otp t WHERE t.email = LOWER(s.email));

UPDATE student_otp
SET    email = LOWER(email)
WHERE  email <> LOWER(email);


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3 — Enforce case-insensitive uniqueness
-- ─────────────────────────────────────────────────────────────────────────
-- Replaces the plain btree on users(email). The functional index both enforces
-- one-account-per-normalized-address and serves the LOWER(email) lookups in
-- the auth paths, which the old index could not.

DROP INDEX IF EXISTS idx_users_email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

COMMIT;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4 — Verify
-- ─────────────────────────────────────────────────────────────────────────
-- Expect: zero rows from the first query, and idx_users_email_lower listed
-- as UNIQUE in the second.

SELECT id, email FROM users WHERE email <> LOWER(email);

SELECT indexname, indexdef
FROM   pg_indexes
WHERE  tablename = 'users';

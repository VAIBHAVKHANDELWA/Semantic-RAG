-- V5__auth_user_management.sql
-- Step 1: Add new security and lifecycle columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Re-hash seeded users with valid BCrypt hash for 'password123'
UPDATE users 
SET password_hash = crypt('password123', gen_salt('bf', 10)),
    must_change_password = false,
    active = true,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE email IN (
    'hr_steward@enterprise.com',
    'hr_admin@enterprise.com',
    'finance_steward@enterprise.com',
    'legal_auditor@enterprise.com',
    'eng_steward@enterprise.com',
    'superadmin@enterprise.com'
);

-- Mark superadmin as is_super_admin = true
UPDATE users
SET is_super_admin = true
WHERE email = 'superadmin@enterprise.com';

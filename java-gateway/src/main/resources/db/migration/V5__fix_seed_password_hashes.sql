-- V5__fix_seed_password_hashes.sql
-- Update seeded users to use valid BCrypt hash for 'password123'
UPDATE users 
SET password_hash = crypt('password123', gen_salt('bf', 10))
WHERE email IN (
    'hr_steward@enterprise.com',
    'hr_admin@enterprise.com',
    'finance_steward@enterprise.com',
    'legal_auditor@enterprise.com',
    'eng_steward@enterprise.com',
    'superadmin@enterprise.com'
);

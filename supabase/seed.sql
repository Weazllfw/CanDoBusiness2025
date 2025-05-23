-- supabase/seed.sql
-- This file is executed when you run `supabase db reset` or when a new project is created.
-- It's a good place to add initial application data.
-- System/Admin user creation and profile seeding will be handled by a separate setup script.

-- Seeded Test User for Trust Score Debugging
-- UUID: 9e26380e-5372-469c-8196-e4b676f427e5
-- Email: r@r.com
-- Password: password

-- Insert into auth.users
INSERT INTO auth.users (
    id, email, encrypted_password, 
    role, aud, instance_id, 
    raw_app_meta_data, raw_user_meta_data, 
    email_confirmed_at, last_sign_in_at,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES
    (
        '9e26380e-5372-469c-8196-e4b676f427e5', 'r@r.com', crypt('password', gen_salt('bf', 10)), 
        'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000',
        '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('sub', '9e26380e-5372-469c-8196-e4b676f427e5', 'email', 'r@r.com', 'email_verified', true, 'phone_verified', false),
        NOW(), NOW(),
        NOW(), NOW(),
        '', '', '', ''  -- Empty strings for token fields
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = NOW(),
    last_sign_in_at = NOW(),
    updated_at = NOW(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Insert corresponding profile (initially incomplete, or with some defaults)
INSERT INTO public.profiles (id, email, name, status, created_at, updated_at)
VALUES
    ('9e26380e-5372-469c-8196-e4b676f427e5', 'r@r.com', 'Test User R', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    status = 'active',
    updated_at = NOW();

-- Example of other seed data:
-- INSERT INTO public.your_table (column1, column2) VALUES ('value1', 'value2');
-- Add any other application-specific seed data here. 
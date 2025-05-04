-- Seed data for testing purposes

-- Reset existing data
TRUNCATE companies, company_users, user_profiles CASCADE;

-- Create test auth users
WITH inserted_auth_users AS (
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES 
    (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'john@techcorp.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "John Smith"}'::jsonb,
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      NULL,
      NULL,
      encode(gen_random_bytes(32), 'hex')
    ),
    (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'sarah@innovatech.ca',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Sarah Johnson"}'::jsonb,
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      NULL,
      NULL,
      encode(gen_random_bytes(32), 'hex')
    ),
    (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'michael@greenfuture.ca',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Michael Brown"}'::jsonb,
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      NULL,
      NULL,
      encode(gen_random_bytes(32), 'hex')
    ),
    (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'emily@buildpro.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Emily Davis"}'::jsonb,
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      NULL,
      NULL,
      encode(gen_random_bytes(32), 'hex')
    )
  RETURNING id, email
),
-- Create test companies
inserted_companies AS (
  INSERT INTO companies (
    id, name, trading_name, business_number, email, phone, website,
    address, industry_tags, capability_tags, region_tags,
    is_verified, verified_at, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(),
      'TechCorp Solutions',
      'TechCorp',
      '123456789',
      'contact@techcorp.com',
      '+1-555-1001',
      'https://techcorp.com',
      '{"street": "123 Innovation Drive", "city": "Toronto", "province": "ON", "postal_code": "M5V 2T6", "country": "Canada"}'::jsonb,
      ARRAY['Software Development', 'IT Consulting', 'Cloud Services'],
      ARRAY['Web Development', 'Mobile Apps', 'AI/ML', 'DevOps'],
      ARRAY['Ontario', 'Quebec'],
      true,
      NOW(),
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'InnovaTech Industries',
      'InnovaTech',
      '987654321',
      'info@innovatech.ca',
      '+1-555-1002',
      'https://innovatech.ca',
      '{"street": "456 Research Park", "city": "Vancouver", "province": "BC", "postal_code": "V6B 1A1", "country": "Canada"}'::jsonb,
      ARRAY['Manufacturing', 'R&D', 'Electronics'],
      ARRAY['Product Design', 'Prototyping', 'Quality Control'],
      ARRAY['British Columbia', 'Alberta'],
      true,
      NOW(),
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Green Future Energy',
      'GreenFuture',
      '456789123',
      'contact@greenfuture.ca',
      '+1-555-1003',
      'https://greenfuture.ca',
      '{"street": "789 Sustainability Road", "city": "Montreal", "province": "QC", "postal_code": "H2Y 1Z6", "country": "Canada"}'::jsonb,
      ARRAY['Renewable Energy', 'Environmental Services', 'Sustainability'],
      ARRAY['Solar Installation', 'Energy Consulting', 'Waste Management'],
      ARRAY['Quebec', 'Ontario', 'Atlantic Canada'],
      false,
      NULL,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'BuildPro Construction',
      'BuildPro',
      '789123456',
      'info@buildpro.com',
      '+1-555-1004',
      'https://buildpro.com',
      '{"street": "321 Construction Ave", "city": "Calgary", "province": "AB", "postal_code": "T2P 1J9", "country": "Canada"}'::jsonb,
      ARRAY['Construction', 'Project Management', 'Real Estate'],
      ARRAY['Commercial Construction', 'Residential Development', 'Infrastructure'],
      ARRAY['Alberta', 'Saskatchewan'],
      true,
      NOW(),
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Maritime Shipping Co',
      'MarineShip',
      '321987654',
      'contact@marineship.ca',
      '+1-555-1005',
      'https://marineship.ca',
      '{"street": "567 Harbor View", "city": "Halifax", "province": "NS", "postal_code": "B3H 4R2", "country": "Canada"}'::jsonb,
      ARRAY['Logistics', 'Transportation', 'Maritime Services'],
      ARRAY['Freight Shipping', 'Supply Chain Management', 'Warehousing'],
      ARRAY['Atlantic Canada', 'Quebec'],
      false,
      NULL,
      NOW(),
      NOW()
    )
  RETURNING id, email
),
-- Associate users with companies (owners)
inserted_owners AS (
  INSERT INTO company_users (id, company_id, user_id, role, is_primary, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    c.id,
    u.id,
    'owner',
    true,
    NOW(),
    NOW()
  FROM inserted_companies c
  JOIN inserted_auth_users u ON 
    CASE 
      WHEN c.email LIKE 'contact@%' THEN u.email = REPLACE(c.email, 'contact@', '')
      WHEN c.email LIKE 'info@%' THEN u.email = REPLACE(c.email, 'info@', '')
    END
),
-- Add some members
inserted_members_1 AS (
  INSERT INTO company_users (id, company_id, user_id, role, is_primary, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    c.id,
    u.id,
    'member',
    false,
    NOW(),
    NOW()
  FROM inserted_companies c
  CROSS JOIN inserted_auth_users u
  WHERE c.email LIKE '%techcorp.com'
    AND u.email LIKE '%innovatech.ca'
),
inserted_members_2 AS (
  INSERT INTO company_users (id, company_id, user_id, role, is_primary, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    c.id,
    u.id,
    'member',
    false,
    NOW(),
    NOW()
  FROM inserted_companies c
  CROSS JOIN inserted_auth_users u
  WHERE c.email LIKE '%innovatech.ca'
    AND u.email LIKE '%greenfuture.ca'
)
-- Add verification requests for unverified companies
INSERT INTO company_verification_requests (
  id, company_id, submitter_id, business_legal_name, business_number,
  submitter_full_name, submitter_email, company_website,
  status, submitted_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  c.id,
  u.id,
  c.name || ' Inc.',
  c.business_number,
  u.raw_user_meta_data->>'full_name',
  u.email,
  c.website,
  'pending',
  NOW(),
  NOW(),
  NOW()
FROM companies c
JOIN auth.users u ON 
  CASE 
    WHEN c.email LIKE 'contact@%' THEN u.email = REPLACE(c.email, 'contact@', '')
    WHEN c.email LIKE 'info@%' THEN u.email = REPLACE(c.email, 'info@', '')
  END
WHERE NOT c.is_verified; 
# Database Schema Documentation

## Overview

The database schema is designed to support a business platform with features including user management, company profiles, business verification, and team management. The schema is implemented in PostgreSQL and uses Supabase for authentication and storage.

## Tables

### 1. Users and Profiles

#### users (public)
- Primary table for user accounts, extends Supabase auth.users
```sql
create table public.users (
  id uuid primary key references auth.users(id),
  email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### user_profiles
- Stores additional user information and preferences
```sql
CREATE TABLE user_profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    avatar_url text,
    email text,
    phone text,
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### 2. Companies

#### companies
- Core table for business entities
```sql
CREATE TABLE companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    trading_name text,
    business_number text,
    tax_number text,
    email text,
    phone text,
    website text,
    address jsonb DEFAULT '{}'::jsonb,
    industry_tags text[] DEFAULT '{}'::text[],
    capability_tags text[] DEFAULT '{}'::text[],
    region_tags text[] DEFAULT '{}'::text[],
    is_verified boolean DEFAULT false,
    verification_badge_url text,
    verified_at timestamptz,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### company_users
- Manages relationships between users and companies
```sql
CREATE TABLE company_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(company_id, user_id)
);
```

### 3. Company Verification

#### company_verification_requests
- Handles business verification process
```sql
CREATE TABLE company_verification_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    submitter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    business_legal_name text NOT NULL,
    business_number text NOT NULL,
    submitter_full_name text NOT NULL,
    submitter_email text NOT NULL,
    company_website text,
    company_linkedin text,
    company_phone text,
    status company_verification_status DEFAULT 'pending',
    admin_notes text,
    submitted_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### 4. Team Management

#### company_invitations
- Manages team member invitations
```sql
CREATE TABLE company_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role member_role NOT NULL DEFAULT 'member',
    status invitation_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(company_id, email, status)
);
```

#### company_members
- Stores active team members
```sql
CREATE TABLE company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role member_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, user_id),
    UNIQUE(company_id, email)
);
```

## Custom Types

### Enums

1. `company_verification_status`
   - Values: 'pending', 'approved', 'rejected'
   - Used in verification requests

2. `invitation_status`
   - Values: 'pending', 'accepted', 'rejected', 'expired'
   - Used in team invitations

3. `member_role`
   - Values: 'admin', 'member'
   - Used for team member roles

## Helper Functions

### User Management
- `handle_new_user()`: Automatically creates user profile on signup
- `update_updated_at_column()`: Updates timestamp on record changes

### Company Management
- `is_company_owner(company_id, user_id)`: Checks if user is company owner
- `is_company_member(company_id, user_id)`: Checks if user is company member
- `is_company_admin_or_owner(company_id, user_id)`: Checks if user is admin/owner
- `create_company_with_owner(...)`: Creates new company and assigns owner

### Verification
- `submit_company_verification_request(...)`: Submits verification request
- `process_verification_request(...)`: Processes verification request

## Row Level Security (RLS)

### Users and Profiles
- Users can only view and edit their own data
- Profiles are only accessible to their owners

### Companies
- View: Members can view companies they belong to
- Create: Only through secure function
- Update/Delete: Only by company owners

### Company Users
- View: Users can see their own memberships
- View: Admins/Owners can see all members in their companies
- Modify: Only owners can manage members

### Verification Requests
- View: Company owners and admins only
- Submit: Company owners only
- Process: Platform admins only

### Team Invitations
- View/Manage: Company admins only
- Accept: Any authenticated user (through secure function)

## Storage

The schema includes a storage bucket for company logos with the following configuration:
- Bucket: 'company-logos'
- Public access enabled
- Upload permissions for authenticated users
- Delete permissions for file owners

## Indexes

### Performance Indexes
- Companies: name, tags (GIN indexes for arrays)
- Company Users: company_id, user_id, role
- Verification: company pending status (partial unique)

## Security Considerations

1. All tables have RLS enabled
2. Sensitive operations use security definer functions
3. Custom policies for each access pattern
4. Proper cascading deletes for referential integrity
5. Rate limiting on certain operations
6. Secure file storage policies 
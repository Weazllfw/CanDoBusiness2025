# Company Management System

## Database Schema

### Tables

#### companies
- `id`: UUID (Primary Key)
- `name`: Text (Required)
- `trading_name`: Text
- `registration_number`: Text
- `tax_number`: Text
- `email`: Text
- `phone`: Text
- `website`: Text
- `address`: JSONB
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

#### company_users
- `id`: UUID (Primary Key)
- `company_id`: UUID (Foreign Key -> companies.id)
- `user_id`: UUID (Foreign Key -> auth.users.id)
- `role`: Text (Enum: owner, admin, member, viewer)
- `is_primary`: Boolean
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

#### user_profiles
- `id`: UUID (Primary Key, Foreign Key -> auth.users.id)
- `full_name`: Text
- `avatar_url`: Text
- `email`: Text
- `phone`: Text
- `preferences`: JSONB
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

### Row Level Security (RLS) Policies

#### Companies
- Users can view companies they belong to
- Users with admin/owner role can update companies
- Users with owner role can delete companies
- Authenticated users can create companies

#### Company Users
- Users can view members of their companies
- Only owners can manage company users

#### User Profiles
- Users can view profiles in their companies
- Users can update their own profile
- Users can insert their own profile

## API Documentation

### Company Operations

```typescript
// Get companies for current user
const { data, error } = await getCompanies()

// Create new company
const { data, error } = await createCompany({
  name: string
  trading_name?: string
  registration_number?: string
  tax_number?: string
  email?: string
  phone?: string
  website?: string
  address?: object
})

// Update company
const { data, error } = await updateCompany(id: string, updates: {
  name?: string
  trading_name?: string
  registration_number?: string
  tax_number?: string
  email?: string
  phone?: string
  website?: string
  address?: object
})

// Delete company
const { error } = await deleteCompany(id: string)
```

### User Role Management

```typescript
// Get company users
const { data, error } = await getCompanyUsers(companyId: string)

// Add user to company
const { data, error } = await addUserToCompany(companyId: string, {
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_primary?: boolean
})

// Update user role
const { data, error } = await updateUserRole(
  companyId: string,
  userId: string,
  { role: 'owner' | 'admin' | 'member' | 'viewer' }
)

// Remove user from company
const { error } = await removeUserFromCompany(companyId: string, userId: string)
```

## Frontend Components

### CompanySelector
- Located in: `src/components/common/CompanySelector`
- Purpose: Allows users to switch between their companies
- Features:
  - Displays current company
  - Lists all available companies
  - Shows primary company indicator
  - Provides link to create new company

### CompanyForm
- Located in: `app/dashboard/companies/CompanyForm`
- Purpose: Manages company details
- Features:
  - Edit company information
  - Validation
  - Error handling
  - Success notifications

### UserRoleManagement
- Located in: `app/dashboard/companies/UserRoleManagement`
- Purpose: Manages company users and their roles
- Features:
  - List company users
  - Change user roles
  - Remove users
  - Invite new users
  - Role-based access control

## Role-Based Access Control

### Available Roles

1. **Owner**
   - Can manage company settings
   - Can manage users and roles
   - Can delete company
   - Full access to all features

2. **Admin**
   - Can manage company settings
   - Can view users
   - Cannot manage roles
   - Cannot delete company

3. **Member**
   - Can view company settings
   - Can view users
   - Cannot manage anything

4. **Viewer**
   - Can only view company information
   - Cannot access sensitive data
   - Cannot make any changes

### Implementation

Role checks are implemented at multiple levels:
1. Database level through RLS policies
2. API level through middleware
3. Frontend level through conditional rendering

## Testing

### Unit Tests
- Component tests using React Testing Library
- Database function tests
- Type validation tests

### Integration Tests
- API endpoint tests
- Authentication flow tests
- Role-based access control tests

### E2E Tests
- Company creation flow
- User invitation flow
- Role management flow
- Company switching flow 
# Database Migrations Guide

## Migration Order

The migrations must be applied in the following order to ensure proper table creation and dependencies:

1. `20240430000001_initial_setup.sql`
   - Enables required extensions
   - Creates base user tables
   - Sets up user profile management
   - Establishes initial RLS policies

2. `20240430000002_company_schema.sql`
   - Creates companies table
   - Sets up company-user relationships
   - Implements company management functions
   - Establishes company-related RLS policies

3. `20240430000003_company_verification.sql`
   - Adds verification fields to companies
   - Creates verification request system
   - Implements verification workflow
   - Sets up admin-only verification processes

4. `20240430000004_storage.sql`
   - Sets up company logo storage
   - Configures storage permissions
   - Establishes file access policies

5. `20240430000005_fix_policies.sql`
   - Improves company user policies
   - Fixes recursive policy issues
   - Adds helper functions for permissions
   - Enhances security measures

6. `20240430000006_add_team_invitations.sql`
   - Implements team invitation system
   - Creates member management tables
   - Sets up invitation workflow
   - Establishes team-related policies

## Migration Details

### 1. Initial Setup
- **Purpose**: Foundation for user management
- **Key Components**:
  - User tables and profiles
  - Automatic profile creation
  - Updated timestamp triggers
  - Basic security policies

### 2. Company Schema
- **Purpose**: Core business functionality
- **Key Components**:
  - Company data structure
  - User-company relationships
  - Company management functions
  - Access control policies

### 3. Company Verification
- **Purpose**: Business verification system
- **Key Components**:
  - Verification status tracking
  - Request submission process
  - Admin approval workflow
  - Verification history

### 4. Storage Setup
- **Purpose**: File management system
- **Key Components**:
  - Company logo storage
  - Public access configuration
  - Upload permissions
  - Deletion policies

### 5. Policy Fixes
- **Purpose**: Security enhancement
- **Key Components**:
  - Improved access controls
  - Permission helper functions
  - Policy optimization
  - Security fixes

### 6. Team Invitations
- **Purpose**: Team management system
- **Key Components**:
  - Invitation workflow
  - Member management
  - Role-based access
  - Email tracking

## Running Migrations

### Prerequisites
1. Supabase CLI installed
2. Database connection configured
3. Appropriate permissions

### Commands
```bash
# Apply all migrations
supabase db reset

# Apply specific migration
supabase db push

# Create new migration
supabase migration new migration_name

# Check status
supabase db status
```

## Rollback Procedures

### Manual Rollback
Each migration can be rolled back in reverse order:

1. Drop team invitation tables
2. Revert policy changes
3. Remove storage buckets
4. Drop verification tables
5. Drop company tables
6. Drop user tables

### Automated Rollback
```bash
# Rollback last migration
supabase db reset --timestamp TIMESTAMP

# Rollback to specific version
supabase db reset --version VERSION
```

## Common Issues

### Migration Order
- Ensure migrations run in correct order
- Check for dependency conflicts
- Verify foreign key relationships

### Policy Conflicts
- Watch for recursive policies
- Check permission inheritance
- Verify access patterns

### Data Integrity
- Use transactions where needed
- Implement proper cascading
- Verify constraint enforcement

## Best Practices

1. **Version Control**
   - Keep migrations in version control
   - Document changes thoroughly
   - Use descriptive names

2. **Testing**
   - Test migrations in development
   - Verify rollback procedures
   - Check data integrity

3. **Security**
   - Review RLS policies
   - Audit permission changes
   - Validate access controls

4. **Performance**
   - Monitor index usage
   - Check query performance
   - Optimize where needed 
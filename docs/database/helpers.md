# Database Helper Functions

This document outlines the database helper functions used in the CanDo Business application for managing companies, roles, and user relationships.

## Table of Contents
- [Company Management](#company-management)
- [Role Management](#role-management)
- [Type Definitions](#type-definitions)

## Company Management

The company management functions are located in `src/lib/db/company.ts` and provide the following functionality:

### `createCompany(input: CreateCompanyInput): Promise<Company>`
Creates a new company record with the following behavior:
- Sets initial status to 'ACTIVE'
- Sets verification status to 'UNVERIFIED'
- Returns the created company record

### `updateCompany(input: UpdateCompanyInput): Promise<Company>`
Updates an existing company record:
- Automatically updates the `updatedAt` timestamp
- Returns the updated company record

### `getCompanyById(id: string): Promise<CompanyProfile | null>`
Retrieves detailed company information:
- Fetches base company data
- Includes member count
- Returns `null` if company not found
- Includes verification status flag

### `searchCompanies(params: CompanySearchParams): Promise<{ companies: Company[]; total: number }>`
Advanced company search with the following features:
- Filtering by:
  - Status
  - Verification status
  - Location
  - Founded date range
  - Business number presence
  - Text search across name fields
- Pagination support
- Sorting options
- Returns both results and total count

### `deleteCompany(id: string): Promise<void>`
Removes a company record from the database.

### `verifyCompany(id: string): Promise<Company>`
Updates company verification status:
- Sets status to 'VERIFIED'
- Updates timestamp
- Returns updated company record

## Role Management

The role management functions are located in `src/lib/db/roles.ts` and provide the following functionality:

### `createRole(input: CreateRoleInput): Promise<UserCompanyRole>`
Creates a new user-company role relationship:
- Sets initial status to 'PENDING'
- Records join timestamp
- Returns created role record

### `updateRole(input: UpdateRoleInput): Promise<UserCompanyRole>`
Updates an existing role:
- Updates timestamp
- Returns updated role record

### `getRoleById(id: string): Promise<RoleWithUserDetails | null>`
Retrieves detailed role information:
- Includes associated user details
- Returns `null` if role not found
- Includes user profile information

### `getCompanyRoles(companyId: string): Promise<RoleWithUserDetails[]>`
Lists all roles for a company:
- Includes user details for each role
- Returns empty array if no roles found

### `getUserRoles(userId: string): Promise<UserCompanyRole[]>`
Lists all roles for a specific user:
- Returns all company associations
- Returns empty array if no roles found

### `inviteUserToCompany(email: string, companyId: string, role: CompanyRole, invitedBy: string): Promise<RoleInvitation>`
Manages role invitations:
- Creates pending invitation
- Sets 7-day expiration
- Prepared for email notification integration

### `acceptInvitation(invitationId: string, userId: string): Promise<UserCompanyRole>`
Processes role invitation acceptance:
- Validates invitation status
- Creates active role
- Updates invitation status
- Returns created role

### `removeRole(id: string): Promise<void>`
Soft-deletes a role:
- Sets status to 'REMOVED'
- Maintains historical record

## Type Definitions

The type definitions for these functions can be found in `src/lib/types` and include:

### Company Types
- `Company`: Base company record
- `CreateCompanyInput`: Company creation parameters
- `UpdateCompanyInput`: Company update parameters
- `CompanySearchParams`: Search/filter parameters
- `CompanyProfile`: Extended company information

### Role Types
- `UserCompanyRole`: Base role record
- `CreateRoleInput`: Role creation parameters
- `UpdateRoleInput`: Role update parameters
- `RoleWithUserDetails`: Extended role information
- `RoleInvitation`: Invitation record
- `CompanyRole`: Role type enum

## Error Handling

All functions implement consistent error handling:
- Throw Supabase errors when database operations fail
- Include type checking and validation
- Maintain transaction integrity where applicable

## Security Considerations

The helper functions rely on:
- Supabase Row Level Security (RLS) policies
- Status checks for data access
- Role validation for operations
- Proper invitation flow validation

## Usage Examples

```typescript
// Create a new company
const company = await createCompany({
  name: "Example Corp",
  legalName: "Example Corporation Ltd",
  businessNumber: "123456789"
});

// Search for companies
const results = await searchCompanies({
  query: "Example",
  status: ["ACTIVE"],
  page: 1,
  limit: 10
});

// Manage roles
const role = await createRole({
  userId: "user123",
  companyId: "company456",
  role: "ADMIN"
});

// Process invitations
const invitation = await inviteUserToCompany(
  "user@example.com",
  "company456",
  "MEMBER",
  "admin123"
);
``` 
# Networking System

## 1. Overview

The Networking System enables connections between users and companies within the platform. It supports both user-to-user and company-to-company relationships, facilitating business networking and collaboration opportunities.

## 2. Database Schema

### 2.1. User Connections

#### 2.1.1. `user_connections` Table
*   **Core Fields:**
    *   `id` UUID (PK)
    *   `user_id` UUID (FK to `public.profiles`)
    *   `connected_user_id` UUID (FK to `public.profiles`)
    *   `status` connection_status_enum
    *   `created_at` TIMESTAMPTZ
    *   `updated_at` TIMESTAMPTZ

#### 2.1.2. `user_company_follows` Table
*   **Core Fields:**
    *   `id` UUID (PK)
    *   `user_id` UUID (FK to `public.profiles`)
    *   `company_id` UUID (FK to `public.companies`)
    *   `created_at` TIMESTAMPTZ

### 2.2. Company Connections

#### 2.2.1. `company_to_company_connections` Table
*   **Core Fields:**
    *   `id` UUID (PK)
    *   `source_company_id` UUID (FK to `public.companies`)
    *   `target_company_id` UUID (FK to `public.companies`)
    *   `connection_type` company_connection_type_enum
    *   `status` connection_status_enum
    *   `created_at` TIMESTAMPTZ
    *   `updated_at` TIMESTAMPTZ

### 2.3. Enums and Types

```sql
CREATE TYPE connection_status_enum AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'BLOCKED'
);

CREATE TYPE company_connection_type_enum AS ENUM (
    'FOLLOWING',
    'PARTNERSHIP_REQUESTED',
    'PARTNERSHIP_ESTABLISHED'
);
```

## 3. RPC Functions

### 3.1. User Connection RPCs

*   **`request_user_connection(p_target_user_id UUID)`**
    *   Initiates connection request
    *   Validates user existence and eligibility
    *   Creates notification for target user

*   **`respond_to_user_connection(p_connection_id UUID, p_accept BOOLEAN)`**
    *   Accepts/rejects connection request
    *   Updates connection status
    *   Creates notification for requestor

### 3.2. Company Connection RPCs

*   **`request_company_partnership(p_target_company_id UUID)`**
    *   Initiates company partnership request
    *   Validates company eligibility
    *   Creates notification for target company owner

*   **`respond_to_company_partnership(p_connection_id UUID, p_accept BOOLEAN)`**
    *   Accepts/rejects partnership request
    *   Updates connection status
    *   Creates notification for requestor

## 4. Frontend Implementation

### 4.1. User Profile Components

*   **Connection Button:**
    *   Displays appropriate action based on connection status
    *   Handles connection requests and responses
    *   Shows loading and error states

*   **Connection List:**
    *   Displays user's connections
    *   Supports filtering and search
    *   Pagination implementation

### 4.2. Company Profile Components

*   **Follow Button:**
    *   Toggles company following status
    *   Updates follower count
    *   Optimistic UI updates

*   **Partnership Section:**
    *   Displays partnership status and options
    *   Handles partnership requests
    *   Shows existing partnerships

### 4.3. Hooks and Utilities

*   **`useUserConnections` Hook:**
    ```typescript
    interface UseUserConnectionsReturn {
      connections: UserConnection[];
      isLoading: boolean;
      error: Error | null;
      requestConnection: (userId: string) => Promise<void>;
      acceptConnection: (connectionId: string) => Promise<void>;
      rejectConnection: (connectionId: string) => Promise<void>;
    }
    ```

*   **`useCompanyConnections` Hook:**
    ```typescript
    interface UseCompanyConnectionsReturn {
      partnerships: CompanyConnection[];
      followers: CompanyFollower[];
      isLoading: boolean;
      error: Error | null;
      requestPartnership: (companyId: string) => Promise<void>;
      followCompany: (companyId: string) => Promise<void>;
      unfollowCompany: (companyId: string) => Promise<void>;
    }
    ```

## 5. Security

### 5.1. RLS Policies

*   **User Connections:**
    *   Users can only view their own connections
    *   Connection requests require both parties' consent
    *   Blocked connections prevent further interactions

*   **Company Connections:**
    *   Company owners can manage partnerships
    *   Public read access for following relationships
    *   Protected write access for partnerships

### 5.2. Validation Rules

*   Prevent self-connections
*   Enforce connection limits
*   Validate user/company status
*   Check verification requirements

## 6. Notifications

### 6.1. User Notifications

*   New connection requests
*   Request responses
*   Connection updates
*   Profile changes

### 6.2. Company Notifications

*   New followers
*   Partnership requests
*   Partnership status changes
*   Company updates

## 7. Performance Considerations

### 7.1. Optimization

*   Connection count caching
*   Follower count caching
*   Selective real-time updates
*   Pagination implementation

### 7.2. Indexing

*   Compound indexes for efficient queries
*   Status-based indexes
*   Timestamp-based sorting

## 8. Future Enhancements

*   Enhanced connection recommendations
*   Connection strength metrics
*   Advanced partnership features
*   Network visualization
*   Integration with external platforms
*   Analytics and insights 
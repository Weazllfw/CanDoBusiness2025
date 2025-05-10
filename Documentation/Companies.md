# Company Data Management

## 1. Overview

The `companies` table is central to the platform, representing business entities created and managed by users. Each company has an owner and various attributes detailing its profile. This system allows users to associate themselves with one or more companies, which can then interact within the platform (e.g., send messages, create RFQs, post updates).

## 2. Backend Details

### 2.1. Table Schema: `public.companies`

The primary table for storing company information.

| Column                | Type                        | Constraints/Defaults                                     | Description                                                                 |
|-----------------------|-----------------------------|----------------------------------------------------------|-----------------------------------------------------------------------------|
| `id`                  | `UUID`                      | `DEFAULT gen_random_uuid()`, `PRIMARY KEY`               | Unique identifier for the company.                                          |
| `created_at`          | `TIMESTAMP WITH TIME ZONE`  | `DEFAULT CURRENT_TIMESTAMP`                              | Timestamp of when the company record was created.                           |
| `name`                | `TEXT`                      | `NOT NULL`                                               | Name of the company.                                                        |
| `description`         | `TEXT`                      |                                                          | A brief description of the company.                                         |
| `website`             | `TEXT`                      |                                                          | The company's official website URL.                                        |
| `location`            | `TEXT`                      |                                                          | Physical location or headquarters of the company.                           |
| `industry`            | `TEXT`                      |                                                          | The industry sector the company operates in.                                |
| `owner_id`            | `UUID`                      | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE`  | The user ID of the company's owner.                                        |
| `avatar_url`          | `TEXT`                      |                                                          | URL for the company's logo or avatar image.                                |
| `verification_status` | `VARCHAR(20)`               | `DEFAULT 'unverified'`, `NOT NULL`, `CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'))` | Current verification status of the company. Managed by admins.              |
| `admin_notes`         | `TEXT`                      |                                                          | Notes added by administrators regarding the company or its verification.    |

### 2.2. View: `public.companies_view`

To control data exposure, especially sensitive fields like `admin_notes`, a view is provided for general querying.

-   **Purpose:** Offers a "public" version of company data, excluding fields not meant for general user visibility.
-   **Definition:**
    ```sql
    CREATE OR REPLACE VIEW public.companies_view AS
    SELECT
      id, created_at, name, description, website,
      location, industry, owner_id, avatar_url,
      verification_status -- admin_notes is intentionally excluded
    FROM
      public.companies;
    ```

### 2.3. Key Functions

#### `public.get_user_companies(p_user_id UUID)`

-   **Purpose:** Fetches all companies owned by a specific user.
-   **Returns:** `SETOF public.companies_view`. This ensures that even when owners fetch their company list, they do so through the view that omits `admin_notes`.
-   **Security:** `SECURITY DEFINER`.
-   **Usage:** Called by frontend components like `CompanySelector.tsx` and `ManageCompaniesPage.tsx` to populate lists of companies for the current user.
    ```sql
    CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
    RETURNS SETOF public.companies_view
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT *
      FROM public.companies_view
      WHERE owner_id = p_user_id;
    $$;
    ```

### 2.4. Row Level Security (RLS) on `public.companies`

RLS is enabled and forced on `public.companies` to ensure data access is strictly controlled.

-   **General Viewing (via View):**
    -   `CREATE POLICY "Authenticated users can view company data via view" ON public.companies FOR SELECT TO authenticated USING (true);`
    -   This allows authenticated users to select rows from `public.companies`. The actual column visibility is managed by querying through `public.companies_view`, which hides `admin_notes`.
-   **Owner Permissions:**
    -   **Insert:** Owners can create new companies.
        -   `CREATE POLICY "Owners can insert their companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_id);`
    -   **Update (Standard Fields):** Owners can update the general details of their own companies.
        -   `CREATE POLICY "Owners can update their companies" ON public.companies FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);`
        -   *Note: Specific fields like `verification_status` and `admin_notes` are further protected by a trigger (see below).*
    -   **Delete:** Owners can delete their own companies.
        -   `CREATE POLICY "Owners can delete their companies" ON public.companies FOR DELETE USING (auth.uid() = owner_id);`
-   **Admin Permissions:** (Requires `internal.is_admin(auth.uid())` to be true)
    -   **Select:** Admins can select all data (including `admin_notes`) directly from the `public.companies` table.
        -   `CREATE POLICY "Admins can select all company data" ON public.companies FOR SELECT USING (internal.is_admin(auth.uid()));`
    -   **Update:** Admins can update any field on any company, including `verification_status` and `admin_notes`.
        -   `CREATE POLICY "Admins can update any company" ON public.companies FOR UPDATE USING (internal.is_admin(auth.uid())) WITH CHECK (internal.is_admin(auth.uid()));`

### 2.5. Triggers

#### `internal.prevent_owner_update_restricted_company_fields()`

-   **Event:** `BEFORE UPDATE ON public.companies FOR EACH ROW`
-   **Purpose:** Prevents company owners (who are not also admins) from directly modifying the `verification_status` or `admin_notes` fields. These fields are intended to be managed solely by administrators.
-   **Logic:**
    ```sql
    CREATE OR REPLACE FUNCTION internal.prevent_owner_update_restricted_company_fields()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.owner_id = auth.uid() AND NOT internal.is_admin(auth.uid()) THEN
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
          RAISE EXCEPTION 'As a company owner, you cannot directly change the verification_status...';
        END IF;
        IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
          RAISE EXCEPTION 'As a company owner, you cannot change admin_notes.';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
    ```

## 3. Frontend Components & Pages

Key frontend elements involved in general company management:

-   **Company List Page (`cando-frontend/src/app/dashboard/companies/page.tsx`):**
    -   Displays a list of companies owned by the logged-in user.
    -   Uses `get_user_companies` RPC.
    -   Shows company name, avatar, verification status.
    -   Links to "Create New Company" (`/company/new`) and "Edit Company" (`/company/[id]`).
-   **Company Creation Page (`cando-frontend/src/app/company/new/page.tsx`):**
    -   Hosts the `CompanyForm.tsx` component for creating a new company.
-   **Company Edit Page (`cando-frontend/src/app/company/[id]/page.tsx`):**
    -   Hosts the `CompanyForm.tsx` component for editing an existing company's details.
-   **Company Form (`cando-frontend/src/components/company/CompanyForm.tsx`):**
    -   The reusable form for creating and editing company details (name, description, website, etc.).
-   **Company Selector (`cando-frontend/src/components/company/CompanySelector.tsx`):**
    -   Allows users to view and switch between their associated companies.
    -   Typically integrated into the main site navigation (e.g., Header).
    -   Fetches company list using `get_user_companies` RPC.
    -   Displays company name, avatar, and verification status.
    -   Provides links to "Create New Company" and "Manage Companies" (the `/dashboard/companies` page).

## 4. Data Flow Considerations

-   When a user creates a company, the `owner_id` is set to their `auth.uid()`.
-   `verification_status` defaults to 'unverified' upon creation.
-   Users interact with their own company data (viewing, editing standard fields) primarily through interfaces that call `get_user_companies` or operate under RLS policies scoped to `owner_id`.
-   The `companies_view` is crucial for ensuring `admin_notes` are not inadvertently exposed to regular users. 
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
| `updated_at`          | `TIMESTAMP WITH TIME ZONE`  | `DEFAULT CURRENT_TIMESTAMP`                              | Timestamp of when the company record was last updated.                      |
| `name`                | `TEXT`                      | `NOT NULL`                                               | Name of the company.                                                        |
| `description`         | `TEXT`                      |                                                          | A brief description of the company.                                         |
| `website`             | `TEXT`                      |                                                          | The company's official website URL.                                        |
| `industry`            | `TEXT`                      |                                                          | The industry sector the company operates in.                                |
| `owner_id`            | `UUID`                      | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE`  | The user ID of the company's owner.                                        |
| `avatar_url`          | `TEXT`                      |                                                          | URL for the company's logo or avatar image.                                |
| `banner_url`          | `TEXT`                      |                                                          | URL for the company's banner image.                                         |
| `year_founded`        | `INTEGER`                   |                                                          | The year the company was founded.                                           |
| `business_type`       | `TEXT`                      |                                                          | Type of business (e.g., LLC, Corporation, Sole Proprietorship).             |
| `employee_count`      | `TEXT`                      |                                                          | Approximate number of employees (e.g., "1-10", "11-50").                    |
| `revenue_range`       | `TEXT`                      |                                                          | Approximate annual revenue range (e.g., "$0-$1M", "$1M-$5M").               |
| `social_media_links`  | `JSONB`                     |                                                          | JSONB object storing social media profile URLs (e.g., {"linkedin": "url", "twitter": "url"}). |
| `certifications`      | `TEXT[]`                    |                                                          | Array of certifications held by the company.                               |
| `tags`                | `TEXT[]`                    |                                                          | Array of tags or keywords associated with the company.                      |
| `street_address`      | `TEXT`                      |                                                          | The company's street address.                                               |
| `city`                | `TEXT`                      |                                                          | The city where the company is located.                                      |
| `province`            | `VARCHAR(2)`                | `CHECK (province IN ('AB', 'BC', ...))`                | Canadian province or territory code.                                        |
| `postal_code`         | `VARCHAR(7)`                |                                                          | Canadian postal code (e.g., A1A 1A1).                                       |
| `country`             | `TEXT`                      | `DEFAULT 'Canada'`                                       | Country of the company.                                                     |
| `major_metropolitan_area`| `TEXT`                   |                                                          | Selected major metropolitan area. (View alias: `metro_area`)                |
| `other_metropolitan_area_specify`| `TEXT`             |                                                          | Specific metropolitan area if 'Other' is chosen for `major_metropolitan_area`. |
| `contact_person_name` | `TEXT`                      |                                                          | Name of the primary contact person for the company. (View alias: `contact_name`) |
| `contact_person_email`| `TEXT`                      |                                                          | Email of the primary contact person. (View alias: `contact_email`)          |
| `contact_person_phone`| `TEXT`                      |                                                          | Phone number of the primary contact person. (View alias: `contact_phone`)   |
| `services`            | `TEXT[]`                    |                                                          | Array of services offered by the company.                                   |
| `verification_status` | `VARCHAR(25)`               | `DEFAULT 'UNVERIFIED'`, `NOT NULL`, `CHECK (verification_status IN ('UNVERIFIED', 'TIER1_PENDING', 'TIER1_VERIFIED', 'TIER1_REJECTED', 'TIER2_PENDING', 'TIER2_FULLY_VERIFIED', 'TIER2_REJECTED'))` | Current verification status of the company. Managed by admins.              |
| `admin_notes`         | `TEXT`                      |                                                          | Notes added by administrators regarding the company or its verification.    |
| `self_attestation_completed` | `BOOLEAN`            | `DEFAULT FALSE`, `NOT NULL`                              | Indicates if Tier 1 self-attestation is complete. (View alias: `tier1_self_attestation_completed`) |
| `business_number`     | `TEXT`                      |                                                          | Official business registration number for Tier 1.                           |
| `public_presence_links`| `TEXT[]`                   |                                                          | Array of URLs for public presence (Tier 1).                                 |
| `tier2_submission_date`| `TIMESTAMPTZ`              |                                                          | Timestamp when Tier 2 verification was submitted.                           |
| `tier2_document_type` | `TEXT`                      |                                                          | Type of document submitted for Tier 2 (e.g., 'articles_of_incorporation').   |
| `tier2_document_filename`| `TEXT`                   |                                                          | Original filename of the Tier 2 document.                                   |
| `tier2_document_storage_path`| `TEXT`               |                                                          | Storage path of the uploaded Tier 2 document.                              |
| `tier2_document_uploaded_at`| `TIMESTAMPTZ`          |                                                          | Timestamp when the Tier 2 document was uploaded.                            |
| `tier2_articles_of_incorporation_url` | `TEXT`      |                                                          | Storage URL for Articles of Incorporation (Tier 2).                         |
| `tier2_business_license_url` | `TEXT`               |                                                          | Storage URL for Business License (Tier 2).                                  |
| `tier2_proof_of_address_url` | `TEXT`               |                                                          | Storage URL for Proof of Address (Tier 2).                                  |
| `tier2_photo_id_url`  | `TEXT`                      |                                                          | Storage URL for Photo ID of authorized person (Tier 2).                      |

### 2.2. View: `public.companies_view`

To control data exposure and provide a comprehensive, denormalized view of company data for frontend consumption, `public.companies_view` is used. It includes all relevant fields from `public.companies` and provides user-friendly aliases.

-   **Purpose:** Offers a primary, consistent, and "public-safe" version of company data for general querying and frontend display, excluding raw `admin_notes` from direct unrestricted access (RLS on the base table still applies). It incorporates all current company profile fields.
-   **Definition (Conceptual - Refer to `20250521000000_update_companies_view.sql` for exact DDL):**
    The view selects all fields listed in the `public.companies` table schema above, applying aliases where noted (e.g., `major_metropolitan_area` AS `metro_area`, `contact_person_name` AS `contact_name`, `self_attestation_completed` AS `tier1_self_attestation_completed`).
    It is defined with `CREATE OR REPLACE VIEW public.companies_view AS SELECT ... FROM public.companies;` and includes all general profile, contact, address, and tiered verification fields.

### 2.3. Key Functions

#### `public.get_user_companies(p_user_id UUID)`

-   **Purpose:** Fetches all companies owned by a specific user, primarily for populating user-specific dashboards and selectors.
-   **Returns:** `SETOF public.companies_view`. This ensures that the function returns the most up-to-date and comprehensive set of company fields as defined in the `companies_view`.
-   **Security:** `SECURITY DEFINER`.
-   **Usage:** Called by frontend components like `CompanySelector.tsx` and the user's company management page (`/dashboard/companies`) to populate lists of companies for the current user.
    ```sql
    -- Conceptual representation, actual function refers to the dynamic view
    CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
    RETURNS SETOF public.companies_view
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT * -- All columns from companies_view
      FROM public.companies_view
      WHERE owner_id = p_user_id;
    $$;
    ```

### 2.4. Row Level Security (RLS) on `public.companies`

RLS is enabled and forced on `public.companies` to ensure data access is strictly controlled.

-   **General Viewing (via View):**
    -   `CREATE POLICY "Authenticated users can view company data via view" ON public.companies FOR SELECT TO authenticated USING (true);`
    -   This allows authenticated users to select rows from `public.companies`. Column visibility for general users is typically managed by querying through `public.companies_view`. Sensitive data like `admin_notes` is protected by this indirection, though direct table RLS for admins still allows its access.
-   **Owner Permissions:**
    -   **Insert:** Owners can create new companies.
        -   `CREATE POLICY "Owners can insert their companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_id);`
    -   **Update (Standard Fields):** Owners can update the general details of their own companies.
        -   `CREATE POLICY "Owners can update their companies" ON public.companies FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);`
        -   *Note: Specific fields like `verification_status` and `admin_notes` are further protected by a trigger (see below). Tier submission fields are generally updated via RPCs.*
    -   **Delete:** Owners can delete their own companies.
        -   `CREATE POLICY "Owners can delete their companies" ON public.companies FOR DELETE USING (auth.uid() = owner_id);`
-   **Admin Permissions:** (Typically requires `internal.ensure_admin()` to pass, or `internal.is_admin(auth.uid())` to be true in policy definitions)
    -   **Select:** Admins can select all data (including `admin_notes`) directly from the `public.companies` table.
        -   `CREATE POLICY "Admins can select all company data" ON public.companies FOR SELECT TO authenticated USING (internal.is_admin(auth.uid()));`
    -   **Update:** Admins can update any field on any company, including `verification_status` and `admin_notes`, typically via RPCs like `admin_update_company_verification`.
        -   `CREATE POLICY "Admins can update any company" ON public.companies FOR UPDATE TO authenticated USING (internal.is_admin(auth.uid())) WITH CHECK (internal.is_admin(auth.uid()));`

### 2.5. Triggers

#### `internal.prevent_owner_update_restricted_company_fields()`

-   **Event:** `BEFORE UPDATE ON public.companies FOR EACH ROW`
-   **Purpose:** Prevents company owners (who are not also admins) from directly modifying the `verification_status` or `admin_notes` fields. These fields are intended to be managed solely by administrators or specific RPCs.
-   **Logic:**
    ```sql
    CREATE OR REPLACE FUNCTION internal.prevent_owner_update_restricted_company_fields()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      -- Check if the user performing the update is the owner AND not an admin
      IF OLD.owner_id = auth.uid() AND NOT internal.is_admin(auth.uid()) THEN
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
          RAISE EXCEPTION 'As a company owner, you cannot directly change the verification_status. Please use the appropriate application process.';
        END IF;
        IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
          RAISE EXCEPTION 'As a company owner, you cannot change admin_notes.';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
    ```
    *Note: Admin checks within functions increasingly use `internal.ensure_admin()` which raises an error directly if not an admin.*

## 3. Frontend Components & Pages

Key frontend elements involved in general company management:

-   **Company List Page (`cando-frontend/src/app/dashboard/companies/page.tsx`):**
    -   Displays a list of companies owned by the logged-in user.
    -   Uses `get_user_companies` RPC.
    -   Shows company name, avatar, verification status.
    -   Links to "Create New Company" (`/company/new`) and "Edit Company" (`/company/[id]/edit`).
-   **Company Creation Page (`cando-frontend/src/app/company/new/page.tsx`):**
    -   Hosts the `CompanyForm.tsx` component for creating a new company. This includes fields for the initial company profile.
-   **Company Profile Page (`cando-frontend/src/app/company/[id]/page.tsx`):**
    -   Displays the detailed public profile of a company, using data from `companies_view`.
    -   Includes all relevant company information: description, industry, contact details, services, verification status, etc.
    -   For company owners, this page provides a link/button to the "Edit Profile" page (`/company/[id]/edit`).
-   **Company Edit Page (`cando-frontend/src/app/company/[id]/edit/page.tsx`):**
    -   Hosts the `CompanyForm.tsx` component for editing an existing company's details. This form allows modification of all editable company profile fields.
-   **Company Form (`cando-frontend/src/components/company/CompanyForm.tsx`):**
    -   The reusable form for creating and editing company details. It has been updated to include all new company profile fields (e.g., `banner_url`, `year_founded`, `employee_count`, `revenue_range`, `business_type`, `social_media_links`, `certifications`, `tags`, address fields, contact info, services).
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
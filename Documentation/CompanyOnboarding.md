# Company Onboarding & Management (User-Facing)

## 1. Overview

Company onboarding refers to the process by which users create and set up their company profiles on the platform. Users can own multiple companies and manage their details. The system is designed to be straightforward, guiding users through form-based inputs for company information.

## 2. Key User Flows

### 2.1. Creating a New Company

1.  **Access Point:** Users can typically initiate company creation from:
    *   The `CompanySelector` component (often in the site header), which has a "Create New Company" link.
    *   The "Manage Your Companies" page (`/dashboard/companies`), which also has a "Create New Company" button.
2.  **Navigation:** Users are directed to the `/company/new` page.
3.  **Form Interaction:** The `CompanyForm.tsx` component is rendered, allowing the user to input details such as:
    *   Company Name (required)
    *   Description
    *   Website
    *   Industry
    *   Avatar URL (for company logo)
    *   Banner URL (optional, for company profile page header)
    *   Year Founded
    *   Business Type
    *   Employee Count range
    *   Revenue Range
    *   Street Address
    *   City
    *   Province/Territory (`province`, required)
    *   Major Metropolitan Area (required, conditional based on Province)
    *   Other (Specify) Metropolitan Area (required if "Other" is selected for Major Metro Area)
    *   Postal Code
    *   Country (defaults to 'Canada')
    *   Contact Person Name (required)
    *   Contact Person Email
    *   Contact Person Phone
    *   Services (`services`, required, allows custom entries)
    *   Social Media Links (e.g., LinkedIn, Twitter, etc. - repeatable fields)
    *   Certifications (repeatable fields)
    *   Tags/Keywords (repeatable fields)
4.  **Submission:** Upon submission, the form data is used to create a new record in the `public.companies` table.
    *   The `owner_id` is automatically set to the current authenticated user's ID (`auth.uid()`).
    *   The `verification_status` defaults to 'unverified'.
5.  **Outcome:** After successful creation, the user might be redirected to the "Manage Your Companies" page or the newly created company's profile/edit page.

### 2.2. Editing an Existing Company

1.  **Access Point:** Users can edit companies they own from:
    *   The "Manage Your Companies" page (`/dashboard/companies`), which lists their companies with an "Edit" link for each.
    *   The Company Profile page (`/company/[id]`), which will have an "Edit Profile" button for company owners.
2.  **Navigation:** Users are directed to `/company/[id]/edit`, where `[id]` is the UUID of the company to be edited.
3.  **Form Interaction:** The `CompanyForm.tsx` component is rendered, pre-filled with the existing details of the selected company, allowing modification of all fields listed in section 2.1.3.
4.  **Submission:** Upon submission, the updated data modifies the corresponding record in the `public.companies` table.
    *   RLS policies ensure only the `owner_id` can update their company.
    *   The `internal.prevent_owner_update_restricted_company_fields` trigger prevents owners from changing `verification_status` or `admin_notes`.
5.  **Outcome:** User is typically returned to the "Manage Your Companies" page or sees a success confirmation.

### 2.3. Managing Multiple Companies

1.  **Viewing Companies:** The `/dashboard/companies` page (`ManageCompaniesPage.tsx`) lists all companies owned by the user, showing their name, avatar, and current `verification_status`.
2.  **Switching Active Company:** The `CompanySelector.tsx` component (usually in the header) allows users to easily switch their "active" or currently selected company if the application uses such a concept for context (e.g., for posting content, sending messages as a company). The `CompanySelector` itself displays the list of user's companies and their verification statuses.

## 3. Frontend Components

-   **`cando-frontend/src/app/company/new/page.tsx`:**
    -   Page wrapper for creating a new company.
    -   Renders `CompanyForm.tsx`.
-   **`cando-frontend/src/app/company/[id]/page.tsx` (`CompanyProfilePage`):**
    -   Displays the detailed public profile of a specific company.
    -   Fetches company data (from `companies_view`) based on the ID in the URL.
    -   For company owners, it provides a link/button to the edit page (`/company/[id]/edit`).
-   **`cando-frontend/src/app/company/[id]/edit/page.tsx` (`EditCompanyPage`):**
    -   Page wrapper for editing an existing company.
    -   Fetches company data based on the ID in the URL to pre-fill the form.
    -   Renders `CompanyForm.tsx` pre-filled with data.
-   **`cando-frontend/src/components/company/CompanyForm.tsx`:**
    -   A reusable React component providing the form fields for company details (including new address fields, `major_metropolitan_area`, `other_metropolitan_area_specify`, contact details, services, and removing the old `location` field).
    -   Handles form state, validation (Zod schema), and submission logic (calling Supabase client to insert/update).
-   **`cando-frontend/src/app/dashboard/companies/page.tsx` (`ManageCompaniesPage`):**
    -   Displays a list of companies owned by the current user.
    -   Fetches data using the `get_user_companies` RPC (which returns `companies_view` data).
    -   Provides links to create new companies and edit existing ones.
-   **`cando-frontend/src/components/company/CompanySelector.tsx`:**
    -   Dropdown component allowing users to see their companies and their verification status.
    -   Used for quick selection/switching of the active company context.
    -   Links to `/company/new` and `/dashboard/companies`.
    -   Fetches data using `get_user_companies` RPC.

## 4. Backend Considerations

-   **RLS Policies:** Ensure that users can only create companies with themselves as `owner_id`, and can only update/delete companies they own. (Refer to `Documentation/Companies.md` for detailed RLS).
-   **Default Values:** `verification_status` defaults to 'unverified' when a new company is created.
-   **Data Integrity:** The `owner_id` foreign key constraint ensures company ownership is tied to a valid user in `auth.users`.

## 5. User Experience Notes

-   The onboarding process is form-driven and should be intuitive.
-   Displaying the `verification_status` in the `CompanySelector` and on the `ManageCompaniesPage` provides users with immediate feedback on the status of their company profiles.
-   Clear access points to create, view, and edit companies are crucial for a good user experience. 
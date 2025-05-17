# Frontend Code Structure Overview

This document provides a high-level overview of the frontend code structure located in `cando-frontend/src/`.

## Key Directories

*   **`src/app/`**:
    *   **Purpose**: Contains the main pages, layouts, and routing logic for the Next.js application. Each subdirectory typically corresponds to a major section or feature of the site.
    *   **Subdirectories of Note**:
        *   `admin/`: Pages related to administrative functionalities (e.g., company verification).
        *   `auth/`: Pages for authentication flows (login, signup, password reset, etc.).
        *   `company/`: Handles company-related functionalities. This includes:
            *   `new/page.tsx`: Page for creating a new company profile.
            *   `[id]/page.tsx`: Page for viewing a specific company's public profile.
            *   `[id]/edit/page.tsx`: Page for editing an existing company's profile.
            *   `[id]/apply-for-verification/page.tsx`: Page for a company to apply for basic verification.
            *   `[id]/apply-for-tier2-verification/page.tsx`: Page for a company to apply for Tier 2 verification.
        *   `dashboard/`: User dashboard pages, potentially including company management overviews (`dashboard/companies/page.tsx`).
        *   `feed/`: Pages related to the main content feed.
        *   `messages/`: UI for the user-to-user messaging system.
        *   `rfq/`: Pages for Request for Quote functionalities.
    *   **Root Files**:
        *   `layout.tsx`: The main root layout for the application.
        *   `page.tsx`: The main entry page for the application (often the homepage).
        *   `globals.css`: Global CSS styles.

*   **`src/components/`**:
    *   **Purpose**: Houses reusable UI components that are used across different pages and features.
    *   **Subdirectories of Note**:
        *   `admin/`: Components specific to the admin interface (e.g., `CompanyVerificationTable.tsx`).
        *   `auth/`: Components used in authentication forms and flows.
        *   `company/`: Components related to company profiles, forms (e.g., `CompanyForm.tsx`), and selection (e.g., `CompanySelector.tsx`). This would also be where components for the verification application process are located.
        *   `feed/`: Components used in the content feed.
        *   `layout/`: Components related to the overall site layout (e.g., header, footer, navigation).
        *   `messages/`: Components for the messaging interface (e.g., message lists, input fields).

*   **`src/lib/`**:
    *   **Purpose**: Contains libraries, helper functions, custom hooks, and Supabase client configurations.
    *   **Subdirectories/Files of Note**:
        *   `hooks/`: Custom React hooks for managing state and side effects (e.g., `useMessages.ts`).
        *   `utils/`: General utility functions.
        *   `supabase.ts`: Configuration and helper functions for interacting with the Supabase backend.
        *   `auth.ts`: Authentication-related helper functions.
        *   `messages.ts`: Logic related to fetching and sending messages.

*   **`src/types/`**:
    *   **Purpose**: Stores TypeScript type definitions and interfaces.
    *   **Files of Note**:
        *   `supabase.ts`: Often contains types automatically generated from the Supabase database schema, providing type safety for database interactions.
        *   `admin.ts`, `feed.ts`: Custom types specific to those domains.

*   **`src/middleware.ts`**:
    *   **Purpose**: Next.js middleware for executing code on requests before they are processed by a page. Often used for authentication checks, redirects, or modifying request/response headers.

## Company Verification Flow Frontend Touchpoints ( अनुमानित)

Based on the project structure and previous documentation:

*   **User Applying for Verification:**
    *   Likely starts from a company management page (e.g., within `src/app/company/[id]/` or `src/app/dashboard/companies/`).
    *   The form to submit verification details would be a component in `src/components/company/`, possibly within a page like `src/app/company/[id]/apply-for-verification/page.tsx`.
*   **Admin Reviewing Verification:**
    *   The admin dashboard page at `src/app/admin/page.tsx`.
    *   The table displaying companies for verification, `CompanyVerificationTable.tsx`, would be in `src/components/admin/`.
*   **Data Fetching & Submission:**
    *   Functions to call Supabase RPCs (like `request_company_tier1_verification` or `admin_update_company_verification`) would likely be defined in `src/lib/` files or directly within the relevant page/component server/client actions. 
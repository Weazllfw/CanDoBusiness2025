# Test Scripts and Data Management

This document outlines the scripts and data generation utilities used for development and testing purposes. It is crucial to review these components and ensure they are not inadvertently used or deployed to a production environment, as they may populate the system with test data or expose sensitive configurations.

## 1. Development Data Seeding Script

*   **Script Location:** `scripts/seed-dev-data.js`
*   **Purpose:** Populates the database with a configurable number of test users, companies, posts (as users and as companies), and comments. This is essential for testing features like the social feed, company profiles, user interactions, and the "post as" functionality.
*   **How to Run:**
    *   Add the script to `package.json`:
        ```json
        "scripts": {
          // ... other scripts
          "db:seed:dev": "node ./scripts/seed-dev-data.js"
        },
        ```
    *   Execute: `npm run db:seed:dev`
*   **Environment Variables Required:**
    *   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (provides admin-level access to the database, necessary for creating users directly and bypassing RLS for seeding).
    *   The script includes fallbacks for local development but will warn if the service key is a placeholder.
*   **Production Consideration:** **DO NOT** run this script in a production environment. It will populate your live database with test data. Ensure any calls to this script are removed or disabled in production deployment processes.

## 2. Admin User Setup Script

*   **Script Location:** `scripts/setup-admin.js`
*   **Purpose:** Creates or ensures the existence of a predefined admin user account and associated profile. This is used for initial administrative setup.
*   **How to Run:** `node ./scripts/setup-admin.js` (or via a `package.json` script if added).
*   **Environment Variables Used:**
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   Admin email and password can be configured within the script (defaults provided).
*   **Production Consideration:** While an admin user is necessary, review the credentials and setup method for production. Using hardcoded default passwords (even if intended to be changed) in scripts that might be version-controlled is a risk. Prefer environment variables for sensitive credentials in production or a more secure initial setup process via Supabase Studio for the first admin.

## 3. Analytics Test Script

*   **Script Location:** `scripts/test-analytics.ts`
*   **Purpose:** Simulates user actions (both regular and Pro-tier) to test the collection of analytics events. Helps verify that analytics are being recorded correctly for different event types.
*   **How to Run:**
    *   From `package.json` (if `test:analytics` script exists):
        ```json
        "scripts": {
          "test:analytics": "ts-node -r tsconfig-paths/register scripts/test-analytics.ts"
        },
        ```
    *   Execute: `npm run test:analytics`
*   **Production Consideration:** This script is purely for testing and should not be part of a production build or run against a production database.

## 4. General Precautions for Production

*   **Environment Variables:** Always use environment variables for sensitive information like API keys, service role keys, and database URLs in production. Do not hardcode them into version-controlled scripts.
*   **Seeding Data:** Test data should be strictly confined to development and staging environments. Production data integrity is paramount.
*   **Script Review:** Before any production deployment, review all scripts in the `scripts` directory (and any other utility scripts) to ensure no development-specific logic or test data generation can accidentally run in production.
*   **Access Control:** Ensure that the Supabase service role key is heavily protected and not exposed client-side or in any non-secure manner.

By maintaining a clear separation between development/testing utilities and production configurations, you can ensure a smoother and safer deployment process. 
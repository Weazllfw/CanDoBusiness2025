# Top Bar Navigation (Header)

## 1. Overview

The top bar navigation, implemented in `Header.tsx`, serves as the primary means of site-wide navigation and provides access to core user functionalities like messaging, account management, and company selection.

## 2. Component Location

-   `cando-frontend/src/components/layout/Header.tsx`

## 3. Key Features and Structure

The `Header` is a client component (`'use client'`) and uses Tailwind CSS for styling and Headless UI for interactive elements like dropdowns.

### 3.1. Logo and Branding

-   Displays the site logo ("CanDo") on the left, linking to the homepage (`/`).

### 3.2. Main Navigation Links

-   Centrally aligned links for key sections of the platform:
    -   **Home:** Links to `/`.
    -   **Network:** Links to `/network`.
    -   **Messages Icon (`EnvelopeIcon`):**
        -   Opens the `MessagesModal` component when clicked.
        -   Includes a visual indicator (green dot) for new messages (logic for this indicator might be abstract or to be implemented).
        -   The `MessagesModal` is also rendered within `Header.tsx` and its visibility is controlled by the `isMessagesOpen` state.

### 3.3. Right-Aligned User Controls

This section is a flex container aligning items to the right of the header.

#### 3.3.1. Company Selector (`CompanySelector.tsx`)

-   **Integration:** The `CompanySelector` component is rendered directly on the top bar, to the left of the user profile dropdown.
-   **Purpose:** Allows authenticated users to:
    -   See their currently selected company (if any) and its verification status.
    -   Open a dropdown to switch between their associated companies.
    -   Access links to "Create New Company" (`/company/new`) and "Manage Companies" (`/dashboard/companies`).
-   **Conditional Rendering:** Only displayed if `user.id` (from `useAuth()` hook) is available.
-   **Styling Considerations:** The `CompanySelector` has its own button styling (white background by default). When placed on the dark red header, its visual integration might require custom styling to match the header theme if desired. It is currently constrained in width (`w-56`).
-   **Data Fetching:** Calls `get_user_companies` RPC to list companies for the `currentUserId`.

#### 3.3.2. User Profile Dropdown (`Menu` from Headless UI)

-   **Trigger:** Displays the user's avatar (or initial if no avatar) and name. Clicking this area opens the dropdown.
-   **User Information:** Fetches user data (name, avatar URL) using the `useAuth()` hook.
-   **Dropdown Items:**
    -   **Account Management:** Links to `/account`.
    -   **Manage Companies:** Links to `/dashboard/companies` (providing direct access to the full company management page, complementing the `CompanySelector`).
    -   **(Separator)**
    -   **Sign Out:** Calls the `signOut` function from the `useAuth()` hook.

## 4. State Management

-   `isMessagesOpen` (boolean): Controls the visibility of the `MessagesModal`.
-   User data (`user`, `signOut`): Managed by the `useAuth()` custom hook.
-   Current pathname (`pathname` from `usePathname()`): Used to highlight active navigation links.
-   The `CompanySelector` manages its own internal state for the list of companies, selected company, and loading/error states.

## 5. Technical Details

-   **Authentication:** Relies on `useAuth()` to get the current user's status and details. This is crucial for displaying user-specific information and controlling access to features like the `CompanySelector` and the user dropdown content.
-   **Client-Side Rendering:** As a client component, it handles user interactions and dynamic content updates directly in the browser.
-   **Modularity:** Integrates other components like `MessagesModal` and `CompanySelector`.

## 6. User Experience

-   Provides persistent and easy access to main site sections.
-   Consolidates user-specific actions (account, company management, sign out) under a profile dropdown.
-   Offers immediate company switching and creation capabilities via the integrated `CompanySelector`.
-   Visual feedback for active links and new messages enhances usability. 
# Frontend Code Structure Overview

This document provides a high-level overview of the frontend code structure located in `cando-frontend/src/`.

## 1. Key Directories

### 1.1. `src/app/` (Next.js App Router)

*   **Purpose**: Contains the main pages, layouts, and routing logic using Next.js App Router architecture.
*   **Key Files**:
    *   `layout.tsx`: Root layout with common elements (header, footer).
    *   `page.tsx`: Homepage/landing page.
    *   `globals.css`: Global styles using Tailwind CSS.
    *   `metadata.ts`: Next.js metadata configuration.
*   **Key Subdirectories**:
    *   `admin/`: Administrative interfaces
        *   `page.tsx`: Main admin dashboard
        *   `flags/`: Content moderation interface
        *   `verifications/`: Company verification management
    *   `auth/`: Authentication flows
        *   `login/`: Login page
        *   `signup/`: Registration page
        *   `reset-password/`: Password reset flow
    *   `company/`: Company-related pages
        *   `new/`: Company creation
        *   `[id]/`: Company profile and management
        *   `[id]/edit/`: Company editing
        *   `[id]/apply-for-verification/`: Verification application
        *   `[id]/apply-for-tier2-verification/`: Tier 2 verification
    *   `dashboard/`: User dashboard pages
        *   `companies/`: Company management overview
    *   `feed/`: Social feed pages
    *   `messages/`: Messaging interface
    *   `rfq/`: Request for Quote functionality

### 1.2. `src/components/`

*   **Purpose**: Reusable UI components organized by feature domain.
*   **Key Subdirectories**:
    *   `admin/`: Admin interface components
        *   `CompanyVerificationTable.tsx`
        *   `FlaggedContentTable.tsx`
    *   `auth/`: Authentication components
        *   `LoginForm.tsx`
        *   `SignupForm.tsx`
    *   `company/`: Company-related components
        *   `CompanyForm.tsx`
        *   `CompanySelector.tsx`
        *   `CompanyCard.tsx`
    *   `feed/`: Social feed components
        *   `FeedList.tsx`
        *   `PostItem.tsx`
        *   `CreatePostForm.tsx`
    *   `layout/`: Layout components
        *   `Header.tsx`
        *   `Footer.tsx`
        *   `Sidebar.tsx`
    *   `messages/`: Messaging components
        *   `MessagesModal.tsx`
        *   `ThreadList.tsx`
        *   `MessageInput.tsx`
    *   `notifications/`: Notification components
        *   `NotificationBell.tsx`
        *   `NotificationDropdown.tsx`

### 1.3. `src/lib/`

*   **Purpose**: Utility functions, hooks, and service integrations.
*   **Key Files/Modules**:
    *   `supabase.ts`: Supabase client configuration
    *   `hooks/`: Custom React hooks
        *   `useAuth.ts`: Authentication state management
        *   `useMessages.ts`: Messaging functionality
        *   `useNotifications.ts`: Notification management
    *   `utils/`: Helper functions
        *   `validation.ts`: Form validation utilities
        *   `formatting.ts`: Data formatting utilities
    *   `api/`: API integration functions
        *   `companies.ts`: Company-related API calls
        *   `messages.ts`: Messaging API calls
        *   `posts.ts`: Social feed API calls

### 1.4. `src/types/`

*   **Purpose**: TypeScript type definitions.
*   **Key Files**:
    *   `supabase.ts`: Generated Supabase database types
    *   `admin.ts`: Admin interface types
    *   `company.ts`: Company-related types
    *   `feed.ts`: Social feed types
    *   `messages.ts`: Messaging system types

## 2. Key Features Implementation

### 2.1. Authentication Flow
*   Implemented in `src/app/auth/` pages
*   Uses Supabase Auth
*   Protected routes via middleware
*   User state management with `useAuth` hook

### 2.2. Company Management
*   Company creation/editing forms in `src/components/company/`
*   Verification flow in dedicated pages
*   Company selector in header for context switching

### 2.3. Social Feed
*   Main feed implementation in `src/app/feed/`
*   Post creation and interaction components
*   Real-time updates using Supabase subscriptions

### 2.4. Messaging System
*   Modal-based interface via `MessagesModal`
*   Real-time message delivery
*   Conversation management
*   Welcome message automation

### 2.5. Admin Interface
*   Dashboard with statistics
*   Company verification management
*   Content moderation tools
*   Admin-only routes protection

## 3. State Management

*   **Authentication**: Managed via `useAuth` custom hook
*   **Real-time Data**: Supabase subscriptions for messages, notifications
*   **Forms**: React Hook Form with Zod validation
*   **UI State**: React useState/useReducer for component state

## 4. Styling

*   **Framework**: Tailwind CSS
*   **Components**: Mix of custom components and Headless UI
*   **Responsive Design**: Mobile-first approach
*   **Theme**: Consistent color scheme and spacing

## 5. Performance Considerations

*   **Code Splitting**: Automatic through Next.js
*   **Image Optimization**: Next.js Image component
*   **Caching**: Supabase query caching
*   **Real-time**: Selective subscriptions

## 6. Security

*   **Authentication**: Supabase Auth integration
*   **Route Protection**: Middleware checks
*   **Admin Routes**: Double verification (frontend + backend)
*   **API Access**: Supabase RLS policies

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
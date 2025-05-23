# CanDoBusiness2025 - MVP Roadmap

## 1. Introduction

This document outlines the roadmap to achieving a Minimum Viable Product (MVP) for the CanDo Business Network platform. The goal is to launch a stable, core-functional version of the application that allows users to connect, companies to establish a presence, and basic social interactions to occur. This roadmap takes into account the current state of development, existing documentation, and the recent refactoring that removed the user trust and reputation system.

## 2. Definition of MVP

The MVP for CanDoBusiness2025 will include the following core features:

**User Management:**
*   User registration (email/password), login, logout.
*   Basic user profile creation and editing (name, avatar).

**Company Management:**
*   Users can create and manage basic company profiles (name, description, avatar, industry, website).
*   Publicly viewable company profile pages.
*   **Tier 1 Company Verification:**
    *   Companies can apply for Tier 1 verification (submitting business number, self-attestation).
    *   Admins can review, approve/reject Tier 1 applications, and add notes.
    *   Users are notified of verification status changes.
    *   A "Verified" indicator is displayed on Tier 1 verified company profiles.

**Social Feed & Interaction:**
*   Users can create text posts (optionally with a single image).
*   Users can post as themselves or as a company they administer.
*   A chronological or simple relevance-based feed displaying posts from other users and companies.
*   Clear indication of posts made "as a company" (showing company name/logo and author).
*   Users can "Like" posts.
*   Users can comment on posts.
*   **Verified Company Commenter Badge:** If a commenter is an admin of a Tier 1 verified company, a badge indicating this affiliation will be displayed with their comment.

**Networking:**
*   **User-to-User Connections:**
    *   Send, accept, decline, and remove connection requests.
    *   View list of own connections, incoming pending, and outgoing pending requests.
*   **User-to-Company Follows:**
    *   Users can follow and unfollow companies.
    *   View a list of companies they follow.

**Messaging:**
*   Direct messaging between connected users.
*   Users can message Tier 1 Verified Companies (and admins of those companies can reply).
*   Users (as admins of their company) can send messages as their company to connected users or other Tier 1 Verified Companies.
*   Conversation list view.
*   Message history view within a conversation.
*   Unread message indicators.
*   Automated welcome message to new users upon registration.

**Notifications (Essential):**
*   In-app notifications for:
    *   New connection request received.
    *   Connection request accepted.
    *   New direct message received.
    *   Company Tier 1 verification status change.
    *   (Basic) User's content flagged/actioned by admin.
*   Notification indicator in the top navigation bar with a simple dropdown list.

**Content Moderation (Basic):**
*   Users can flag posts and comments for review.
*   Admins can view a list of flagged content.
*   Admins can take basic actions (e.g., mark as resolved, remove content which hides it from view).

**Admin System (Basic):**
*   Secure admin login and access to a simplified admin dashboard.
*   View lists of users and companies (primarily for verification purposes).
*   Access to the flagged content queue and moderation tools.

**Platform Basics:**
*   Functional top bar navigation for MVP features.
*   User menu with links to profile and logout.
*   Basic responsive design for core pages on common devices.
*   Default "Free" tier for all users.

## 3. High-Level Status Summary

*   **User & Company Management:** Core tables (`profiles`, `companies`) and basic CRUD operations seem largely in place. Tier 1 verification backend logic (RPCs, admin table) exists. Frontend forms (`CompanyForm`) and pages are present.
*   **Social Feed:** Backend (`posts`, `post_likes`, `post_comments` tables, `get_feed_posts`, `get_post_comments_threaded` RPCs) exists. The `get_feed_posts` RPC needs simplification as it previously relied on the now-removed trust levels. Frontend for feed display (`feed/page.tsx`, `PostFeed.tsx`), post creation, likes, and comments exists but needs adjustment to remove trust level dependencies and ensure `acting_as_company` is robust.
*   **Networking:** User-to-user connections (tables, RPCs, frontend `UserConnectButton`, `/network/people` page) are substantially complete. User-to-company follows (tables, RPCs, basic UI) are also in place.
*   **Messaging:** Core tables (`messages`), RPCs (`send_message`, `get_conversations`, `get_messages_for_conversation`), and frontend (`MessagesModal.tsx`, `useMessages` hook) are well-developed and support user-to-user and basic company interactions. "Send as company" is implemented.
*   **Admin & Moderation:** Admin identification, dashboard basics, company verification table, and content flagging RPCs/tables (`post_flags`, `comment_flags`) are present. Admin UI for these seems functional.
*   **Notifications:** Backend table (`user_notifications`) and RPCs exist. Frontend hook (`useNotifications`) and basic UI (`NotificationBell`) are implemented. Generation points for MVP events need to be ensured.
*   **Rollback Impact:** The removal of user trust levels, detailed profile fields (bio, skills), and related RPCs/triggers simplifies the MVP by removing complex ranking and badging logic but requires careful cleanup in areas of the codebase that might still reference them.

## 4. Roadmap to MVP

This roadmap is divided into phases. Tasks within phases can often be parallelized.

---

### **Phase 1: Foundation & Core Profile Stabilization (Priority: Critical)**

*Goal: Ensure stable user authentication, user profiles, company creation, and the simplified feed data model.*

1.  **Task: Full Code Review & Cleanup Post-Rollback.**
    *   **Description:** Systematically review backend (RPCs, functions, triggers, RLS policies) and frontend (components, hooks, pages) to remove all references to `trust_level`, `user_trust_level_enum`, and other removed profile fields (`bio`, `professional_headline`, `industry`, `skills`, `linkedin_url`, `is_email_verified`).
    *   **Backend:** `supabase/migrations/` (especially RPCs like old `get_feed_posts`, `get_user_network` if they have remnants), RLS policies.
    *   **Frontend:** `cando-frontend/src/` (search for `trustLevel`, `isVerified` on user objects, etc.).
    *   **Effort:** Medium
    *   **Depends on:** N/A

2.  **Task: Stabilize User Authentication & Basic Profile.**
    *   **Description:** Ensure sign-up, login, logout are flawless. Solidify `public.profiles` table for MVP fields (name, avatar). Test `internal_upsert_profile_for_user`.
    *   **Backend:** `auth.users`, `public.profiles`, relevant RLS.
    *   **Frontend:** `src/app/auth/`, `src/lib/hooks/useAuth.ts`, profile display/edit components.
    *   **Effort:** Low-Medium
    *   **Depends on:** Task 1.

3.  **Task: Stabilize Basic Company Creation & Profile.**
    *   **Description:** Ensure users can create companies with MVP fields (name, description, avatar, industry, website). Test `CompanyForm.tsx` for create/edit of these basic fields. Ensure `public.companies` and `public.companies_view` are clean.
    *   **Backend:** `public.companies` table, `get_user_companies` RPC.
    *   **Frontend:** `src/app/company/new/page.tsx`, `src/app/company/[id]/edit/page.tsx`, `src/components/company/CompanyForm.tsx`.
    *   **Effort:** Medium
    *   **Depends on:** Task 1.

4.  **Task: Simplify and Stabilize `get_feed_posts` RPC.**
    *   **Description:** Modify the `public.get_feed_posts` RPC to remove any logic related to user trust levels, `p_minimum_trust_level` parameter, and complex ranking scores based on trust. Implement a simpler default sort (e.g., chronological descending). Ensure it correctly returns `acting_as_company_*` details. The `p_feed_type` parameter functionality (e.g., 'ALL', 'CONNECTIONS', 'FOLLOWED_COMPANIES') can be retained if backend logic is straightforward without trust.
    *   **Backend:** `supabase/migrations/..._update_get_feed_posts_for_platform_interaction.sql` (or its current live version).
    *   **Frontend:** N/A for this task (frontend will adapt in Phase 2).
    *   **Effort:** Medium
    *   **Depends on:** Task 1.

---

### **Phase 2: Core Social & Networking Features (Priority: High)**

*Goal: Enable core interactions: posting, feed viewing, likes, comments, connections, follows.*

1.  **Task: Implement Social Feed Posting & Display (Simplified).**
    *   **Description:**
        *   Ensure `CreatePost.tsx` allows posting as self or admin's company (MVP fields: text, optional single image).
        *   `feed/page.tsx` should use the simplified `get_feed_posts` RPC. Remove UI elements for trust-level filtering. Ensure `feedType` filter (if retained) works with the simplified RPC.
        *   `PostFeed.tsx` / `PostCard.tsx` to display posts, author info (user/acting_as_company), content, likes, comments. Remove user trust/verification badges.
    *   **Backend:** `public.posts`, `public.get_feed_posts` (simplified).
    *   **Frontend:** `src/app/feed/page.tsx`, `src/components/feed/CreatePost.tsx`, `src/components/feed/PostFeed.tsx`.
    *   **Effort:** Medium
    *   **Depends on:** Phase 1 (Task 4).

2.  **Task: Implement Post Likes & Basic Comments.**
    *   **Description:** Ensure liking/unliking posts (`toggle_post_like` RPC) works. Ensure users can add comments (`add_post_comment` RPC). Display like counts and comment counts. `CommentList.tsx` to show comments.
    *   **Backend:** `public.post_likes`, `public.post_comments`, `toggle_post_like`, `add_post_comment`.
    *   **Frontend:** `LikeButton.tsx` (or logic within `PostCard`), `CommentForm.tsx`, `CommentList.tsx`.
    *   **Effort:** Medium
    *   **Depends on:** Phase 2 (Task 1).

3.  **Task: Stabilize User-to-User Connections.**
    *   **Description:** Test and ensure `send_user_connection_request`, `respond_user_connection_request`, `remove_user_connection`, `get_user_connection_status_with`, `get_pending_user_connection_requests`, `get_sent_user_connection_requests`, `get_user_network` RPCs are working correctly.
    *   Frontend: `UserConnectButton.tsx` should be fully functional. `/network/people` page should correctly display connections and pending requests.
    *   **Backend:** `public.user_connections` and related RPCs.
    *   **Frontend:** `src/components/connections/UserConnectButton.tsx`, `src/app/network/people/page.tsx`.
    *   **Effort:** Medium
    *   **Depends on:** Phase 1.

4.  **Task: Implement User-to-Company Follows.**
    *   **Description:** Ensure `follow_company`, `unfollow_company`, `get_company_follow_status`, `get_followed_companies` RPCs are functional. Implement "Follow/Unfollow" button on company profiles.
    *   **Backend:** `public.user_company_follows` and related RPCs.
    *   **Frontend:** Button on `src/app/company/[id]/page.tsx`. A simple list of followed companies (e.g., in user dashboard or network section).
    *   **Effort:** Medium
    *   **Depends on:** Phase 1.

---

### **Phase 3: Messaging, Verification & Basic Moderation (Priority: High)**

*Goal: Enable essential communication, trust-building via Tier 1 verification, and safety via basic moderation.*

1.  **Task: Test and Finalize Core Messaging.**
    *   **Description:** Thoroughly test user-to-connected-user messaging. Test user-to-verified-company messaging. Test "send as company" for admins messaging connected users/verified companies. Ensure `MessagesModal.tsx` and `useMessages.ts` are robust. Test welcome message.
    *   **Backend:** `public.messages`, `send_message`, `get_conversations`, `get_messages_for_conversation` RPCs.
    *   **Frontend:** `src/components/messages/MessagesModal.tsx`, `src/lib/hooks/useMessages.ts`.
    *   **Effort:** Medium
    *   **Depends on:** Phase 2 (Connections), Phase 3 (Tier 1 Verification for company targets).

2.  **Task: Implement Tier 1 Company Verification Flow.**
    *   **Description:**
        *   Frontend form for users to submit Tier 1 info (`request_company_tier1_verification` RPC).
        *   Admin Dashboard: `CompanyVerificationTable.tsx` to display pending Tier 1 applications. Admin actions to approve/reject (`admin_update_company_verification` RPC).
        *   Display "Verified" badge on company profiles/mentions.
    *   **Backend:** `public.companies` (verification fields), relevant RPCs.
    *   **Frontend:** `src/app/company/[id]/apply-for-verification/page.tsx`, `src/components/admin/CompanyVerificationTable.tsx`, UI for badge.
    *   **Effort:** Medium-High
    *   **Depends on:** Phase 1.

3.  **Task: Implement Verified Company Commenter Badge.**
    *   **Description:** Use `get_post_comments_threaded` RPC (which returns `commenter_verified_company_*` fields) to display a badge or note if a commenter is an admin of a Tier 1 verified company.
    *   **Backend:** `get_post_comments_threaded` RPC.
    *   **Frontend:** `src/components/feed/CommentItem.tsx`.
    *   **Effort:** Low-Medium
    *   **Depends on:** Phase 2 (Comments), Phase 3 (Tier 1 Verification).

4.  **Task: Implement Basic Content Flagging & Admin Review.**
    *   **Description:**
        *   Frontend: `FlagButton.tsx` and `FlagModal.tsx` for users to flag posts/comments (`flag_content` RPC).
        *   Admin: `/admin/flags` page to list flagged content (`admin_get_post_flags`, `admin_get_comment_flags` RPCs). Admin action to resolve/remove (`admin_update_post_flag_status`, `admin_update_comment_flag_status`, `admin_remove_post`, `admin_remove_comment` RPCs).
    *   **Backend:** `post_flags`, `comment_flags` tables, related RPCs.
    *   **Frontend:** `src/components/feed/FlagButton.tsx`, `FlagModal.tsx`, `src/app/admin/flags/page.tsx`.
    *   **Effort:** Medium-High
    *   **Depends on:** Phase 2 (Posts, Comments).

---

### **Phase 4: Notifications & Final Polish (Priority: Medium)**

*Goal: Ensure users are informed of key activities and the platform is stable for launch.*

1.  **Task: Implement Essential Notifications.**
    *   **Description:** Ensure backend triggers/RPCs correctly generate notifications in `user_notifications` for MVP events (new connection request/acceptance, new message, Tier 1 verification update, basic content moderation outcome). Test `NotificationBell.tsx` and `useNotifications.ts` hook.
    *   **Backend:** `public.user_notifications` table, notification generation logic within relevant RPCs/triggers.
    *   **Frontend:** `src/components/notifications/NotificationDropdown.tsx`, `src/lib/hooks/useNotifications.ts`.
    *   **Effort:** Medium
    *   **Depends on:** Completion of features that trigger notifications.

2.  **Task: Top Bar Navigation & Core Page Layouts.**
    *   **Description:** Ensure `Header.tsx` and `MainNav.tsx` link correctly to all MVP features. User menu (profile, logout) is functional. Basic responsive layout for key pages.
    *   **Backend:** N/A.
    *   **Frontend:** `src/components/layout/`, `src/app/layout.tsx`.
    *   **Effort:** Medium
    *   **Depends on:** N/A.

3.  **Task: End-to-End Testing & Bug Fixing.**
    *   **Description:** Conduct thorough testing of all MVP features across common browsers and device sizes. Focus on user flows. Address identified bugs.
    *   **Backend & Frontend.**
    *   **Effort:** High
    *   **Depends on:** All other MVP tasks.

4.  **Task: Database Seeding Script Update.**
    *   **Description:** Update `scripts/seed-dev-data.js` to reflect the simplified MVP data model (no trust levels, etc.) and create a good set of test data for all MVP features.
    *   **Effort:** Low-Medium
    *   **Depends on:** Finalized MVP data models.

5.  **Task: Documentation Cleanup.**
    *   **Description:** Review and update key documentation files (`README.md`, system overview docs) to reflect the MVP state, removing references to now-deferred features or outdated information.
    *   **Effort:** Medium
    *   **Depends on:** Finalized MVP feature set.

## 5. Key Features Deferred Post-MVP

*   **User Trust Levels & Reputation System:** All aspects (scoring, badging, filtering).
*   **Detailed User Profiles:** Fields like bio, professional headline, skills, industry, LinkedIn URL.
*   **Advanced Feed Features:** Complex ranking algorithms, `feedType` filters beyond basic, extensive category usage if not simple.
*   **Network Suggestions (PYMK/CYMK).**
*   **Company-to-Company Connections.**
*   **Tier 2 Company Verification.**
*   **Advanced Messaging Capabilities:** Complex `PlatformInteractionModel` rules not covered by MVP.
*   **Full Analytics System for Users:** Data tracking can remain, but user-facing dashboards/analytics are deferred.
*   **Paid Subscriptions & Stripe Integration:** All users on a default free tier for MVP.
*   **Request for Quotes (RFQs).**
*   **Advanced Search Capabilities.**
*   **Rich Text Editor beyond very basic formatting.**
*   **Extensive Multi-Image/Video support in posts if complex.**

This roadmap provides a structured approach. Flexibility will be needed, and priorities might shift based on development realities and feedback. Regular reviews of this roadmap are recommended. 
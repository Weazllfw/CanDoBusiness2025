# Frontend Technical Debt & Areas for Review

This document summarizes findings, TODOs, and areas for improvement identified during the systematic frontend review.

## Core Layout & App Structure (`app/layout.tsx`, `app/page.tsx`, `middleware.ts`)

*   **`app/page.tsx` (Landing Page)**:
    *   "What's new" link (`<a>` tag) has `href="#"`. Should point to a relevant section or be removed.
    *   Links to `/privacy` and `/terms`. Ensure these pages exist.
*   **`components/layout/Sidebar.tsx`**:
    *   Currently contains static "People you may know" data. Needs dynamic data.
    *   Not globally rendered; seems page-specific. Confirm its intended placement and usage.
    *   Styling for "Connect" button color (`#C41E3A`) could be a Tailwind theme color.
*   **`middleware.ts`**: Appears solid. Confirmed `/privacy` and `/terms` are public routes.

## Authentication (`app/auth/`, `components/auth/`)

*   **General**:
    *   Consider adding social login options.
    *   Refine error handling for specific Supabase errors (e.g., email already in use, unverified email on login).
*   **`app/auth/signup/page.tsx`**:
    *   Handles manual profile creation in `public.profiles` after `auth.signUp`.
    *   Email verification flow: Currently redirects to `/feed`. If verification is enabled and required, should redirect to `/auth/verify-email` or a page informing the user to check email. Confirm Supabase email confirmation settings.
    *   Consider client-side password strength feedback.
*   **`app/auth/verify-email/page.tsx`**:
    *   Purely informational. Consider adding a "Resend verification email" option.
*   **`app/auth/reset-password/page.tsx`**:
    *   Relies on `onAuthStateChange` for `PASSWORD_RECOVERY` event, which is correct.
    *   Consider clearer guidance if the recovery token is invalid/expired from the start (if `PASSWORD_RECOVERY` event doesn't fire).
*   **`app/auth/callback/page.tsx`**:
    *   **File is MISSING**. This is crucial for OAuth flows and potentially some email link verification flows. Needs to be created if these features are planned.

## Feed Page (`app/feed/page.tsx`, `components/feed/`)

*   **`app/feed/page.tsx`**:
    *   **RPC `get_feed_posts`**: Review definition, performance, and RLS.
    *   `is_network_post: number` in `FeedPost` type could be SQL boolean.
    *   Analytics: `Analytics.trackSearch` `resultCount` is hardcoded to 0. Update with actual results.
    *   Initial post fetching logic (`useEffect` hooks) could potentially be simplified to avoid redundant calls.
*   **`components/feed/RightSidebar.tsx`**:
    *   Renders `PeopleYouMayKnow` and `CompaniesYouMayKnow`.
    *   Hardcoded `suggestedConnections` array is unused; remove if not needed.
*   **`components/feed/suggestions/CompaniesYouMayKnow.tsx`**:
    *   RPC `get_cymk_suggestions`: Disappearance of CYMK is likely due to this RPC returning no data (as per previous investigations). Component logic seems to handle empty state correctly.
    *   `company_name || 'CanDo Company'`: Investigate why `company_name` might be null from RPC.
    *   RPC `get_company_follow_status`: Used correctly.
    *   RPC `follow_company`: Review this RPC.
*   **`components/feed/suggestions/PeopleYouMayKnow.tsx`**:
    *   RPC `get_pymk_suggestions`: Review this RPC.
    *   `user_name || 'CanDo User'`: Investigate why `user_name` might be null.
    *   `handleConnectionStatusChange`: **Workaround active**. Refresh of PYMK list on connection status change is disabled to prevent infinite loops. This is technical debt; a proper fix is needed for the list to update dynamically.
*   **`components/feed/suggestions/SuggestionCard.tsx`**:
    *   `onConnect` prop seems unused; `UserConnectButton` handles connection. Consider removing prop.
    *   Avatar `api.dicebear.com` check is specific; review avatar strategy.
    *   Relies on `UserConnectButton` (reviewed below).
    *   Link to `/profile/:id` needs profile pages to exist.
*   **`components/connections/UserConnectButton.tsx`**:
    *   Complex component handling various connection states.
    *   **Cancel Sent Request Logic**: Uses direct table delete (`supabase.from('user_connections').delete()`) after fetching request ID via `get_sent_user_connection_requests` RPC. Consider replacing with a single RPC `cancel_user_connection_request` for atomicity and to centralize logic.
    *   `get_pending_user_connection_requests` fetches all for user, then filters. If performance becomes an issue, refine.
    *   Parent `PeopleYouMayKnow` doesn't refresh list due to workaround; button updates its own state correctly.
*   **`components/feed/CreatePost.tsx`**:
    *   Relies on `RichTextEditor` and `FileUpload` (from `messages` dir) - review these.
    *   Uses `compressImage` utility.
    *   **Error Handling**: `// TODO: Provide user feedback (e.g., toast notification)` for submission errors. Implement this.
    *   Storage RLS for `post_media` bucket needs to allow user-specific uploads and public reads.
*   **`components/feed/PostFeed.tsx` (and `PostCard` internal component)**:
    *   **`dangerouslySetInnerHTML`**: Major concern. Content from `RichTextEditor` **MUST** be sanitized to prevent XSS.
    *   TODO: Add Link to user profile for post authors.
    *   Relies on child action buttons (`LikeButton`, `BookmarkButton`, etc.).
    *   Comment system components (`CommentList`, `CommentForm`) are children.
    *   `fetchComments` from `lib/posts.ts` used.
*   **`components/feed/LikeButton.tsx`**:
    *   Uses `likePost`, `unlikePost` from `lib/posts.ts`. Review these library functions and their underlying RPCs/table access.
    *   Error feedback to user is minimal (console). Consider toasts for failures.
*   **`components/feed/BookmarkButton.tsx`**:
    *   Uses RPC `toggle_post_bookmark`. Review this RPC.
    *   No `useEffect` to sync from props like `LikeButton`; consider adding for consistency.
    *   Error feedback to user is minimal.
*   **`components/feed/ShareButton.tsx`**:
    *   Relies on single post page `/post/:id` existing. Verify/create this page.
*   **`components/feed/FlagButton.tsx`**:
    *   Modal JSX was truncated but assumed Headless UI `Dialog`.
    *   Relies on `post_flags`, `comment_flags` tables and RLS.
    *   Consider handling duplicate flagging (e.g., unique constraint, graceful error).
    *   Moderation interface is a separate backend/admin feature.

## Comment System (`components/feed/CommentList.tsx`, `CommentForm.tsx`, `CommentItem.tsx`, `lib/posts.ts`)

*   **`lib/posts.ts`**:
    *   `likePost`/`unlikePost`: Consider RPCs for atomicity (e.g. `rpc('like_post')`) instead of direct table inserts/deletes, especially for `likePost` to handle re-likes gracefully.
    *   `addComment`: Fetches profile in a second step. `CommentForm.tsx` uses a more efficient single insert-with-join. Standardize or choose one approach.
    *   `fetchComments`: Uses RPC `get_post_comments_threaded`. Review this RPC for correctness and performance (joins, ordering).
    *   TODO for fetching single post details (relevant for `/post/:id` page).
*   **`components/feed/CommentList.tsx`**:
    *   "Most Liked" sort option is not implemented. Requires comment likes feature.
*   **`components/feed/CommentForm.tsx`**:
    *   Uses direct Supabase insert with `profiles!inner(*)` join. This is efficient. Ensure `user_object` on `ThreadedComment` correctly handles cases where `authorProfile` might be unexpectedly null.
*   **`components/feed/CommentItem.tsx`**:
    *   TODO: Implement comment Edit/Delete functionality (`handleUpdate`, `handleDelete`). Requires RPCs and RLS.
    *   TODO: Link author name to user profile page.
    *   `FlagButton` props were corrected.

## General Frontend TODOs & Checks

*   **User Profile Pages**: Create `/profile/[id]/page.tsx`.
*   **Single Post Page**: Create `/post/[id]/page.tsx`.
*   **Network Pages**: Review/create `/network/page.tsx` and `/network/companies/page.tsx`.
*   **Static Pages**: Create `/privacy` and `/terms` pages.
*   **RPC Review**: Systematically review all backend RPCs used by the frontend for logic, performance, and RLS.
*   **Table RLS**: Review RLS for all relevant tables.
*   **Error Handling**: Enhance user-facing error feedback (toasts) for operations that can fail.
*   **External Components**: Review `RichTextEditor`, `FileUpload`, `imageCompressionUtils`.
*   **Code Consistency**: Address minor inconsistencies in patterns (e.g., prop syncing, lib functions vs. direct Supabase calls).

This list should serve as a good starting point for addressing frontend technical debt and planning further development. 
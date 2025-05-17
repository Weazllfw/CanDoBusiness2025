# Social Feed Frontend Implementation

This document outlines the frontend implementation plan for the social feed feature in the CanDo Business Network application. It covers displaying the feed, user interactions (posts, likes, comments), and fetching data from the backend.

## 1. Core Technologies & Libraries

*   React (with Next.js)
*   Supabase Client for data fetching (RPC calls, subscriptions)
*   TypeScript for type safety (using generated Supabase types)
*   Tailwind CSS (or existing styling solution) for UI

## 2. Directory Structure

*   **Pages:**
    *   `src/app/feed/page.tsx`: Main page to display the social feed.
    *   `src/app/posts/new/page.tsx` (or modal): Page/modal for creating new posts.
    *   `src/app/posts/[id]/page.tsx`: Optional page for viewing a single post and its comments in detail.
*   **Components:**
    *   `src/components/feed/FeedList.tsx`: Renders the list of posts.
    *   `src/components/feed/PostItem.tsx`: Renders an individual post.
    *   `src/components/feed/LikeButton.tsx`: Component for liking/unliking a post.
    *   `src/components/feed/CommentList.tsx`: Renders comments for a post.
    *   `src/components/feed/CommentItem.tsx`: Renders an individual comment.
    *   `src/components/feed/CommentForm.tsx`: Form for adding new comments.
    *   `src/components/feed/CreatePostForm.tsx` (or similar): Form for creating new posts.
*   **API/Client Logic:**
    *   `src/lib/supabase.ts`: Supabase client instance.
    *   `src/lib/posts.ts` (new): Functions for interacting with post-related RPCs and tables (fetch feed, get post details, create post, like/unlike, add comment).
    *   `src/lib/users.ts` (or similar, may exist): Functions for user-related data if needed (e.g. fetching current user).
*   **Types:**
    *   `src/types/supabase.ts`: Auto-generated Supabase types.
    *   `src/types/feed.ts` (or augment existing): Custom types for feed items if the RPC output needs further shaping or combines data in a way not directly represented by a single table type.

## 3. Feed Page (`src/app/feed/page.tsx`)

**Responsibilities:**
*   Fetch initial feed data (first page) on load using the `public.get_feed_posts` RPC.
*   Manage state for:
    *   List of posts.
    *   Loading status.
    *   Error status.
    *   Current page number for pagination.
    *   Whether more posts are available.
*   Implement pagination/infinite scrolling to load more posts.
*   Render the `FeedList` component.
*   Potentially include a "Create Post" button/link.

**Data Fetching:**
*   Call `supabase.rpc('get_feed_posts', { p_current_user_id: userId, p_page_number: page, p_page_size: pageSize })`.
*   Handle responses and update component state.

## 4. `PostItem` Component (`src/components/feed/PostItem.tsx`)

**Responsibilities:**
*   Receive a single post object (as returned by `get_feed_posts` RPC) as a prop.
*   Display:
    *   Author details (avatar, name, link to profile).
    *   Company details if it's a company post (avatar, name, link to profile).
    *   Post content (text, media).
    *   Timestamp.
    *   Like count and `LikeButton` component.
    *   Comment count and link/button to show/hide `CommentList` and `CommentForm`.

## 5. Interactions

### 5.1. Liking Posts
*   `LikeButton.tsx` will display current like count and if the current user has liked the post.
*   Clicking toggles the like status.
*   API calls in `src/lib/posts.ts` to:
    *   `supabase.from('post_likes').insert({ post_id, user_id })`
    *   `supabase.from('post_likes').delete().match({ post_id, user_id })`
*   Optimistic UI updates are recommended.

### 5.2. Commenting on Posts
*   `CommentForm.tsx` allows users to input and submit comments.
*   `CommentList.tsx` displays existing comments, potentially fetched on demand.
*   API calls in `src/lib/posts.ts` to:
    *   `supabase.from('post_comments').insert({ post_id, user_id, content, parent_comment_id })`
    *   Fetch comments: `supabase.from('post_comments').select('*, profiles(*)').eq('post_id', postId).order('created_at')` (or similar, possibly an RPC for threaded comments).

### 5.3. Creating Posts
*   A form (`CreatePostForm.tsx`) will handle input for post content and media.
*   Media uploads will use Supabase Storage (new bucket for post media will be needed, e.g., 'post-media-storage').
*   API call in `src/lib/posts.ts` to `supabase.from('posts').insert({ user_id, company_id (optional), content, media_url, media_type, author_subscription_tier })`.
    *   `author_subscription_tier` might be determined server-side via a trigger or passed from client if user's tier is known.

## 6. State Management

*   React `useState` and `useEffect` for component-level state.
*   For more complex global state (e.g., current user, notifications), React Context or a lightweight state manager (Zustand) can be used if not already in place.

## 7. Realtime Updates (Phase 2+)

*   Subscribe to Supabase Realtime events for `posts`, `post_likes`, `post_comments` to update the feed dynamically without full reloads.
    *   New posts appearing.
    *   Like counts updating.
    *   New comments appearing.

## 8. Next Steps / Breakdown

1.  **Implement `src/app/feed/page.tsx`:** Basic structure, data fetching for the first page, "Load More" functionality.
2.  **Implement `PostItem.tsx`:** Display core post data.
3.  **Implement Like functionality:** `LikeButton.tsx` and API calls.
4.  **Implement Comment display:** `CommentList.tsx`, `CommentItem.tsx`.
5.  **Implement Comment creation:** `CommentForm.tsx` and API calls.
6.  **Implement Post creation UI and logic.**
7.  Refine UI, add error handling, loading states.
8.  (Later) Implement Realtime updates.

This document will evolve as development progresses. 
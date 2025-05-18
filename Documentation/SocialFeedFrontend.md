# Social Feed Frontend Implementation

## 1. Overview

The social feed feature in the CanDo Business Network application provides a platform for users and companies to share updates, interact through posts, comments, and likes, and flag inappropriate content. The implementation focuses on real-time updates, content organization through categories, and enhanced user interactions including bookmarking, sorted comment views, rich text editing, post sharing, multiple image uploads with compression, and analytics tracking for Pro users.

## 2. Directory Structure

### 2.1. Pages
*   `src/app/feed/page.tsx`: Main feed page container with category filtering
*   `src/app/feed/[postId]/page.tsx`: Individual post view with expanded comments
*   `src/app/bookmarks/page.tsx`: User's bookmarked posts view

### 2.2. Components (`src/components/feed/`)
*   **Core Feed Components:**
    *   `PostFeed.tsx`: Main feed container with infinite scroll and category filtering
    *   `PostItem.tsx`: Individual post display with interactions
    *   `CreatePost.tsx`: Post creation form with media upload and category selection
*   **Comment Components:**
    *   `CommentList.tsx`: Threaded comments display with sorting options
    *   `CommentItem.tsx`: Individual comment with replies
    *   `CommentForm.tsx`: Comment creation interface
*   **Interaction Components:**
    *   `LikeButton.tsx`: Post/comment like functionality
    *   `BookmarkButton.tsx`: Post bookmarking functionality
    *   `FlagButton.tsx`: Content flagging button
    *   `FlagModal.tsx`: Modal for reporting content
    *   `ShareButton.tsx`: Component for sharing posts via Web Share API or clipboard.
*   **Layout Components:**
    *   `RightSidebar.tsx`: Supplementary feed content (trending, suggestions)
*   **Common Components Used:**
    *   `src/components/common/RichTextEditor.tsx`: TipTap based rich text editor for post content.
    *   `src/components/messages/FileUpload.tsx`: Reusable file upload component for multiple images.

## 3. Component Details

### 3.1. PostFeed.tsx
*   **Purpose:** Main container for the social feed
*   **Features:**
    *   Infinite scroll implementation
    *   Real-time updates via Supabase subscriptions
    *   Post sorting and filtering
    *   Category-based filtering
*   **Key Props:**
    ```typescript
    interface PostFeedProps {
      initialPosts?: Post[];
      userId?: string;
      companyId?: string;
      filter?: 'all' | 'following' | 'company';
      category?: PostCategory;
    }
    ```

### 3.2. PostItem.tsx
*   **Purpose:** Displays individual posts with all interactions
*   **Features:**
    *   Post content and media display
    *   Like/unlike functionality
    *   Bookmark/unbookmark functionality
    *   Comment thread preview
    *   Content flagging
    *   Category display
*   **Key Props:**
    ```typescript
    interface PostItemProps {
      post: Post;
      showActions?: boolean;
      isExpanded?: boolean;
      category: PostCategory;
    }
    ```

### 3.3. CreatePost.tsx
*   **Purpose:** Form for creating new posts
*   **Features:**
    *   **"Post as" selector: Allows user to choose to post as their personal profile or as one of their owned companies.**
    *   **Rich text input using `RichTextEditor` (TipTap based) supporting bold, italic, and lists.**
    *   **Multiple image uploads (up to 5) using the `FileUpload` component.**
    *   **Client-side image compression before upload.**
    *   Preview and removal of selected images.
    *   **Category selection for the post.**
    *   **Analytics: Tracks `post_create` event for Pro users, including whether the post was made as a user or a company.**
*   **Integration:**
    *   Uses Supabase Storage for media
    *   Real-time post addition to feed

### 3.4. Comment Components
*   **CommentList.tsx:**
    *   Threaded comment display
    *   Sorting options (newest, oldest, most liked)
    *   Pagination/load more
    *   Real-time updates
*   **CommentItem.tsx:**
    *   Individual comment display
    *   Reply functionality
    *   Like/unlike support
*   **CommentForm.tsx:**
    *   Comment creation
    *   Reply context
    *   Markdown support

### 3.5. Interaction Components
*   **LikeButton.tsx:** (Assumed to be part of `PostItem.tsx` or `PostFeed.tsx` logic)
    *   Optimistic updates
    *   Like count display
    *   **Analytics: Tracks `post_like` event for Pro users.**
*   **BookmarkButton.tsx:** (Assumed to be part of `PostItem.tsx` or `PostFeed.tsx` logic)
    *   Post bookmarking functionality
    *   Optimistic updates
    *   Bookmark count display
*   **FlagButton.tsx & FlagModal.tsx:**
    *   Content reporting interface
    *   Category selection
    *   Report submission
*   **ShareButton.tsx:**
    *   **Purpose:** Allows users to share a post.
    *   **Features:**
        *   Uses Web Share API if available.
        *   Fallback to copying post link to clipboard.
        *   Toast notifications for success/failure.
        *   **Analytics: Tracks `post_share` event for Pro users.**

### 3.6. PostFeed.tsx & PostItem.tsx (Combined for Analytics Context)
*   **PostItem/PostCard within PostFeed:**
    *   **Analytics: Tracks `post_view` event for Pro users when a post becomes visible.**
    *   **Analytics: Tracks `media_view` event for Pro users when an image is clicked or video is played.**
    *   Displays multiple images in a grid if present.
    *   Handles video display if media type is video.

### 3.7. RichTextEditor.tsx (`src/components/common/RichTextEditor.tsx`)
*   **Purpose:** Provides a rich text editing experience.
*   **Technology:** Built using TipTap.
*   **Features:**
    *   Basic formatting toolbar: Bold, Italic, Bullet List, Ordered List.
    *   Outputs HTML content.

### 3.8. FileUpload.tsx (`src/components/messages/FileUpload.tsx`)
*   **Purpose:** Reusable component for handling file selection and preview.
*   **Features:**
    *   Drag & drop interface.
    *   Click to select files.
    *   Support for maximum number of files and file size limits.
    *   Displays selected file names/previews (if applicable).
    *   Callback for when files change.
    *   Used in `CreatePost.tsx` for image uploads.

## 4. Data Flow

### 4.1. Post Creation
1.  User inputs content in `CreatePost.tsx` using `RichTextEditor`.
2.  **User selects the posting entity (self or company) via the "Post as" selector.**
3.  User uploads images using `FileUpload.tsx`; images are compressed client-side.
4.  Media files uploaded to Supabase Storage.
5.  Post created via API functions:
    *   `user_id` is set to the authenticated user's ID.
    *   `company_id` is set to the selected company's ID if posting as a company, otherwise it's `null`.
6.  Real-time update triggers feed refresh
7.  Optimistic UI updates show post immediately
8.  **Analytics `post_create` event is tracked with details of the posting entity.**

### 4.2. Post Interaction
1.  User interacts with `PostItem.tsx` components (e.g., likes, shares, views media).
2.  **Analytics events (`post_view`, `post_like`, `post_share`, `media_view`) are triggered and sent if the user is Pro.**
3.  Optimistic UI updates
4.  Backend calls through API functions
5.  Real-time updates via subscriptions
6.  Error handling and rollback if needed

### 4.3. Comment Flow
1.  User creates comment via `CommentForm.tsx`
2.  **Analytics: Tracks `post_comment` event for Pro users.**
2.  Comment added to thread in `CommentList.tsx`
3.  Real-time updates to all viewers
4.  Threaded structure maintained

## 5. State Management

### 5.1. Local State
*   Post content and media in creation form
*   UI states (loading, error, success)
*   Form validation states

### 5.2. Server State
*   Post data from Supabase
*   Real-time subscriptions
*   Comment threads
*   Like counts

## 6. Performance Optimizations

### 6.1. Loading
*   Infinite scroll with intersection observer
*   Skeleton loading states
*   **Client-side image compression before upload to reduce upload time and storage.**
*   Progressive image loading
*   Debounced real-time updates

### 6.2. Caching
*   Post data caching
*   Media URL caching
*   Like status caching

### 6.3. Real-time
*   Selective subscriptions
*   Batched updates
*   Optimistic UI updates

## 7. Error Handling

### 7.1. User Feedback
*   Toast notifications for actions
*   Error states in components
*   Retry mechanisms

### 7.2. Recovery
*   Failed post creation recovery
*   Media upload retry
*   Network error handling

## 8. Security

### 8.1. Content
*   Media type validation
*   Content size limits
*   MIME type checking

### 8.2. Permissions
*   RLS policy compliance
*   Action authorization checks
*   Company context validation

## 9. Accessibility

*   ARIA labels
*   Keyboard navigation
*   Screen reader support
*   Color contrast compliance

## 10. Future Enhancements

*   Rich text editor integration **(Completed: TipTap basic integration)**
*   Enhanced media gallery **(Partially done: Multiple image grid view)**
*   Post scheduling
*   Analytics integration **(Completed: Initial tracking for views, engagement, media for Pro users)**
*   Enhanced content moderation

## 11. Post Categories

### 11.1. Available Categories
*   General
*   Business Update
*   Industry News
*   Job Opportunity
*   Event
*   Question
*   Partnership
*   Product Launch

### 11.2. Category Implementation
*   Database enum type for categories
*   Category selection in post creation
*   Category-based filtering in feed
*   Visual indicators for post categories
*   Category-specific styling and icons

## 12. Bookmarking System

### 12.1. Features
*   Post bookmarking/unbookmarking
*   Bookmark counts
*   Dedicated bookmarks page
*   Real-time bookmark status updates
*   RLS-secured bookmark operations

### 12.2. Implementation
*   Database table: `post_bookmarks`
*   Toggle bookmark function
*   Optimistic UI updates
*   Bookmark count aggregation
*   Filtered bookmark views

## 13. Comment Sorting

### 13.1. Available Sort Options
*   Newest First
*   Oldest First
*   Most Liked

### 13.2. Implementation
*   Client-side sorting
*   Thread structure preservation
*   Sort preference persistence
*   Real-time sort updates
*   Performance optimizations for large comment threads 
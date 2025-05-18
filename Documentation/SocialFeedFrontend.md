# Social Feed Frontend Implementation

## 1. Overview

The social feed feature in the CanDo Business Network application provides a platform for users and companies to share updates, interact through posts, comments, and likes, and flag inappropriate content. The implementation focuses on real-time updates and smooth user interactions.

## 2. Directory Structure

### 2.1. Pages
*   `src/app/feed/page.tsx`: Main feed page container
*   `src/app/feed/[postId]/page.tsx`: Individual post view with expanded comments

### 2.2. Components (`src/components/feed/`)
*   **Core Feed Components:**
    *   `PostFeed.tsx`: Main feed container with infinite scroll
    *   `PostItem.tsx`: Individual post display with interactions
    *   `CreatePost.tsx`: Post creation form with media upload
*   **Comment Components:**
    *   `CommentList.tsx`: Threaded comments display
    *   `CommentItem.tsx`: Individual comment with replies
    *   `CommentForm.tsx`: Comment creation interface
*   **Interaction Components:**
    *   `LikeButton.tsx`: Post/comment like functionality
    *   `FlagButton.tsx`: Content flagging button
    *   `FlagModal.tsx`: Modal for reporting content
*   **Layout Components:**
    *   `RightSidebar.tsx`: Supplementary feed content (trending, suggestions)

## 3. Component Details

### 3.1. PostFeed.tsx
*   **Purpose:** Main container for the social feed
*   **Features:**
    *   Infinite scroll implementation
    *   Real-time updates via Supabase subscriptions
    *   Post sorting and filtering
*   **Key Props:**
    ```typescript
    interface PostFeedProps {
      initialPosts?: Post[];
      userId?: string;
      companyId?: string;
      filter?: 'all' | 'following' | 'company';
    }
    ```

### 3.2. PostItem.tsx
*   **Purpose:** Displays individual posts with all interactions
*   **Features:**
    *   Post content and media display
    *   Like/unlike functionality
    *   Comment thread preview
    *   Content flagging
*   **Key Props:**
    ```typescript
    interface PostItemProps {
      post: Post;
      showActions?: boolean;
      isExpanded?: boolean;
    }
    ```

### 3.3. CreatePost.tsx
*   **Purpose:** Form for creating new posts
*   **Features:**
    *   Rich text input
    *   Media upload with preview
    *   Company context selection
    *   Draft saving
*   **Integration:**
    *   Uses Supabase Storage for media
    *   Real-time post addition to feed

### 3.4. Comment Components
*   **CommentList.tsx:**
    *   Threaded comment display
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
*   **LikeButton.tsx:**
    *   Optimistic updates
    *   Like count display
    *   Animation effects
*   **FlagButton.tsx & FlagModal.tsx:**
    *   Content reporting interface
    *   Category selection
    *   Report submission

## 4. Data Flow

### 4.1. Post Creation
1.  User inputs content in `CreatePost.tsx`
2.  Media files uploaded to Supabase Storage
3.  Post created via `posts.ts` API functions
4.  Real-time update triggers feed refresh
5.  Optimistic UI updates show post immediately

### 4.2. Post Interaction
1.  User interacts with `PostItem.tsx` components
2.  Optimistic UI updates
3.  Backend calls through API functions
4.  Real-time updates via subscriptions
5.  Error handling and rollback if needed

### 4.3. Comment Flow
1.  User creates comment via `CommentForm.tsx`
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

*   Rich text editor integration
*   Enhanced media gallery
*   Post scheduling
*   Analytics integration
*   Enhanced content moderation 
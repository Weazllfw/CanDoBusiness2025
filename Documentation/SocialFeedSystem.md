# Social Feed System

This document outlines the database schema and intended functionality for the social feed system within the CanDo Business Network.

## Purpose

The social feed system allows users to create posts, and for other users to interact with these posts through likes and comments. Posts can be made by individual users or on behalf of companies they are associated with.

## Key Database Tables

The following tables are central to the social feed system. For detailed RLS policies and column definitions, please refer to their respective migration files in `supabase/migrations/` (timestamps starting with `20250520*`).

*   **`public.posts`**: Stores the content of each post, including text, media links, and the author (user and optional company). It also records the author's subscription tier at the time of posting for feed prioritization.
    *   _Migration File:_ `20250520000000_create_posts_table.sql`

*   **`public.post_likes`**: A join table that records which users have liked which posts.
    *   _Migration File:_ `20250520000001_create_post_likes_table.sql`

*   **`public.post_comments`**: Stores comments made on posts, supporting threaded conversations through a `parent_comment_id`.
    *   _Migration File:_ `20250520000002_create_post_comments_table.sql`

## Future Enhancements

*   RPCs for creating posts, toggling likes, adding comments.
*   RPC/View for efficiently fetching a user's feed, incorporating prioritization and recommendation logic (see `Documentation/Planned/FeedAndRecommendationSystem.md`).
*   Frontend components for displaying and interacting with the feed.
*   Storage integration for post media.
*   Notifications for likes and comments. 
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

## Platform Interaction Model Enhancements (June 2025)

Enhancements were made to align with the Platform Interaction Model, particularly for feed generation, post display, and comment display.

**1. Profile Enhancements for Feed Context (`supabase/migrations/20250612000010_platform_interaction_model_schema_updates.sql`)**
- The `public.profiles` table was updated with:
  - `trust_level public.user_trust_level_enum DEFAULT 'NEW'`: Tracks user trust level ('NEW', 'BASIC', 'ESTABLISHED', 'VERIFIED_CONTRIBUTOR').
  - `is_verified BOOLEAN DEFAULT FALSE`: Indicates if the user profile itself is verified (distinct from company verification).
- These fields are used in the feed to provide more context about post authors.

**2. Feed Generation - `public.get_feed_posts` RPC (`supabase/migrations/20250612000016_update_get_feed_posts_for_platform_interaction.sql`)**
- The `public.get_feed_posts` RPC was significantly updated.
- **New Parameters:**
  - `p_feed_type TEXT`: Filters the feed (e.g., 'ALL', 'VERIFIED_COMPANIES', 'CONNECTIONS', 'FOLLOWED_COMPANIES').
  - `p_minimum_trust_level public.user_trust_level_enum`: Filters posts by the author's minimum trust level.
- **Expanded Return Fields (for each post):**
  - `author_trust_level public.user_trust_level_enum`: The trust level of the post's author.
  - `author_is_verified BOOLEAN`: Verification status of the post's author.
  - `acting_company_id UUID`: If the author posted on behalf of a company, this is the company's ID.
  - `acting_company_name TEXT`: Name of the acting company.
  - `acting_company_logo_url TEXT`: Logo URL of the acting company.
  - `ranking_score NUMERIC`: A score used for feed prioritization.
- **Updated Logic:**
  - Incorporates `p_feed_type` and `p_minimum_trust_level` in its filtering.
  - Joins with `profiles` to get author's trust level and verification status.
  - Determines `acting_company_*` details if the author is posting as a company they admin.
  - Implements a `ranking_score` calculation that boosts posts from verified entities, trusted users, connections, and followed companies.

**3. Comment Badging (`supabase/migrations/20250612000015_update_get_post_comments_threaded_for_badging.sql`):**
- The `public.get_post_comments_threaded(p_post_id UUID)` RPC was updated to support contextual badging for comments.
- **Returned Fields Added:**
  - `commenter_verified_company_id UUID`: ID of a verified company the commenter is an admin/owner of.
  - `commenter_verified_company_name TEXT`: Name of that company.
  - `commenter_verified_company_logo_url TEXT`: Logo URL of that company.
- **Logic:** If a user making a comment is an admin or owner of one or more *verified* companies (TIER1_VERIFIED or TIER2_FULLY_VERIFIED), the details of one such company (first by name) are returned alongside the comment. This allows the frontend to display a badge like "User Name - *from Company X*" as suggested in the Platform Interaction Model.
- This change ensures that while comments are made by users, their relevant verified company affiliation can be highlighted, adding B2B context. 
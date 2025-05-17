# Feed, Recommendation, Subscription Prioritization, and Networking Plan

This document outlines the planned features and database considerations for the CanDo Business Network's social feed, user networking, company directory, content prioritization based on user subscriptions, and a future recommendation system.

**Note on Existing Schema:** Throughout this document, `user_id` foreign keys refer to `auth.users(id)` and `company_id` (or similar, like `source_company_id`) foreign keys refer to `public.companies(id)`, aligning with the established database structure.

## 1. Core Social Features: Database Schema

The following tables will form the foundation of the social interaction system.

### 1.1. `posts` Table

Stores all posts made by users or on behalf of companies.

| Column                     | Type                       | Constraints                                     | Description                                                                 |
| -------------------------- | -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `id`                       | `uuid`                     | Primary Key, default `gen_random_uuid()`        | Unique identifier for the post.                                             |
| `user_id`                  | `uuid`                     | Foreign Key to `auth.users.id`, NOT NULL        | The user who authored the post.                                             |
| `company_id`               | `uuid`                     | Foreign Key to `public.companies.id`, NULLABLE  | The company on whose behalf the post is made (if applicable).             |
| `content`                  | `text`                     | NOT NULL                                        | The main textual content of the post.                                       |
| `media_url`                | `text`                     | NULLABLE                                        | URL to any attached media (image, video).                                   |
| `media_type`               | `text`                     | NULLABLE                                        | Type of media (e.g., 'image', 'video').                                     |
| `author_subscription_tier` | `text`                     | NOT NULL, default `'REGULAR'`                   | Author's subscription tier at time of posting ('REGULAR', 'PREMIUM', 'PRO'). |
| `created_at`               | `timestamp with time zone` | Default `now()`                                 | Timestamp of post creation.                                                 |
| `updated_at`               | `timestamp with time zone` | Default `now()`                                 | Timestamp of last post update.                                              |

### 1.2. `post_likes` Table

Tracks likes given by users to posts.

| Column       | Type                       | Constraints                               | Description                                 |
| ------------ | -------------------------- | ----------------------------------------- | ------------------------------------------- |
| `post_id`    | `uuid`                     | Foreign Key to `public.posts.id`          | The post that was liked.                    |
| `user_id`    | `uuid`                     | Foreign Key to `auth.users.id`            | The user who liked the post.                |
| `created_at` | `timestamp with time zone` | Default `now()`                           | Timestamp of when the like was given.       |
|              |                            | Primary Key: `(post_id, user_id)`         | Ensures a user can only like a post once. |

### 1.3. `post_comments` Table

Stores comments made by users on posts, allowing for threaded conversations.

| Column              | Type                       | Constraints                                        | Description                                                   |
| ------------------- | -------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `id`                | `uuid`                     | Primary Key, default `gen_random_uuid()`           | Unique identifier for the comment.                            |
| `post_id`           | `uuid`                     | Foreign Key to `public.posts.id`, NOT NULL       | The post to which the comment belongs.                        |
| `user_id`           | `uuid`                     | Foreign Key to `auth.users.id`, NOT NULL         | The user who authored the comment.                            |
| `parent_comment_id` | `uuid`                     | Foreign Key to `public.post_comments.id`, NULLABLE | For threaded replies, references the parent comment.        |
| `content`           | `text`                     | NOT NULL                                           | The textual content of the comment.                           |
| `created_at`        | `timestamp with time zone` | Default `now()`                                    | Timestamp of comment creation.                                |
| `updated_at`        | `timestamp with time zone` | Default `now()`                                    | Timestamp of last comment update.                             |

## 2. User Subscriptions (Stripe Integration)

To manage different user tiers and their benefits, a subscription system integrated with Stripe will be necessary.

### 2.1. `user_subscriptions` Table

Tracks active and past user subscriptions.

| Column                   | Type                       | Constraints                                      | Description                                                                 |
| ------------------------ | -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `id`                     | `uuid`                     | Primary Key, default `gen_random_uuid()`         | Unique identifier for the subscription record.                              |
| `user_id`                | `uuid`                     | Foreign Key to `auth.users.id`, UNIQUE, NOT NULL | The user associated with this subscription.                                 |
| `tier`                   | `text`                     | NOT NULL                                         | Subscription tier (e.g., 'PREMIUM', 'PRO').                                 |
| `stripe_subscription_id` | `text`                     | UNIQUE, NOT NULL                                 | Stripe's unique ID for the subscription.                                    |
| `stripe_customer_id`     | `text`                     | NOT NULL                                         | Stripe's unique ID for the customer.                                        |
| `status`                 | `text`                     | NOT NULL                                         | Current status (e.g., 'active', 'canceled', 'past_due', 'incomplete').      |
| `current_period_start`   | `timestamp with time zone` | NULLABLE                                         | Start date of the current billing cycle.                                    |
| `current_period_end`     | `timestamp with time zone` | NULLABLE                                         | End date of the current billing cycle.                                      |
| `cancel_at_period_end`   | `boolean`                  | NOT NULL, default `false`                        | If true, the subscription will be canceled at the end of the current period. |
| `created_at`             | `timestamp with time zone` | Default `now()`                                  | Timestamp of subscription record creation.                                  |
| `updated_at`             | `timestamp with time zone` | Default `now()`                                  | Timestamp of last subscription record update.                               |

## 3. Networking and Connection System

This system allows users and companies to connect and follow each other.

### 3.1. User-to-User Connections

Facilitates direct connections between individual users.

| Column         | Type                       | Constraints                                                     | Description                                                                       |
| -------------- | -------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `id`           | `uuid`                     | Primary Key, default `gen_random_uuid()`                        | Unique identifier for the connection record.                                      |
| `requester_id` | `uuid`                     | Foreign Key to `auth.users.id`, NOT NULL                        | The user who initiated the connection request.                                    |
| `addressee_id` | `uuid`                     | Foreign Key to `auth.users.id`, NOT NULL                        | The user to whom the connection request was sent.                                 |
| `status`       | `text`                     | NOT NULL, default `'PENDING'`                                   | Status of the connection ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED').          |
| `created_at`   | `timestamp with time zone` | Default `now()`                                                 | Timestamp of connection request.                                                  |
| `updated_at`   | `timestamp with time zone` | Default `now()`                                                 | Timestamp of last status update.                                                  |
|                |                            | CHECK (`requester_id` <> `addressee_id`)                        | Ensures a user cannot connect with themselves.                                    |
|                |                            | UNIQUE (`requester_id`, `addressee_id`)                         | Ensures only one connection record exists between two users (in one direction). Consider if a second unique constraint for the reverse is needed or handled by application logic/triggers. |

*Note: For a bidirectional "accepted" connection, typically two rows might exist if strictly modeling requester/addressee, or a single row's status is updated. For simplicity, one row changing status is often preferred. Application logic will handle creating reciprocal views if needed (e.g., User A sees User B as a connection if status is 'ACCEPTED', regardless of who sent the request).*

### 3.2. User-to-Company Follows

Allows users to follow companies for updates.

| Column       | Type                       | Constraints                               | Description                                 |
| ------------ | -------------------------- | ----------------------------------------- | ------------------------------------------- |
| `user_id`    | `uuid`                     | Foreign Key to `auth.users.id`, NOT NULL  | The user who is following.                  |
| `company_id` | `uuid`                     | Foreign Key to `public.companies.id`, NOT NULL | The company being followed.                 |
| `created_at` | `timestamp with time zone` | Default `now()`                           | Timestamp of when the follow action occurred. |
|              |                            | Primary Key: `(user_id, company_id)`      | Ensures a user can only follow a company once. |

### 3.3. Company-to-Company Connections/Follows

Enables companies to follow or establish partnerships with other companies.

| Column              | Type                       | Constraints                                              | Description                                                                                                  |
| ------------------- | -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`                | `uuid`                     | Primary Key, default `gen_random_uuid()`                 | Unique identifier for the company connection.                                                                |
| `source_company_id` | `uuid`                     | Foreign Key to `public.companies.id`, NOT NULL           | The company initiating the action (e.g., following or requesting partnership).                               |
| `target_company_id` | `uuid`                     | Foreign Key to `public.companies.id`, NOT NULL           | The company being followed or targeted for partnership.                                                      |
| `connection_type`   | `text`                     | NOT NULL                                                 | Type of connection (e.g., 'FOLLOWING', 'PARTNERSHIP_REQUESTED', 'PARTNERSHIP_ACCEPTED', 'PARTNERSHIP_DECLINED'). |
| `created_at`        | `timestamp with time zone` | Default `now()`                                          | Timestamp of action.                                                                                         |
| `updated_at`        | `timestamp with time zone` | Default `now()`                                          | Timestamp of last status/type update.                                                                        |
|                     |                            | CHECK (`source_company_id` <> `target_company_id`)     | Ensures a company cannot connect with itself.                                                                |
|                     |                            | UNIQUE (`source_company_id`, `target_company_id`, `connection_type` for types like 'FOLLOWING'. For 'PARTNERSHIP', uniqueness might need careful handling to avoid duplicate requests before one is accepted/declined). |

*Note on `PARTNERSHIP` type: If `connection_type` is 'PARTNERSHIP_REQUESTED', the `target_company_id` would need to take an action to change it to 'PARTNERSHIP_ACCEPTED' or 'PARTNERSHIP_DECLINED'. 'FOLLOWING' is typically a unilateral action.*

## 4. Company Directory and Search

A key feature for discovery and networking. The system will leverage the rich, existing company profile data in `public.companies` (as defined in migrations like `20240507000000_initial_schema.sql` and `20240510000004_enhance_company_profile.sql`).

*   **Functionality:** Users will be able to search for companies based on various criteria from the `public.companies` table:
    *   Company Name (utilizing the existing `public.companies.name` field; exact and partial matches)
    *   Industry (utilizing the existing `public.companies.industry` field)
    *   Location (utilizing existing `public.companies.city`, `public.companies.country`, and `public.companies.state_province` fields)
    *   Keywords (e.g., searching `public.companies.description` and other relevant text fields)
*   **Search Interface:** A dedicated search page or a prominent search bar within the application.
*   **Results Display:** Search results should show key company information (logo, name, industry, brief description from existing fields) and provide clear actions to "View Profile" (linking to `/app/company/[id]/page.tsx`), "Follow Company," or "Request Partnership" (if applicable).
*   **Underlying Technology:**
    *   For simple searches, SQL `LIKE` or `ILIKE` queries against the aforementioned `public.companies` fields will be used initially.
    *   For more advanced search capabilities (full-text search, relevance ranking), Supabase's PostgreSQL full-text search features (e.g., `tsvector`, `tsquery`) or integration with a dedicated search service (like Algolia, Typesense) could be considered in a later phase.
    *   The `companies` table will need to be queryable by authenticated users. RLS will allow reads.

## 5. Content Prioritization in Feeds

User feeds should prioritize content based on the author's subscription tier and user connections to enhance visibility and relevance.

*   **Priority Factors:**
    1.  **Subscription Tier:** Posts from 'PRO' > 'PREMIUM' > 'REGULAR' users.
    2.  **Connections:** Posts from directly connected users and followed companies.
    3.  **Recency & Engagement:** Newer posts and posts with high engagement.
*   **Implementation:**
    *   The `author_subscription_tier` field in the `posts` table and data from connection/follow tables will be used by the feed generation logic.
    *   This prioritization needs to be balanced to ensure a dynamic and fair feed.
    *   The exact weighting or sorting mechanism will be determined during the feed generation RPC/view development.

## 6. Recommendation Algorithm (Future Enhancement - Phase 2+)

A recommendation algorithm will aim to personalize the user feed.

*   **High-Level Goal:** Increase user engagement by surfacing interesting content.
*   **Potential Data Points / Signals for the Algorithm:**
    *   **User's Explicit Interactions:** Likes, comments on posts.
    *   **Connection Graph:** Content from connected users (`user_connections`), followed users/companies (`user_company_follows`, `company_to_company_connections` where type is 'FOLLOWING').
    *   **Implicit Interactions:** Time spent viewing posts.
    *   **Content Features:** Keywords, topics from post text.
    *   **User Profile Features:** Declared interests, industry.
    *   **Popularity/Trending:** Posts with high recent engagement.
    *   **Collaborative Filtering & Content-Based Filtering.**
*   **Implementation Strategy:**
    *   Start with simpler heuristics (e.g., boosting followed content, recently popular content, content from prioritized tiers).
    *   Iteratively introduce more sophisticated machine learning models as data accumulates and platform matures.
    *   Consider trade-offs between complexity, computational cost, and improvement in user experience.
*   **Challenges:**
    *   Cold start problem for new users or new content.
    *   Maintaining diversity in the feed to avoid filter bubbles.
    *   Balancing recommendations with chronological content and subscription prioritization.

## 7. Feed Generation Logic (RPC/View)

An RPC (or a database view) will be created to assemble the user's feed. This logic will:
*   Fetch posts from the `posts` table.
*   Join with `users`, `companies`, `post_likes`, `post_comments`.
*   **Incorporate data from `user_connections`, `user_company_follows`, and `company_to_company_connections` to determine content from the user's network.**
*   Implement sorting and filtering:
    *   Apply subscription-based prioritization.
    *   Filter by/boost content from connections/follows.
    *   Incorporate signals from the recommendation algorithm (once developed).
    *   Paginate results.

This document will be updated as these features are developed and refined. 
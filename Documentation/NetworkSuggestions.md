# Network Suggestions System (People/Companies You May Know)

## 1. Overview

This system provides users with suggestions for "People You May Know" (PYMK) and "Companies You May Know" (CYMK) on their main feed. The goal is to enhance network discovery and engagement by presenting relevant connection and follow opportunities. Suggestions are generated based on a scoring mechanism considering user activity, connections, and profile information, with fallbacks to recently added users/companies for new users.

## 2. Backend Implementation

Two primary RPC functions serve these suggestions.

### 2.1. `public.get_pymk_suggestions(p_requesting_user_id UUID, p_limit INT)`

-   **Purpose:** Fetches a ranked list of user suggestions for the `p_requesting_user_id`.
-   **Returns:** `TABLE(suggested_user_id UUID, user_name TEXT, user_avatar_url TEXT, score BIGINT, reason TEXT)`
-   **Primary Logic:** Suggestions are primarily sourced from 2nd-degree connections (connections of the user's direct connections). The `score` reflects the number of mutual connections, and `reason` indicates this (e.g., "X mutual connections").
-   **Fallback Logic:** If the primary logic yields fewer than `p_limit` suggestions, the list is augmented with recently joined users (e.g., profiles created in the last 30 days). These users must not be the `p_requesting_user_id` and not already a 1st-degree connection. Their `reason` will be something like "Recently joined CanDo".
-   **Ordering:** Results are ordered first by priority (connection-based suggestions are higher priority), then by score (descending for connection-based, or recency for fallback), then by user name.

### 2.2. `public.get_cymk_suggestions(p_requesting_user_id UUID, p_limit INT)`

-   **Purpose:** Fetches a ranked list of company suggestions for the `p_requesting_user_id`.
-   **Returns:** `TABLE(suggested_company_id UUID, company_name TEXT, company_avatar_url TEXT, company_industry TEXT, score BIGINT, reason TEXT)`
-   **Primary Logic:** Suggestions are primarily sourced from companies followed by the user's direct connections. The `score` reflects the number of connections following the company, and `reason` indicates this (e.g., "X connections follow"). Companies already followed or owned by the `p_requesting_user_id` are excluded. Suggestions are typically filtered for active and verified companies.
-   **Fallback Logic:** If the primary logic yields fewer than `p_limit` suggestions, the list is augmented with recently created and verified companies (e.g., created in the last 30 days). These companies must not be owned or already followed by the `p_requesting_user_id`. Their `reason` will be something like "New on CanDoBusiness".
-   **Ordering:** Results are ordered first by priority (connection-based are higher), then by score (descending for connection-based, or recency for fallback), then by company name.

## 3. Frontend Implementation

-   **Location:** Primarily within `cando-frontend/src/components/feed/RightSidebar.tsx`, utilizing:
    -   `cando-frontend/src/components/feed/suggestions/PeopleYouMayKnow.tsx`
    -   `cando-frontend/src/components/feed/suggestions/CompaniesYouMayKnow.tsx`
    -   `cando-frontend/src/components/feed/suggestions/SuggestionCard.tsx` (reusable UI for individual suggestions)
-   **Functionality:**
    -   Components fetch suggestions using the respective RPC functions upon loading and when the current user is available.
    -   Display a loading state while fetching.
    -   Display an error message if fetching fails.
    -   If no suggestions are returned (and no error), the component renders `null` (i.e., doesn't display the section).
    -   Each suggestion card shows avatar, name, and the `reason` provided by the RPC.
    -   Provides "Connect" (for people) or "Follow" (for companies) buttons with placeholder actions (to be fully implemented).

## 4. Data Seeding Considerations

-   The `scripts/seed-dev-data.js` script has been enhanced to create more interconnected data to test these features:
    -   It establishes direct connections for the `rmarshall@candobusiness.ca` user.
    -   It creates 2nd-degree connections relative to `rmarshall` to populate PYMK.
    -   It makes `rmarshall`'s connections follow various companies to populate CYMK for `rmarshall`.

## 5. Future Enhancements

-   More sophisticated scoring (e.g., considering shared industry, location, profile keywords).
-   User actions to dismiss suggestions or indicate "not interested."
-   Algorithm A/B testing.
-   Integration with analytics to track suggestion effectiveness.

## 6. Database Schema Considerations (Potential)

-   No new tables are immediately required if we base suggestions on existing relationships (`user_connections`, `user_company_follows`, `companies.industry`, `posts`, `post_likes`, `post_comments`).
-   If industry for users (not just companies) becomes important, `profiles.industry` might be a future addition.

## 7. Additional Notes

-   The scoring mechanism and fallback logic are designed to ensure that suggestions are relevant and diverse, even for new users or those with limited connections.
-   The system is scalable and can handle a large number of users and connections.
-   The frontend implementation ensures that suggestions are displayed in a user-friendly manner, with clear and actionable buttons for connecting or following.
-   The backend implementation ensures that suggestions are generated efficiently and accurately based on the user's activity and network.
-   The data seeding script helps to populate the system with realistic data for testing and development.
-   Future enhancements include more sophisticated scoring algorithms, user feedback, caching, and integration with analytics. 
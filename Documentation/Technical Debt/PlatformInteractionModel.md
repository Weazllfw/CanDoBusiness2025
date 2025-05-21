# Platform Interaction Model & Trust Framework

This document outlines the foundational philosophy for user and company interactions on the CanDo platform, a recommended hybrid interaction model, and a proposed user verification/trust system.

## 🧩 Foundational Philosophy

CanDo is a B2B-first platform, but B2B relationships often start with people, not just logos. Therefore, the platform should:

*   **Prioritize company-level interactions** in messaging and visibility where appropriate, ensuring clarity and professionalism.
*   **Empower individuals** to build their professional reputations, share insights, and contribute meaningfully, even outside a direct company representation.
*   **Tier participation and trust** based on clear signals like verification status (for companies and potentially individuals), affiliation with verified entities, and positive engagement on the platform.

## 🧱 Recommended Hybrid Interaction Model (Model 2 with Model 3 Overlays)

This model aims to balance B2B focus with individual empowerment and uses verification/trust signals to manage interactions.

### ✅ Users & Companies:

*   Continue allowing users to own/manage multiple companies.
*   Every user has a personal identity; this should be usable and valuable even without a current company affiliation (e.g., for freelancers, job seekers, advisors).
*   Encourage, but do not strictly require, company affiliation for full participation. However, interactions involving unverified or unaffiliated users might have different visibility or limits.

### 💬 Messaging

**Default Rules & Recommendations:**

*   **User → User:**
    *   **Rule:** Only if mutually connected.
    *   **Rationale:** Good consent mechanism and basic spam control.
*   **User → Company:**
    *   **Rule:** Allowed, especially if messaging a verified company.
    *   **Consideration:** For messages to company pages, implement a system where company admins can review/accept incoming messages from unknown users, or have these messages land in a "requests" or "pending review" inbox area. This gives companies control over engagement.
*   **Company → Company:**
    *   **Rule:** Always allowed between verified companies.
    *   **Display:** Must be clearly badged as coming from "Admin X on behalf of Company A" to "Company B".
*   **Company → User:**
    *   **Rule:** Allowed from verified companies, especially to their followers or users who have previously interacted/responded to the company.
    *   **Consideration:** Limit unsolicited outreach from unverified companies to users.

**Technical Additions for Messaging:**

*   **`messages` table:** Add a nullable `acting_as_company_id UUID REFERENCES public.companies(id)` column.
    *   When a user sends a message *on behalf of* a company, this field is populated.
    *   This provides clear context for both backend logic and frontend display.
*   **Future UI:** Optional inbox filtering by personal vs. company contexts.

### 📣 Posts

*   **Authorship:** Users can post as themselves (personal profile) or on behalf of a company they manage (as currently supported).
*   **Feed Filters:** Implement robust feed filtering options:
    *   "All Content"
    *   "From People You Follow/Connections"
    *   "From Companies You Follow"
    *   "Verified Companies Only"
    *   "People Only"
*   **Feed Algorithm (Future):** Default feed could prioritize content from verified companies and posts from a user's direct connections and followed entities.

### 💬 Comments

*   **Authorship:** Comments are always made by a user (their personal profile).
*   **Contextual Badging:**
    *   If the commenting user is an owner/admin of a *verified* company, subtly badge their comment with that company's name/logo (e.g., "User Name - *from Company X*"). This provides valuable B2B context without requiring per-comment role switching.
*   **"Comment as Company" (Optional - Low Priority):**
    *   Consider a UI toggle for "Comment as Company X" only if strong demand emerges. Defaulting to user comments with company badging is simpler and often sufficient.

## 🔍 User Trust/Verification Score (Illustrative Example)

To tier participation and manage spam effectively, especially for individual users not yet affiliated with a verified company, a trust score or level system can be implemented. This score would be stored on the `public.profiles` table (e.g., `profiles.trust_level public.user_trust_level_enum`).

**Components of a Trust Score (Example):**

| Action                                                  | Points | Notes                                           |
| :------------------------------------------------------ | :----- | :---------------------------------------------- |
| Email verified                                          | +20    | Basic prerequisite.                             |
| Avatar uploaded                                         | +10    | Encourages profile personalization.             |
| Bio / Professional Headline filled in                   | +10    | Indicates effort and professionalism.           |
| Industry tags or skills selected                        | +10    | Helps with relevance and search.                |
| At least 3 accepted connections                         | +20    | Shows some level of network integration.        |
| Linked a LinkedIn profile (OAuth or verified URL)       | +20    | Strong external validation (optional feature).  |
| Has posted or commented meaningfully at least 2-3 times | +10    | Demonstrates active, non-spammy engagement.     |
| Affiliated with a `TIER1_VERIFIED` company              | +30    | Strong implicit trust if linked to verified org.|

**Trust Levels (Example Enum - `user_trust_level_enum`):**

*   `NEW`: Score 0-19
*   `BASIC`: Score 20-49
*   `ESTABLISHED`: Score 50-79
*   `VERIFIED_CONTRIBUTOR`: Score 80+ (or a manual admin verification for key individuals)

**How Trust Levels Can Be Used:**

*   **Rate Limiting:** `NEW` users might have stricter limits on messages sent, posts per day, etc.
*   **Feed Visibility:** Content from `NEW` or `BASIC` users might be less prioritized in "All" feeds for users not connected to them.
*   **Feature Access:** Certain advanced features might require `ESTABLISHED` or higher.
*   **Search Prioritization:** Verified companies and `VERIFIED_CONTRIBUTOR` individuals could rank higher.

🔹 Behavioral Trust Boosts (Optional, Simple)
Automatically promote trust level if:

*   They're admin of a verified company
*   They've had posts upvoted or reacted to
*   They've not been flagged by anyone in 7+ days of activity

This is optional, but it helps reward good behavior.

🔹 What Verified Gets You
*   Posts shown higher in "People" feeds
*   Can send connection invites
*   Can send messages to other verified users
*   Comments get more visibility
*   Gets a badge next to their name (e.g. ✅ or ✳️ or subtle "verified" label)

This framework provides a robust way to manage interactions, encourage positive platform behavior, and ensure that while individuals are empowered, the B2B nature and quality of the platform are maintained. The next step after documenting this is to break down the "Messaging Restrictions" part of the technical debt into actionable development tasks based on these principles. 
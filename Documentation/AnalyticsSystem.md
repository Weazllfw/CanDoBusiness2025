# Analytics System

## 1. Overview

The Analytics System provides insights and metrics **exclusively for Pro-tier users**, leveraging data collected across the platform. This system is designed to provide valuable business intelligence while maintaining user privacy and data security. Analytics access is a premium feature reserved only for Pro subscription members.

## 2. Implemented Data Collection Points & Events

The following events are currently being tracked for Pro users:

| Event Type         | Trigger                                     | Metadata Collected                                  |
|--------------------|---------------------------------------------|-----------------------------------------------------|
| `post_create`      | User successfully creates a new post.       | `postId`, `hasMedia` (boolean), `category` (string), `postedAsType` ('user' | 'company'), `postedAsEntityId` (string) |
| `post_view`        | User views a post.                          | `postId`                                            |
| `post_like`        | User likes a post.                          | `postId`                                            |
| `post_comment`     | User adds a comment to a post.              | `postId`                                            |
| `post_share`       | User shares a post.                         | `postId`                                            |
| `media_view`       | User views an image or plays a video in a post. | `postId`, `mediaIndex` (number), `mediaType` (string) |
| `company_view`     | User views a company's profile page.        | `companyId`                                         |
| `search_perform`   | User performs a search (e.g., RFQ keyword, feed category filter). | `query` (string), `resultCount` (number)        |

**Note:** `profile_view`, `connection_made`, and `message_sent` are defined in the system but UI implementation for tracking these is pending.

## 3. Data Storage and Structure

### 3.1. `analytics_events` Table
Events are stored in the `public.analytics_events` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g., 'post_view', 'post_like'
  event_data JSONB NOT NULL DEFAULT '{}', -- Contains specific metadata for the event
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'post_view', 'post_create', 'post_like', 'post_comment', 'post_share',
      'media_view', 'profile_view', 'company_view', 'search_perform',
      'connection_made', 'message_sent'
    )
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
```

### 3.2. `AnalyticsEvent` TypeScript Interface

```typescript
// src/lib/analytics.ts
export type AnalyticsEventType = 
  | 'post_view'
  | 'post_create'
  // ... other event types
  | 'search_perform';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  userId: string;
  metadata: Record<string, any>; // Specific to each event type
  // timestamp is handled by 'created_at' in DB
}
```

## 4. Access Control & Data Retrieval

### 4.1. Row Level Security (RLS)
- **Insertion:** Only authenticated users with an active 'PRO' subscription can insert events into `analytics_events`. This is checked against the `user_subscriptions` table.
  ```sql
  CREATE POLICY "Allow Pro users to insert events"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_subscriptions us
      WHERE us.user_id = auth.uid()
      AND us.tier = 'PRO'
      AND us.status IN ('active', 'trialing')
    )
  );
  ```
- **Selection:** Authenticated users can only read their own analytics events.
  ```sql
  CREATE POLICY "Users can read their own events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
  ```

### 4.2. `get_user_analytics` SQL Function
A PostgreSQL function `get_user_analytics(p_user_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)` is available for Pro users to retrieve summarized analytics data.

```sql
-- Retrieves aggregated event counts for a Pro user within a date range.
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  first_occurrence TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ
)
```
This function also checks if the `p_user_id` corresponds to a Pro user before returning data.

## 5. Frontend Tracking Implementation

Tracking is primarily handled by the `trackEvent` function and specific helper methods in `src/lib/analytics.ts`. These functions are called from relevant UI components.

```typescript
// src/lib/analytics.ts
export async function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>) {
  // ... checks for Pro subscription ...
  // ... inserts into 'analytics_events' table ...
}

export const Analytics = {
  trackPostView: (userId: string, postId: string) => { /* ... */ },
  // ... other specific tracking functions
};
```

## 6. Potential Future Enhancements (Not Yet Implemented)
- Detailed audience demographics (requires joining with user profiles).
- Click-through rates on external links in posts.
- Tracking for `profile_view`, `connection_made`, `message_sent`.
- Advanced dashboard visualizations.

## 7. Privacy Considerations
- Analytics are tied to `user_id` but access is restricted by RLS.
- Currently, no specific anonymization is applied beyond RLS restricting data to the event owner.
- Further privacy controls (e.g., opt-out) are not yet implemented.

## 8. Data Collection Points

### 8.1. Post Analytics
- View counts per post
- Engagement rates (likes, comments, shares)
- Peak engagement times
- Audience demographics
- Content performance by category
- Media engagement (image/video view rates)
- Click-through rates on links
- Share conversion rates

### 8.2. Network Analytics
- Connection growth rate
- Industry distribution of connections
- Active vs. passive connections
- Message response rates
- Introduction success rates
- Network reach metrics
- Industry influence score

### 8.3. Company Profile Analytics
- Profile view trends
- Search appearance frequency
- Click-through rates from search
- Visitor company demographics
- Geographic distribution of visitors
- Time spent on profile
- Action conversion rates (follows, messages, etc.)

### 8.4. Content Performance
- Best performing content types
- Optimal posting times
- Audience engagement patterns
- Content longevity metrics
- Hashtag performance
- Topic trend analysis
- Competitor content comparison

### 8.5. Business Opportunity Analytics
- RFQ response rates
- Partnership conversion rates
- Lead generation metrics
- Industry opportunity trends
- Potential collaboration suggestions
- Market penetration metrics
- Business relationship strength scores

## 9. Implementation Strategy

### 9.1. Data Collection
```typescript
interface AnalyticsEvent {
  eventType: string;
  userId: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface ContentAnalytics {
  postId: string;
  views: number;
  uniqueViewers: string[];
  engagementMetrics: {
    likes: number;
    comments: number;
    shares: number;
    saveRate: number;
  };
  performanceScore: number;
}
```

### 9.2. Storage Schema
```sql
CREATE TABLE analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    event_type text NOT NULL,
    event_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE content_analytics (
    content_id uuid PRIMARY KEY,
    metrics jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    historical_data jsonb[]
);
```

### 9.3. Access Control
```sql
-- RLS policies for analytics data
CREATE POLICY "Only Pro users can access analytics"
ON analytics_events
FOR SELECT
USING (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM user_subscriptions
        WHERE user_id = auth.uid()
        AND tier = 'PRO'
        AND status = 'active'
    )
);
```

## 10. Pro Analytics Features

### 10.1. Core Features
- Real-time analytics dashboard
- Custom report generation
- Competitor analysis
- Advanced trend analysis
- Export capabilities
- API access to analytics data
- Custom event tracking
- Automated insights

## 11. Dashboard Components

### 11.1. Overview Dashboard
- Key performance indicators
- Trend visualizations
- Period-over-period comparisons
- Goal tracking
- Alert notifications

### 11.2. Content Analytics Dashboard
- Content performance metrics
- Engagement analysis
- Audience insights
- Publishing recommendations
- A/B test results

### 11.3. Network Analytics Dashboard
- Network growth metrics
- Connection quality scores
- Industry distribution
- Opportunity identification
- Relationship strength indicators

### 11.4. Business Intelligence Dashboard
- Market trend analysis
- Industry benchmarks
- Competitive analysis
- Growth opportunities
- ROI calculations

## 12. Privacy and Security

### 12.1. Data Protection
- Anonymized aggregate data
- Encrypted personal information
- GDPR compliance
- Data retention policies
- Access control logs

### 12.2. User Controls
- Analytics opt-out options
- Data export capabilities
- Privacy preference management
- Custom tracking settings
- Data deletion requests

## 13. Technical Implementation

### 13.1. Event Tracking
```typescript
async function trackAnalyticsEvent(event: AnalyticsEvent) {
  const { data, error } = await supabase
    .from('analytics_events')
    .insert({
      user_id: event.userId,
      event_type: event.eventType,
      event_data: event.metadata
    });
}
```

### 13.2. Data Processing
- Real-time event processing
- Batch analytics calculations
- Trend analysis algorithms
- Machine learning predictions
- Automated reporting

### 13.3. API Endpoints
- Analytics data retrieval
- Custom report generation
- Real-time metrics
- Historical data access
- Export functionality

## 14. Future Enhancements

### 14.1. Planned Features
- AI-powered insights
- Predictive analytics
- Custom dashboard builder
- Advanced visualization tools
- Integration with external tools
- Mobile analytics app

### 14.2. Scalability Considerations
- Data partitioning strategy
- Caching implementation
- Query optimization
- Resource allocation
- Performance monitoring 
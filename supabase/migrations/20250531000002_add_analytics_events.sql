-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add indexes for common queries
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'post_view',
      'post_create',
      'post_like',
      'post_comment',
      'post_share',
      'media_view',
      'profile_view',
      'company_view',
      'search_perform',
      'connection_made',
      'message_sent'
    )
  )
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only allow Pro users to insert events
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

-- Only allow users to read their own events
CREATE POLICY "Users can read their own events"
ON public.analytics_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Add function to get user analytics
CREATE OR REPLACE FUNCTION get_user_analytics(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  first_occurrence TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has Pro subscription
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
    AND tier = 'PRO'
    AND status IN ('active', 'trialing')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ae.event_type,
    COUNT(*) as event_count,
    MIN(ae.created_at) as first_occurrence,
    MAX(ae.created_at) as last_occurrence
  FROM analytics_events ae
  WHERE ae.user_id = p_user_id
  AND ae.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY ae.event_type
  ORDER BY event_count DESC;
END;
$$; 
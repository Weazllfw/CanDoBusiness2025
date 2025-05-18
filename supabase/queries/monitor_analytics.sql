-- Monitor recent analytics events with user details
SELECT 
  ae.created_at,
  ae.event_type,
  ae.event_data,
  p.name as user_name,
  us.tier as subscription_tier,
  us.status as subscription_status
FROM analytics_events ae
JOIN profiles p ON ae.user_id = p.id
LEFT JOIN user_subscriptions us ON ae.user_id = us.user_id
  AND us.status IN ('active', 'trialing')
WHERE ae.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ae.created_at DESC;

-- Count of events by type in the last hour
SELECT 
  event_type,
  COUNT(*) as event_count
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY event_count DESC;

-- Users generating the most events
SELECT 
  p.name as user_name,
  us.tier as subscription_tier,
  COUNT(*) as event_count
FROM analytics_events ae
JOIN profiles p ON ae.user_id = p.id
LEFT JOIN user_subscriptions us ON ae.user_id = us.user_id
  AND us.status IN ('active', 'trialing')
WHERE ae.created_at > NOW() - INTERVAL '24 hours'
GROUP BY p.name, us.tier
ORDER BY event_count DESC
LIMIT 10; 
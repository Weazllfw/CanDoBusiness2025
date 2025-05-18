import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { AnalyticsEventType } from './analytics'

export async function getRecentAnalytics(userId: string, minutes: number = 5) {
  const supabase = createClientComponentClient<Database>();
  
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - minutes * 60000).toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }

  return data;
}

export async function clearTestAnalytics(userId: string) {
  const supabase = createClientComponentClient<Database>();
  
  const { error } = await supabase
    .from('analytics_events')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing test analytics:', error);
  }
}

export async function verifyAnalyticsEvent(
  userId: string,
  eventType: AnalyticsEventType,
  metadata: Record<string, any>,
  timeoutMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const events = await getRecentAnalytics(userId, 1);
    
    if (events) {
      const matchingEvent = events.find(event => 
        event.event_type === eventType &&
        Object.entries(metadata).every(([key, value]) => 
          event.event_data[key] === value
        )
      );
      
      if (matchingEvent) {
        return true;
      }
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
} 
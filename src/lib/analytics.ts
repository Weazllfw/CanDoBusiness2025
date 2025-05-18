import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export type AnalyticsEventType = 
  | 'post_view'
  | 'post_create'
  | 'post_like'
  | 'post_comment'
  | 'post_share'
  | 'media_view'
  | 'profile_view'
  | 'company_view'
  | 'search_perform'
  | 'connection_made'
  | 'message_sent';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  userId: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export async function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>) {
  const supabase = createClientComponentClient<Database>();
  
  try {
    // First check if the user has a Pro subscription
    const { data: subscriptionData } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', event.userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    // Only track events for Pro users
    if (subscriptionData?.tier === 'PRO') {
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: event.userId,
          event_type: event.eventType,
          event_data: event.metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error tracking analytics event:', error);
      }
    }
  } catch (error) {
    console.error('Error in trackEvent:', error);
  }
}

// Utility functions for common events
export const Analytics = {
  trackPostView: (userId: string, postId: string) => 
    trackEvent({
      eventType: 'post_view',
      userId,
      metadata: { postId }
    }),

  trackPostCreate: (userId: string, postId: string, hasMedia: boolean, category: string) =>
    trackEvent({
      eventType: 'post_create',
      userId,
      metadata: { postId, hasMedia, category }
    }),

  trackPostEngagement: (userId: string, postId: string, type: 'like' | 'comment' | 'share') =>
    trackEvent({
      eventType: type === 'like' ? 'post_like' : type === 'comment' ? 'post_comment' : 'post_share',
      userId,
      metadata: { postId }
    }),

  trackMediaView: (userId: string, postId: string, mediaIndex: number, mediaType: string) =>
    trackEvent({
      eventType: 'media_view',
      userId,
      metadata: { postId, mediaIndex, mediaType }
    }),

  trackProfileView: (userId: string, viewedProfileId: string) =>
    trackEvent({
      eventType: 'profile_view',
      userId,
      metadata: { viewedProfileId }
    }),

  trackCompanyView: (userId: string, companyId: string) =>
    trackEvent({
      eventType: 'company_view',
      userId,
      metadata: { companyId }
    }),

  trackSearch: (userId: string, query: string, resultCount: number) =>
    trackEvent({
      eventType: 'search_perform',
      userId,
      metadata: { query, resultCount }
    }),

  trackConnection: (userId: string, connectedUserId: string, type: string) =>
    trackEvent({
      eventType: 'connection_made',
      userId,
      metadata: { connectedUserId, type }
    }),

  trackMessage: (userId: string, recipientId: string, hasAttachments: boolean) =>
    trackEvent({
      eventType: 'message_sent',
      userId,
      metadata: { recipientId, hasAttachments }
    })
}; 
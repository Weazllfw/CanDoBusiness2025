import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database, Json } from '@/types/supabase';

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

export interface AnalyticsEventData {
  postId?: string;
  hasMedia?: boolean;
  category?: string;
  postedAsType?: 'user' | 'company';
  postedAsEntityId?: string;
  mediaIndex?: number;
  mediaType?: string;
  companyId?: string;
  profileUserId?: string;
  query?: string;
  resultCount?: number;
  connectionUserId?: string;
  messageId?: string;
  // Add other specific metadata properties as needed
}

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  userId: string;
  metadata: AnalyticsEventData;
}

const supabase = createClientComponentClient<Database>();

async function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
  if (!event.userId) {
    console.warn('Analytics: trackEvent called without userId. Event not tracked.');
    return;
  }

  try {
    // 1. Check if the user is a PRO subscriber
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier, status')
      .eq('user_id', event.userId)
      .in('status', ['active', 'trialing']) // Consider 'trialing' as active PRO for analytics
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (subError) {
      console.error('Analytics: Error fetching user subscription:', subError.message);
      // Do not track if subscription status is uncertain due to error
      return;
    }

    if (!subscription || subscription.tier !== 'PRO') {
      // console.log('Analytics: User is not PRO or no active subscription. Event not tracked.');
      return; // Silently ignore for non-PRO users
    }

    // 2. Insert the event
    const { error: insertError } = await supabase.from('analytics_events').insert({
      user_id: event.userId,
      event_type: event.eventType,
      event_data: event.metadata as Json,
    });

    if (insertError) {
      console.error('Analytics: Error inserting event:', insertError.message);
    } else {
      // console.log('Analytics: Event tracked:', event.eventType, event.metadata);
    }
  } catch (e: any) {
    console.error('Analytics: Exception in trackEvent:', e.message);
  }
}

export const Analytics = {
  trackPostView: (userId: string, postId: string) => {
    trackEvent({ userId, eventType: 'post_view', metadata: { postId } });
  },
  trackPostCreate: (
    userId: string,
    postId: string,
    hasMedia: boolean,
    category: string,
    postAsDetails: { postedAsType: 'user' | 'company', postedAsEntityId: string }
  ) => {
    trackEvent({
      userId,
      eventType: 'post_create',
      metadata: { postId, hasMedia, category, ...postAsDetails },
    });
  },
  trackPostEngagement: (
    userId: string,
    postId: string,
    engagementType: 'like' | 'comment' | 'share' // Consolidate if needed, or keep separate
  ) => {
    let eventType: AnalyticsEventType;
    switch (engagementType) {
      case 'like':
        eventType = 'post_like';
        break;
      case 'comment':
        eventType = 'post_comment';
        break;
      case 'share':
        eventType = 'post_share';
        break;
      default:
        console.warn('Analytics: Unknown post engagement type:', engagementType);
        return;
    }
    trackEvent({ userId, eventType, metadata: { postId } });
  },
  trackMediaView: (userId: string, postId: string, mediaIndex: number, mediaType: string) => {
    trackEvent({ userId, eventType: 'media_view', metadata: { postId, mediaIndex, mediaType } });
  },
  trackProfileView: (userId: string, profileUserId: string) => {
    trackEvent({ userId, eventType: 'profile_view', metadata: { profileUserId } });
  },
  trackCompanyView: (userId: string, companyId: string) => {
    trackEvent({ userId, eventType: 'company_view', metadata: { companyId } });
  },
  trackSearch: (userId: string, query: string, resultCount: number) => {
    trackEvent({ userId, eventType: 'search_perform', metadata: { query, resultCount } });
  },
  trackConnection: (userId: string, connectionUserId: string) => {
    trackEvent({ userId, eventType: 'connection_made', metadata: { connectionUserId } });
  },
  trackMessage: (userId: string, messageId: string) => {
    trackEvent({ userId, eventType: 'message_sent', metadata: { messageId } });
  },
  // Add other specific tracking functions as needed
}; 
import type { PostCategory } from '@/app/feed/page'; // Assuming PostCategory is defined here
import type { Database } from './supabase'; // Assuming supabase types are here or adjust path

export interface Author {
  name: string;
  role: string;
  avatar: string;
}

export interface Post {
  id: number;
  author: Author;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

export interface Connection {
  id: number;
  name: string;
  role: string;
  industry: string;
  avatar: string;
}

export interface FeedPost {
  post_id: string;
  post_content: string;
  post_created_at: string; // TIMESTAMPTZ will be string
  post_category: Database["public"]["Enums"]["post_category"] | null;
  post_media_urls: string[] | null;
  post_media_types: string[] | null;
  author_user_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  author_subscription_tier: string | null; // Will be ignored by MVP UI
  acting_as_company_id: string | null;
  acting_as_company_name: string | null;
  acting_as_company_logo_url: string | null;
  company_verification_status: string | null; // Will be ignored by MVP UI
  like_count: number;
  comment_count: number;
  bookmark_count: number; // Will be ignored by MVP UI for now
  is_liked_by_current_user: boolean;
  is_bookmarked_by_current_user: boolean; // Will be ignored by MVP UI for now
  feed_ranking_score: number; // Will be ignored by MVP UI
} 
'use client'

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Database } from '../../lib/database.types';
import type { FeedPost } from '../feed/page';
import PostFeed from '@/components/feed/PostFeed';

interface PostWithRelations {
  id: string;
  content: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  user_id: string;
  profiles: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    subscription_tier: string | null;
    company_id: string | null;
    companies: Array<{
      id: string;
      name: string | null;
      avatar_url: string | null;
    }> | null;
  };
  post_likes: Array<{ user_id: string }> | null;
  post_comments: Array<{ id: string }> | null;
  post_bookmarks: Array<{ user_id: string }> | null;
}

export default function BookmarksPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const POSTS_PER_PAGE = 10;

  const fetchBookmarkedPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: rawData, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          media_url,
          media_type,
          user_id,
          profiles!posts_user_id_fkey (
            id,
            name,
            avatar_url,
            subscription_tier,
            company_id,
            companies (
              id,
              name,
              avatar_url
            )
          ),
          post_likes (
            user_id
          ),
          post_comments (
            id
          ),
          post_bookmarks!inner (
            user_id
          )
        `)
        .eq('post_bookmarks.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(POSTS_PER_PAGE);

      if (error) throw error;

      // Transform the raw data to match our expected type
      const data: PostWithRelations[] = rawData.map(post => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }));

      // Transform the data to match FeedPost type
      const transformedPosts: FeedPost[] = data.map(post => ({
        post_id: post.id,
        post_content: post.content,
        post_created_at: post.created_at,
        post_media_url: post.media_url,
        post_media_type: post.media_type,
        author_user_id: post.profiles.id,
        author_name: post.profiles.name || '',
        author_avatar_url: post.profiles.avatar_url || '',
        author_subscription_tier: post.profiles.subscription_tier,
        company_id: post.profiles.company_id,
        company_name: post.profiles.companies?.[0]?.name || null,
        company_avatar_url: post.profiles.companies?.[0]?.avatar_url || null,
        like_count: (post.post_likes || []).length,
        comment_count: (post.post_comments || []).length,
        bookmark_count: (post.post_bookmarks || []).length,
        is_liked_by_current_user: (post.post_likes || []).some(like => like.user_id === user.id),
        is_bookmarked_by_current_user: true, // Since these are bookmarked posts
        is_network_post: 0
      }));

      setPosts(transformedPosts);
      setHasMore(data.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
      setError('Failed to load bookmarked posts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    // Implement load more functionality if needed
  };

  useEffect(() => {
    fetchBookmarkedPosts();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Bookmarks</h1>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Bookmarks</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Bookmarks</h1>
      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You haven't bookmarked any posts yet.</p>
        </div>
      ) : (
        <PostFeed
          initialPosts={posts}
          onLoadMore={loadMore}
          hasMore={hasMore}
        />
      )}
    </div>
  );
} 
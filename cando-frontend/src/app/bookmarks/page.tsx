'use client'

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';
import type { FeedPost } from '@/types/feed';
import PostFeed from '@/components/feed/PostFeed';
import type { User } from '@supabase/supabase-js';

interface PostWithRelations {
  id: string;
  content: string;
  created_at: string;
  media_urls: string[] | null;
  media_types: string[] | null;
  user_id: string;
  category: Database["public"]["Enums"]["post_category"] | null;
  acting_as_company_id: string | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const POSTS_PER_PAGE = 10;

  const fetchBookmarkedPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Error fetching user:', authError);
        setError('Failed to authenticate. Please try logging in again.');
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }
      
      if (!user) {
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }
      setCurrentUser(user);

      const { data: rawDataArray, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          media_urls,
          media_types,
          category,
          acting_as_company_id,
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

      if (postsError) throw postsError;
      if (!rawDataArray) {
        setPosts([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      // Transform the raw data to match our expected type
      const data: PostWithRelations[] = rawDataArray.map((post: any) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
      }));

      // Transform the data to match FeedPost type
      const transformedPosts: FeedPost[] = data.map(post => ({
        post_id: post.id,
        post_content: post.content,
        post_created_at: post.created_at,
        post_category: post.category,
        post_media_urls: post.media_urls,
        post_media_types: post.media_types,
        author_user_id: post.profiles.id,
        author_name: post.profiles.name || '',
        author_avatar_url: post.profiles.avatar_url || '',
        author_subscription_tier: post.profiles.subscription_tier,
        acting_as_company_id: post.acting_as_company_id,
        acting_as_company_name: post.profiles.companies?.[0]?.name || null,
        acting_as_company_logo_url: post.profiles.companies?.[0]?.avatar_url || null,
        company_verification_status: null,
        like_count: (post.post_likes || []).length,
        comment_count: (post.post_comments || []).length,
        bookmark_count: (post.post_bookmarks || []).length,
        is_liked_by_current_user: (post.post_likes || []).some(like => like.user_id === user.id),
        is_bookmarked_by_current_user: true,
        feed_ranking_score: 0
      }));

      setPosts(transformedPosts);
      setHasMore(data.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
      setError('Failed to load bookmarked posts');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  const loadMore = async () => {
    // Implement load more functionality if needed
  };

  useEffect(() => {
    fetchBookmarkedPosts();
  }, [fetchBookmarkedPosts]);

  if (isLoading && !currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Your Bookmarks</h1>
        <p>Authenticating...</p>
      </div>
    );
  }

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
          <p className="text-gray-500">You haven&apos;t bookmarked any posts yet.</p>
        </div>
      ) : (
        <PostFeed
          initialPosts={posts}
          onLoadMore={loadMore}
          hasMore={hasMore}
          currentUser={currentUser}
        />
      )}
    </div>
  );
} 
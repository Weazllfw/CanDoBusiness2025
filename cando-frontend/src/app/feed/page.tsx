'use client'

import PostFeed from '@/components/feed/PostFeed'
import CreatePost from '@/components/feed/CreatePost'
import RightSidebar from '@/components/feed/RightSidebar'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FeedPost } from '@/types/feed'; // Import the consolidated FeedPost type

const POSTS_PER_PAGE = 10;

export default function FeedPage() {
  const supabase = createClientComponentClient<Database>() // Instantiate client here
  const [user, setUser] = useState<User | null>(null)
  const [isUserLoading, setIsUserLoading] = useState(true); // New state for user loading
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false) // Renamed for clarity
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsUserLoading(true); // Start user loading
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error("Error fetching user:", authError);
          setError("Failed to authenticate user."); // Set an error if user fetch fails
        }
        setUser(authUser);
      } catch (e) {
        console.error("Exception fetching user:", e);
        setError("An exception occurred during authentication.");
      } finally {
        setIsUserLoading(false); // End user loading
      }
    };
    fetchUser();
  }, [supabase.auth]); // Added supabase.auth to dependency array

  const fetchPosts = useCallback(async (page: number) => {
    if (!user) {
      console.warn("fetchPosts called without a user.");
      return;
    }

    setIsLoadingPosts(true);
    setError(null);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_feed_posts', {
        p_user_id: user.id,
        p_limit: POSTS_PER_PAGE,
        p_offset: (page - 1) * POSTS_PER_PAGE,
        p_feed_type: 'ALL'
      });

      if (rpcError) throw rpcError;

      const newPosts: FeedPost[] = (rpcData || []).map(p_rpc_item => {
        const rpcItemAsAny = p_rpc_item as any;

        const postItem: FeedPost = {
          post_id: rpcItemAsAny.post_id,
          post_content: rpcItemAsAny.post_content,
          post_created_at: rpcItemAsAny.post_created_at,
          post_category: rpcItemAsAny.post_category,
          post_media_urls: rpcItemAsAny.post_media_urls,
          post_media_types: rpcItemAsAny.post_media_types,
          author_user_id: rpcItemAsAny.author_user_id,
          author_name: rpcItemAsAny.author_name,
          author_avatar_url: rpcItemAsAny.author_avatar_url,
          author_subscription_tier: rpcItemAsAny.author_subscription_tier,
          acting_as_company_id: rpcItemAsAny.acting_as_company_id || null,
          acting_as_company_name: rpcItemAsAny.acting_as_company_id ? rpcItemAsAny.company_name : null,
          acting_as_company_logo_url: rpcItemAsAny.acting_as_company_id ? rpcItemAsAny.company_avatar_url : null,
          company_verification_status: rpcItemAsAny.company_verification_status || null,
          like_count: rpcItemAsAny.like_count,
          comment_count: rpcItemAsAny.comment_count,
          bookmark_count: rpcItemAsAny.bookmark_count,
          is_liked_by_current_user: rpcItemAsAny.is_liked_by_current_user,
          is_bookmarked_by_current_user: rpcItemAsAny.is_bookmarked_by_current_user,
          feed_ranking_score: rpcItemAsAny.feed_ranking_score,
        };
        return postItem;
      });
      
      setPosts((prevPosts) => page === 1 ? newPosts : [...prevPosts, ...newPosts]);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
      setCurrentPage(page);
    } catch (e: any) {
      console.error("Error fetching posts:", e);
      setError(e.message || "Failed to fetch posts.");
      setHasMore(false);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user, supabase]); // Simplified dependencies

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchPosts(1);
    }
    if (!isUserLoading && !user && !error) {
        setError("Please log in to see the feed.");
    }
  }, [isUserLoading, user, fetchPosts, error]); // fetchPosts is stable due to useCallback 

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isUserLoading) {
        fetchPosts(1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchPosts, isUserLoading]);

  const handlePostCreated = () => {
    if (user) {
        fetchPosts(1);
    }
  }

  const handleLoadMore = async () => {
    if (!isLoadingPosts && hasMore && user) {
      fetchPosts(currentPage + 1)
    }
  }

  if (isUserLoading) { 
    return <div className="text-center py-10">Authenticating user...</div>;
  }

  if (error && error !== "Please log in to see the feed.") {
      return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-gray-600">Please log in to see the feed and create posts.</div>;
  }

  return (
    <div className="flex gap-8 max-w-7xl mx-auto py-8">
      <div className="flex-1">
        <CreatePost onPostCreated={handlePostCreated} />
        
        {isLoadingPosts && posts.length === 0 && <div className="text-center py-10">Loading posts...</div>}
        
        {posts.length > 0 && (
          <PostFeed 
            initialPosts={posts} 
            onLoadMore={handleLoadMore} 
            hasMore={hasMore} 
            currentUser={user}
          />
        )}

        {isLoadingPosts && posts.length > 0 && <div className="text-center py-4">Loading more posts...</div>}
        {!isLoadingPosts && !hasMore && posts.length > 0 && <div className="text-center py-4">You&apos;ve reached the end.</div>}
        {!isLoadingPosts && posts.length === 0 && !error && <div className="text-center py-10">No posts to show.</div>}
      </div>
      <RightSidebar />
    </div>
  );
} 
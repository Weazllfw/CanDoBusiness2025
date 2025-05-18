'use client'

import PostFeed from '@/components/feed/PostFeed'
import CreatePost from '@/components/feed/CreatePost'
import RightSidebar from '@/components/feed/RightSidebar'
import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs' // Import specific client
import { type User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase' // Ensure Database type is imported

export type PostCategory = 
  | 'general'
  | 'business_update'
  | 'industry_news'
  | 'job_opportunity'
  | 'event'
  | 'question'
  | 'partnership'
  | 'product_launch';

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  general: 'General',
  business_update: 'Business Update',
  industry_news: 'Industry News',
  job_opportunity: 'Job Opportunity',
  event: 'Event',
  question: 'Question',
  partnership: 'Partnership',
  product_launch: 'Product Launch'
};

export interface FeedPost {
  post_id: string;
  post_content: string;
  post_created_at: string;
  post_category: PostCategory;
  post_media_url: string | null;
  post_media_type: string | null;
  author_user_id: string;
  author_name: string;
  author_avatar_url: string;
  author_subscription_tier: string | null;
  company_id: string | null;
  company_name: string | null;
  company_avatar_url: string | null;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  is_liked_by_current_user: boolean;
  is_bookmarked_by_current_user: boolean;
  is_network_post: number;
}

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
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(null);

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
  }, []);

  const fetchPosts = useCallback(async (page: number) => {
    if (!user) {
      console.warn("fetchPosts called without a user.");
      return;
    }

    setIsLoadingPosts(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_feed_posts', {
        p_user_id: user.id,
        p_limit: POSTS_PER_PAGE,
        p_offset: (page - 1) * POSTS_PER_PAGE,
        p_category: selectedCategory
      });

      if (rpcError) throw rpcError;

      const newPosts = (data || []) as FeedPost[];
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
  }, [user, selectedCategory]);

  // Reset and refetch when category changes
  useEffect(() => {
    if (user && !isUserLoading) {
      setPosts([]);
      setCurrentPage(1);
      fetchPosts(1);
    }
  }, [selectedCategory, user, isUserLoading, fetchPosts]);

  useEffect(() => {
    // Fetch initial posts only when user is loaded and not null
    if (!isUserLoading && user) {
      fetchPosts(1);
    }
    // If user loading is done and there's no user, set an appropriate message or handle
    if (!isUserLoading && !user && !error) { // Added !error to not overwrite auth errors
        setError("Please log in to see the feed.");
    }
  }, [isUserLoading, user, fetchPosts, error]); // Added error to dependency array

  // Effect to refetch posts when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isUserLoading) {
        // Refetch from page 1 to get the latest posts
        fetchPosts(1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listener on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchPosts, isUserLoading]); // Dependencies for the visibility change effect

  const handlePostCreated = () => {
    // Refetch posts from the first page to show the new post at the top
    if (user) {
        fetchPosts(1); 
    }
  }

  const handleLoadMore = async () => {
    if (!isLoadingPosts && hasMore && user) {
      fetchPosts(currentPage + 1)
    }
  }

  if (isUserLoading) { // Primary loading state for user
    return <div className="text-center py-10">Authenticating user...</div>;
  }

  // If there was an error and it's not a "login required" type of message for non-logged-in users
  if (error && error !== "Please log in to see the feed.") {
      return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  }

  // If user is not logged in (and no other critical error occurred)
  if (!user) {
    return <div className="text-center py-10 text-gray-600">Please log in to see the feed and create posts.</div>;
  }

  // User is loaded and authenticated, proceed to show feed content
  return (
    <div className="flex gap-8 max-w-7xl mx-auto py-8">
      <div className="flex-1">
        <div className="mb-6">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Category
          </label>
          <select
            id="category"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value as PostCategory | null)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">All Categories</option>
            {Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <CreatePost companyId="" onPostCreated={handlePostCreated} />
        
        {isLoadingPosts && posts.length === 0 && <div className="text-center py-10">Loading posts...</div>}
        
        {error && posts.length === 0 && error !== "Please log in to see the feed." && 
          <div className="text-red-500 text-center py-4">Error fetching posts: {error}</div>
        }
        
        <PostFeed initialPosts={posts} onLoadMore={handleLoadMore} hasMore={hasMore} />
        
        {isLoadingPosts && posts.length > 0 && <div className="text-center py-4">Loading more posts...</div>}
        {!isLoadingPosts && !hasMore && posts.length > 0 && <div className="text-center py-4 text-gray-500">No more posts to load.</div>}
        {!isLoadingPosts && !hasMore && posts.length === 0 && !error && 
          <div className="text-center py-4 text-gray-500">No posts found in this category.</div>
        }
      </div>
      <RightSidebar />
    </div>
  )
} 
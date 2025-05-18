'use client'

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

interface BookmarkButtonProps {
  postId: string;
  userId: string | undefined;
  initialBookmarkCount: number;
  isInitiallyBookmarked: boolean;
}

export default function BookmarkButton({ 
  postId, 
  userId, 
  initialBookmarkCount,
  isInitiallyBookmarked 
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(isInitiallyBookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClientComponentClient<Database>();

  const handleToggleBookmark = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('toggle_post_bookmark', { p_post_id: postId });

      if (error) {
        console.error('Error toggling bookmark:', error);
        return;
      }

      if (data && data.length > 0) {
        const [result] = data;
        setIsBookmarked(result.is_bookmarked);
        setBookmarkCount(Number(result.bookmark_count));
      }
    } catch (error) {
      console.error('Error in bookmark toggle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={!userId || isLoading}
      className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-blue-600 disabled:opacity-50"
      title={userId ? 'Bookmark this post' : 'Log in to bookmark posts'}
    >
      <svg
        className={`w-5 h-5 ${isBookmarked ? 'fill-blue-600' : 'fill-none'} transition-colors duration-200`}
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {bookmarkCount > 0 && (
        <span className="text-sm">{bookmarkCount}</span>
      )}
    </button>
  );
} 
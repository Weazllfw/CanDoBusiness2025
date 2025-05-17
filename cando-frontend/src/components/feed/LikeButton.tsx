'use client'

import { useState, useEffect } from 'react';
import { likePost, unlikePost } from '../../lib/posts'; // Adjusted path

interface LikeButtonProps {
  postId: string;
  userId: string | undefined; // User might not be loaded initially
  initialLikes: number;
  isInitiallyLiked: boolean;
}

export default function LikeButton({ postId, userId, initialLikes, isInitiallyLiked }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(isInitiallyLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null); // For displaying errors to user if needed

  // Effect to sync state if props change from parent (e.g. parent re-fetches and passes new values)
  useEffect(() => {
    setIsLiked(isInitiallyLiked);
    setLikeCount(initialLikes);
  }, [isInitiallyLiked, initialLikes]);

  const handleLikeToggle = async () => {
    if (isLoading || !userId) {
        // Optionally, prompt user to log in if userId is missing
        if(!userId) console.warn("Login to like posts.");
        return;
    }

    setIsLoading(true);
    // setError(null);

    const currentlyLiked = isLiked;

    // Optimistic update
    setIsLiked(!currentlyLiked);
    setLikeCount(prevCount => currentlyLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (currentlyLiked) {
        const { error: unlikeError } = await unlikePost(postId, userId);
        if (unlikeError) throw unlikeError;
      } else {
        const { error: likeError } = await likePost(postId, userId);
        if (likeError) throw likeError;
      }
    } catch (e: any) {
      console.error('Failed to update like status:', e.message);
      // setError(e.message || 'Could not update like.');
      // Revert optimistic update on error
      setIsLiked(currentlyLiked);
      setLikeCount(prevCount => currentlyLiked ? prevCount + 1 : prevCount - 1); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLikeToggle}
      disabled={isLoading || !userId}
      className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-150 
                  ${isLiked ? 'text-blue-600 hover:text-blue-700' : 'text-gray-600 hover:text-blue-600'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <svg 
        className={`w-5 h-5 ${isLiked ? 'fill-current' : 'fill-none'}`}
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ fill: isLiked ? 'currentColor' : 'none' }} // Inline style for fill to ensure it overrides
      >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 19.5V9m0 0V5.75A2.25 2.25 0 019.25 3.5h1.5A2.25 2.25 0 0113 5.75V9m0 0H7m7 0a2 2 0 012 2v2.25" 
        />
      </svg>
      <span>{likeCount > 0 ? likeCount : ''} {isLiked ? 'Liked' : 'Like'}</span>
    </button>
  );
} 
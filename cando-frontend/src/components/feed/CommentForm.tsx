'use client'

import { useState } from 'react';
import { addComment } from '../../lib/posts';
import type { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { type ThreadedComment } from './CommentItem'; // Use ThreadedComment

interface CommentFormProps {
  postId: string;
  currentUser: User | null; // Current logged-in user
  parentCommentId?: string | null;
  onCommentSubmitted: (newComment: ThreadedComment) => void; // Renamed and type updated
  placeholderText?: string; // Renamed for consistency
}

export default function CommentForm({
  postId,
  currentUser,
  parentCommentId,
  onCommentSubmitted, // Renamed
  placeholderText = 'Write a comment...', // Renamed
}: CommentFormProps) {
  console.log('[CommentForm] Rendered. typeof onCommentSubmitted:', typeof onCommentSubmitted, 'Value:', onCommentSubmitted);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CommentForm] handleSubmit. typeof onCommentSubmitted:', typeof onCommentSubmitted);
    if (typeof onCommentSubmitted !== 'function') {
      console.error('[CommentForm] CRITICAL: onCommentSubmitted is NOT a function inside handleSubmit just before check. Value:', onCommentSubmitted);
      // This explicit check might be redundant if the error occurs at the call site, but good for logging.
    }

    if (!content.trim() || !currentUser) {
      if (!currentUser) setError('You must be logged in to comment.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // addComment now returns data shaped as { ...commentFields, user_object: profile }
    // This structure matches ThreadedComment if we assume depth is handled by re-fetch
    const { data: newComment, error: submissionError } = await addComment(
      postId,
      currentUser.id,
      content.trim(),
      parentCommentId
    ) as { data: ThreadedComment | null, error: any }; // Cast to expected structure

    setIsLoading(false);

    if (submissionError) {
      console.error('Failed to add comment:', submissionError);
      setError(submissionError.message || 'Could not submit comment.');
    } else if (newComment) {
      if (typeof onCommentSubmitted === 'function') {
        onCommentSubmitted(newComment);
      } else {
        console.error('[CommentForm] CRITICAL: onCommentSubmitted is NOT a function right before calling it with newComment. Value:', onCommentSubmitted);
        setError('Error: Could not submit comment due to an internal issue (callback error).');
      }
      setContent(''); // Clear input after successful submission
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start space-x-3 py-3">
      {currentUser?.user_metadata?.avatar_url ? (
        <Image
          src={currentUser.user_metadata.avatar_url}
          alt={currentUser.user_metadata?.name || 'Your avatar'}
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-semibold">
          {currentUser?.user_metadata?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholderText} // Renamed
          rows={2} // Start with 2 rows, can expand if needed or use auto-resizing library
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          disabled={isLoading || !currentUser}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !content.trim() || !currentUser}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
          >
            {isLoading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    </form>
  );
} 
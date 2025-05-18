'use client'

import { useState, useEffect, useCallback } from 'react';
import { fetchComments } from '../../lib/posts';
import CommentItem from './CommentItem';
import type { ThreadedComment } from './CommentItem';
import CommentForm from './CommentForm';
import type { User } from '@supabase/supabase-js';

interface CommentListProps {
  postId: string;
  currentUser: User | null;
  comments: ThreadedComment[]; // Use ThreadedComment
  isLoading: boolean;
  error: string | null;
  onReplySubmitted: (newReply: ThreadedComment) => void; // Add this callback prop
}

export default function CommentList({
  postId, 
  currentUser, 
  comments, 
  isLoading, 
  error, 
  onReplySubmitted // Destructure the new prop
}: CommentListProps) {
  const [sortedComments, setSortedComments] = useState<ThreadedComment[]>(comments);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'most_liked'>('newest');

  useEffect(() => {
    const sortComments = () => {
      const commentsCopy = [...comments];
      switch (sortOption) {
        case 'oldest':
          commentsCopy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        case 'newest':
          commentsCopy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        // Note: most_liked will be implemented when we add like counts to comments
        case 'most_liked':
          // For now, default to newest
          commentsCopy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }
      setSortedComments(commentsCopy);
    };

    sortComments();
  }, [comments, sortOption]);

  // const [comments, setComments] = useState<CommentWithAuthor[]>([]); // State moved to parent
  // const [isLoading, setIsLoading] = useState(false); // State moved to parent
  // const [error, setError] = useState<string | null>(null); // State moved to parent

  // const loadComments = useCallback(async () => { ... }); // Logic moved to parent
  // useEffect(() => { loadComments(); }, [loadComments]); // Effect moved to parent

  // const handleCommentAdded = (newComment: CommentWithAuthor) => { ... }; // This logic is now in PostCard

  // Helper to render comments recursively if we were to build the tree structure here.
  // For now, assuming the list is flat and already sorted with depth, from the RPC.
  const renderComments = (commentList: ThreadedComment[]) => {
    return commentList.map(comment => {
      // Log what is being passed to each CommentItem
      return (
        <CommentItem 
          key={comment.id} 
          comment={comment} 
          postId={postId} // Pass postId
          currentUser={currentUser} 
          onReplySubmitted={onReplySubmitted} // Pass down the callback
        />
      );
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-md font-semibold text-gray-800">Comments</h3>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as 'newest' | 'oldest' | 'most_liked')}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="most_liked">Most Liked</option>
        </select>
      </div>
      
      {/* Form to add a new comment - REMOVED FROM HERE */}
      {/* 
      <CommentForm 
        postId={postId} 
        currentUser={currentUser} 
        onCommentAdded={handleCommentAdded} 
      /> 
      */}

      {isLoading && comments.length === 0 && <p className="text-sm text-gray-500 py-2">Loading comments...</p>}
      {error && <p className="text-sm text-red-500 py-2">Error: {error}</p>}
      
      {!isLoading && !error && comments.length === 0 && (
        <p className="text-sm text-gray-500 py-2">No comments yet.</p> // Simplified message
      )}

      {comments.length > 0 && (
        // The RPC returns a flat list, sorted to represent the thread structure.
        // The depth property in CommentItem handles visual indentation.
        <div className="space-y-1 mt-2">
          {renderComments(sortedComments)}
        </div>
      )}
    </div>
  );
} 
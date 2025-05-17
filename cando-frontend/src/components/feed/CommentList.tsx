'use client'

import { useState, useEffect, useCallback } from 'react';
import { fetchComments } from '../../lib/posts';
import CommentItem from './CommentItem';
import type { ThreadedComment } from './CommentItem';
// import CommentForm from './CommentForm'; // Removed import
import type { User } from '@supabase/supabase-js';

interface CommentListProps {
  postId: string;
  currentUser: User | null;
  comments: ThreadedComment[]; // Use ThreadedComment
  isLoading: boolean;
  error: string | null;
  onReplySubmitted: (newReply: ThreadedComment) => void; // Add this callback prop
}

// export default function CommentList({ postId, currentUser }: CommentListProps) { // Original signature
export default function CommentList({
  postId, 
  currentUser, 
  comments, 
  isLoading, 
  error, 
  onReplySubmitted // Destructure the new prop
}: CommentListProps) {
  console.log('[CommentList] Rendered. typeof onReplySubmitted (prop received):', typeof onReplySubmitted, 'Value:', onReplySubmitted);

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
      console.log(`[CommentList] Rendering CommentItem (key: ${comment.id}). typeof onReplySubmitted (to be passed):`, typeof onReplySubmitted);
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
      {/* <h3 className="text-md font-semibold text-gray-800 mb-2">Comments</h3> */}
      {/* Title is now part of the toggle button in PostCard or could be added here if needed */}
      
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
          {renderComments(comments)}
        </div>
      )}
    </div>
  );
} 
'use client'

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link'; // Optional: for linking to user profiles
import FlagButton from './FlagButton'; // Import FlagButton
import type { User } from '@supabase/supabase-js'; // Import User for currentUser prop
import CommentForm from './CommentForm'; // Assuming CommentForm is in the same directory

// Updated Comment type to include depth and use user_object
export interface ThreadedComment {
  id: string;
  created_at: string;
  content: string;
  parent_comment_id: string | null;
  user_id: string; // This is the author's ID (from auth.users)
  depth: number;
  user_object: { // This structure comes from fetchComments & addComment mapping
    id: string; // This is profiles.id, same as user_id
    name: string | null;
    avatar_url: string | null;
    // email?: string; // email is also available if needed
  } | null;
  // Potentially other fields like status, etc., if returned by RPC and needed
}

interface CommentItemProps {
  comment: ThreadedComment;
  postId: string; // PostId needed for replying
  currentUser: User | null; 
  onReplySubmitted: (newReply: ThreadedComment) => void; // Callback for when a reply is made
}

export default function CommentItem({ comment, postId, currentUser, onReplySubmitted }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const authorName = comment.user_object?.name || 'User';
  const authorAvatar = comment.user_object?.avatar_url;

  const handleReplySuccess = (newReply: ThreadedComment) => {
    console.log('[CommentItem] handleReplySuccess called. typeof onReplySubmitted (prop to CommentItem):', typeof onReplySubmitted);
    setShowReplyForm(false);
    if (typeof onReplySubmitted === 'function') {
      onReplySubmitted(newReply);
    } else {
      console.error('[CommentItem] CRITICAL: onReplySubmitted prop is NOT a function. Value:', onReplySubmitted);
    }
  };

  return (
    <div 
      className="flex space-x-3 py-3 border-b border-gray-100 last:border-b-0"
      style={{ marginLeft: `${comment.depth * 20}px` }} // Indentation based on depth
    >
      {authorAvatar ? (
        <Image
          src={authorAvatar}
          alt={authorName}
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-semibold">
          {authorName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-grow">
        <div className="flex items-center space-x-2 mb-0.5">
          {/* Optional: Link to user's profile */}
          {/* <Link href={`/profile/${comment.profiles?.id || comment.user_id}`}> */}
            <span className="text-sm font-semibold text-gray-800 hover:underline">
              {authorName}
            </span>
          {/* </Link> */}
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
        <div className="mt-1 flex items-center space-x-3">
          {currentUser && (
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-blue-500 hover:underline"
            >
              {showReplyForm ? 'Cancel' : 'Reply'}
            </button>
          )}
          {currentUser && (
            <FlagButton 
              contentId={comment.id} 
              contentType="comment" 
              currentUserId={currentUser.id} 
            />
          )}
        </div>
        {showReplyForm && currentUser && (
          <div className="mt-2">
            {/* Log added above this block for clarity when it's about to render */}
            <CommentForm 
              postId={postId} 
              parentCommentId={comment.id} 
              currentUser={currentUser} 
              onCommentSubmitted={handleReplySuccess} 
              placeholderText="Write a reply..."
            />
          </div>
        )}
      </div>
    </div>
  );
} 
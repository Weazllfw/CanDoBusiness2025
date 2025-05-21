'use client'

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import Image from 'next/image';
import Link from 'next/link'; // Optional: for linking to user profiles
import FlagButton from './FlagButton'; // Import FlagButton
import type { User } from '@supabase/supabase-js'; // Import User for currentUser prop
import CommentForm from './CommentForm'; // Assuming CommentForm is in the same directory
import { PencilIcon, TrashIcon, FlagIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import toast from 'react-hot-toast';
import { ShieldCheckIcon } from '@heroicons/react/24/solid'; // Added for verified badge

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
  commenter_verified_company_id?: string | null; // Added
  commenter_verified_company_name?: string | null; // Added
  commenter_verified_company_logo_url?: string | null; // Added
  // Potentially other fields like status, etc., if returned by RPC and needed
}

interface CommentItemProps {
  comment: ThreadedComment;
  postId: string; // PostId needed for replying
  currentUser: User | null; 
  onReplySubmitted?: (newReply: ThreadedComment) => void;
  onDelete?: (commentId: string) => void;
  onUpdate?: (updatedComment: ThreadedComment) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  postId, 
  currentUser, 
  onReplySubmitted,
  onDelete,
  onUpdate
}) => {
  const supabase = createClientComponentClient<Database>();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const depth = comment.depth || 0;
  const MAX_DEPTH_FOR_INDENT = 5; // Max depth for visual indentation
  const indentLevel = Math.min(depth, MAX_DEPTH_FOR_INDENT);

  const authorName = comment.user_object?.name || 'User';
  const authorAvatar = comment.user_object?.avatar_url;

  // Display logic for commenter (User or Company)
  const displayAvatar = comment.commenter_verified_company_logo_url || authorAvatar;
  const displayName = comment.commenter_verified_company_name 
    ? `${comment.commenter_verified_company_name} (${authorName})` 
    : authorName;
  const displayLink = comment.commenter_verified_company_id 
    ? `/company/${comment.commenter_verified_company_id}`
    : `/users/${comment.user_id}`; // Assume /users/:id route for profiles

  const handleReplySubmittedInternal = useCallback((newReply: ThreadedComment) => {
    setShowReplyForm(false);
    if (onReplySubmitted) {
      onReplySubmitted(newReply);
    }
  }, [onReplySubmitted]);

  const handleDelete = async () => { /* ... */ };
  const handleUpdate = async () => { /* ... */ };

  return (
    <div className={`pl-${indentLevel * 4} border-l-2 ${indentLevel > 0 ? 'border-gray-200' : 'border-transparent'} pt-2 first:pt-0`}>
      <div className="flex space-x-3">
        {displayAvatar ? (
          <Link href={displayLink} passHref>
            <Image
              src={displayAvatar}
              alt={displayName}
              width={32}
              height={32}
              className="rounded-full object-cover cursor-pointer"
            />
          </Link>
        ) : (
          <Link href={displayLink} passHref>
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
              {(comment.commenter_verified_company_name || authorName).charAt(0).toUpperCase()}
            </div>
          </Link>
        )}
        <div className="flex-grow">
          <div className="flex items-center space-x-2 mb-0.5">
            <Link href={displayLink} passHref>
              <span className="text-sm font-semibold text-gray-800 hover:underline cursor-pointer">
                {displayName}
              </span>
            </Link>
            {comment.commenter_verified_company_id && (
                <ShieldCheckIcon className="h-4 w-4 text-blue-500" title="Verified Company Commenter"/>
            )}
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
                contentOwnerId={comment.user_id} 
              />
            )}
          </div>
          {showReplyForm && currentUser && (
            <div className="mt-2 ml-8">
              <CommentForm 
                postId={postId} 
                currentUser={currentUser} 
                parentId={comment.id} 
                parentDepth={comment.depth}
                onCommentSubmitted={handleReplySubmittedInternal}
                placeholderText={`Replying to ${comment.user_object?.name || 'User'}...`}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem; 
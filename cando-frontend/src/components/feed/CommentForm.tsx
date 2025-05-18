'use client'

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { CommentWithAuthor, ThreadedComment } from '@/types/comments';
import toast from 'react-hot-toast';

interface CommentFormProps {
  postId: string;
  currentUser: User | null;
  parentId?: string | null; // For replies
  parentDepth?: number; // For replies, to calculate depth
  onCommentSubmitted: (newComment: ThreadedComment) => void;
  placeholderText?: string;
  onCancel?: () => void; // Optional: for reply forms
}

const CommentForm: React.FC<CommentFormProps> = ({ 
  postId, 
  currentUser, 
  parentId = null, 
  parentDepth,
  onCommentSubmitted, 
  placeholderText = "Write a comment...",
  onCancel
}) => {
  const supabase = createClientComponentClient<Database>();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const { data: newCommentData, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: content.trim(),
          parent_comment_id: parentId,
        })
        .select('*, author:profiles!inner(*)')
        .single();

      if (error) throw error;

      if (newCommentData) {
        const authorProfile = Array.isArray(newCommentData.author) ? newCommentData.author[0] : newCommentData.author;

        if (!authorProfile) {
            // This case should ideally not happen if profiles!inner(*) is used and RLS allows.
            // Or if newCommentData.user_id can be used to fetch profile separately if author is null.
            // For now, let's throw or log an error, as ThreadedComment expects a non-null user_object.
            // However, ThreadedComment definition allows user_object to be null.
            // Let's adjust the ThreadedComment mapping to handle a potentially null author more gracefully.
            // For now, proceeding with existing logic, assuming authorProfile is usually present.
        }
        
        const commentDepth = parentId !== null ? (parentDepth || 0) + 1 : 0;

        const newThreadedComment: ThreadedComment = {
          ...newCommentData,
          user_object: authorProfile ? {
            id: authorProfile.id,
            name: authorProfile.name,
            avatar_url: authorProfile.avatar_url,
          } : null,
          depth: commentDepth,
        };
        
        toast.success(parentId ? 'Reply posted!' : 'Comment posted!');
        onCommentSubmitted(newThreadedComment);
        setContent('');
        if (parentId && onCancel) onCancel();
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholderText}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
        rows={parentId ? 2 : 3} 
        disabled={!currentUser || isSubmitting}
      />
      <div className="flex justify-end space-x-2">
        {onCancel && (
            <button 
                type="button" 
                onClick={onCancel}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 disabled:opacity-50"
                disabled={isSubmitting}
            >
                Cancel
            </button>
        )}
        <button 
          type="submit" 
          disabled={!content.trim() || isSubmitting || !currentUser}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : (parentId ? 'Post Reply' : 'Post Comment')}
        </button>
      </div>
    </form>
  );
};

export default CommentForm; 
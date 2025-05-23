import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Added Image for author avatar
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'; // Corrected import path
import { fetchComments } from '@/lib/posts';
import CommentList from './CommentList';
import CommentForm from './CommentForm';
import { type ThreadedComment } from './CommentItem';
import type { CommentWithAuthor } from '@/types/comments';
import type { User } from '@supabase/supabase-js';
import type { FeedPost } from '@/types/feed'; // Import the new FeedPost type
import LikeButton from './LikeButton'; // Import LikeButton
// Placeholder icons - replace with actual HeroIcon imports if available
import { HeartIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';

interface PostItemProps {
  post: FeedPost; // Use the new FeedPost type
  currentUser: User | null; // Changed 'any' to 'User | null'
}

const PostItem = ({ post, currentUser }: PostItemProps) => {
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Optimistic state for likes is now handled by LikeButton itself.
  // const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.like_count);
  // const [optimisticIsLiked, setOptimisticIsLiked] = useState(post.is_liked_by_current_user);

  // useEffect(() => {
  //   setOptimisticLikeCount(post.like_count);
  //   setOptimisticIsLiked(post.is_liked_by_current_user);
  // }, [post.like_count, post.is_liked_by_current_user]);

  const loadCommentsForPost = useCallback(async () => {
    if (!post.post_id) return;
    setIsLoadingComments(true);
    setCommentError(null);
    try {
      const { data: fetchedComments, error } = await fetchComments(post.post_id);
      if (error) {
        console.error("Failed to load comments:", error);
        setCommentError(error.message || 'Could not load comments.');
      } else {
        setComments(fetchedComments || []);
      }
    } catch (e: any) {
      console.error("Exception while loading comments:", e);
      setCommentError(e.message || 'An unexpected error occurred.');
    }
    setIsLoadingComments(false);
  }, [post.post_id]);

  const handleToggleComments = useCallback(() => {
    if (!showComments && comments.length === 0 && !isLoadingComments) {
      loadCommentsForPost();
    }
    setShowComments(prevShowComments => !prevShowComments);
  }, [showComments, comments.length, isLoadingComments, loadCommentsForPost]);

  const handleNewTopLevelComment = useCallback((newComment: CommentWithAuthor) => {
    const commentWithDepth: ThreadedComment = {
      ...newComment,
      depth: 0,
      user_object: newComment.user_object,
    };
    setComments(prevComments => [commentWithDepth, ...prevComments]);
  }, []);

  const handleCommentReply = useCallback((newReply: ThreadedComment) => {
    loadCommentsForPost();
  }, [loadCommentsForPost]);

  // Removed placeholder handleLikeToggle as LikeButton handles its own logic

  return (
    <div className="bg-white shadow-md rounded-lg p-4 my-4">
      <div className="flex items-start space-x-3 mb-3">
        {post.author_avatar_url ? (
          <Link href={`/users/${post.author_user_id}`}>
            <Image 
              src={post.author_avatar_url} 
              alt={post.author_name || 'User avatar'} 
              width={40} 
              height={40} 
              className="rounded-full cursor-pointer"
            />
          </Link>
        ) : (
          <Link href={`/users/${post.author_user_id}`}>
            <span className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-lg font-semibold cursor-pointer">
              {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U'}
            </span>
          </Link>
        )}
        <div>
          <Link href={`/users/${post.author_user_id}`}>
            <span className="font-semibold text-gray-800 hover:underline cursor-pointer">{post.author_name || 'Unnamed User'}</span>
          </Link>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(post.post_created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <p className="text-gray-800 whitespace-pre-wrap mb-3">{post.post_content}</p>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
        <LikeButton 
          postId={post.post_id}
          userId={currentUser?.id}
          initialLikes={post.like_count}
          isInitiallyLiked={post.is_liked_by_current_user}
        />
        <button onClick={handleToggleComments} className="flex items-center space-x-1 hover:text-primary-600">
          <ChatBubbleOvalLeftIcon className="h-5 w-5" />
          <span>{post.comment_count || comments.length} {post.comment_count === 1 ? 'Comment' : 'Comments'}</span>
        </button>
        {/* Bookmark button can be added here if needed for MVP fast-follow */}
      </div>

      {showComments && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-md font-semibold mb-3 text-gray-700">Comments</h4>
          {currentUser ? (
            <CommentForm 
              postId={post.post_id} 
              currentUser={currentUser} 
              onCommentSubmitted={handleNewTopLevelComment}
              placeholderText="Write a comment..."
            />
          ) : (
            <p className="text-sm text-gray-600">Please <Link href="/auth/login" className="text-primary-600 hover:underline">log in</Link> to comment.</p>
          )}
          
          {isLoadingComments && <p className="text-sm text-gray-500 mt-2">Loading comments...</p>}
          {commentError && <p className="text-sm text-red-500 mt-2">Error: {commentError}</p>}
          
          {!isLoadingComments && !commentError && comments.length > 0 && (
            <CommentList 
              postId={post.post_id}
              currentUser={currentUser}
              comments={comments}
              isLoading={isLoadingComments}
              error={commentError}
              onReplySubmitted={handleCommentReply}
            />
          )}
          {!isLoadingComments && !commentError && comments.length === 0 && (
            <p className="text-sm text-gray-500 mt-3">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PostItem; 
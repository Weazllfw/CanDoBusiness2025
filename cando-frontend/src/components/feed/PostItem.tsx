import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchComments } from '@/lib/posts'; // fetchComments now calls the RPC
import CommentList from './CommentList';
import CommentForm from './CommentForm';
import { type ThreadedComment } from './CommentItem'; // For typing comments state
import type { CommentWithAuthor } from '@/types/comments'; // Import CommentWithAuthor
import type { User } from '@supabase/supabase-js';
// Assuming other imports like User, Post types, LikeButton etc. are present

// Placeholder for the actual Post type, adjust as per your project
interface Post {
  id: string;
  content: string;
  comment_count?: number;
  // ... other post properties
}

// Placeholder for the actual Comment type, adjust as per your project
// This should align with what fetchComments and addComment return
interface Comment {
  id: string;
  content: string;
  created_at: string;
  depth: number;
  parent_comment_id: string | null;
  user_object: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  // ... other comment properties
}

interface PostItemProps {
  post: Post;
  currentUser: any; // Replace with your actual User type
}

const PostItem = ({ post, currentUser }: PostItemProps) => {
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadCommentsForPost = useCallback(async () => {
    if (!post.id) return;
    setIsLoadingComments(true);
    setCommentError(null);
    try {
      const { data: fetchedComments, error } = await fetchComments(post.id);
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
  }, [post.id]);

  const handleToggleComments = useCallback(() => {
    if (!showComments && comments.length === 0 && !isLoadingComments) {
      loadCommentsForPost();
    }
    setShowComments(prevShowComments => !prevShowComments);
  }, [showComments, comments.length, isLoadingComments, loadCommentsForPost]);

  const handleNewTopLevelComment = useCallback((newComment: CommentWithAuthor) => {
    // Add depth for ThreadedComment structure
    const commentWithDepth: ThreadedComment = { ...newComment, depth: 0, user_object: newComment.author };
    setComments(prevComments => [commentWithDepth, ...prevComments]);
  }, []);

  const handleCommentReply = useCallback((newReply: ThreadedComment) => {
    loadCommentsForPost();
  }, [loadCommentsForPost]);

  return (
    <div className="bg-white shadow-md rounded-lg p-4 my-4">
      {/* Placeholder for Post Content - adapt from your existing PostItem */}
      <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      {/* Other post details: author, timestamp, like button etc. */}
      <div className="mt-2">
        {/* ... LikeButton and other post interactions ... */}
      </div>

      <div className="mt-4">
        <button 
          onClick={handleToggleComments}
          className="text-sm text-blue-600 hover:underline"
        >
          {showComments ? 'Hide' : 'View'} Comments ({post.comment_count || comments.length})
        </button>
      </div>

      {showComments && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">Leave a comment</h4>
          {currentUser ? (
            <CommentForm 
              postId={post.id} 
              currentUser={currentUser} 
              onCommentSubmitted={handleNewTopLevelComment}
              placeholderText="Write a comment..."
            />
          ) : (
            <p className="text-sm text-gray-600">Please <Link href="/auth/login" className="underline">log in</Link> to comment.</p>
          )}
          
          {isLoadingComments && <p className="text-sm text-gray-500 mt-2">Loading comments...</p>}
          {commentError && <p className="text-sm text-red-500 mt-2">{commentError}</p>}
          
          {!isLoadingComments && !commentError && (
            <CommentList 
              postId={post.id}
              currentUser={currentUser}
              comments={comments}
              isLoading={isLoadingComments}
              error={commentError}
              onReplySubmitted={handleCommentReply}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PostItem; 
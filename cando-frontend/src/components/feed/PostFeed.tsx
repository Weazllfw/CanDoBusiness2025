'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import { FeedPost } from '../../app/feed/page'
import LikeButton from './LikeButton'
import CommentList from './CommentList'
import CommentForm from './CommentForm'
import { type ThreadedComment } from './CommentItem'
import { fetchComments } from '../../lib/posts'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import FlagButton from './FlagButton'

interface PostFeedProps {
  initialPosts: FeedPost[]
  onLoadMore: () => Promise<void>
  hasMore: boolean
}

function PostCard({ post }: { post: FeedPost }) {
  console.log('PostCard received post in PostFeed.tsx:', post); // Debug log
  const [isExpanded, setIsExpanded] = useState(false)
  const content = post.post_content || ''
  const isLongContent = content.length > 280
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState<number>(post.comment_count || 0);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [supabase]);

  const loadComments = useCallback(async () => {
    if (!post.post_id) return;
    console.log(`[PostCard ${post.post_id}] loadComments called`);
    setIsLoadingComments(true);
    setCommentsError(null);
    const { data, error: fetchError } = await fetchComments(post.post_id);
    setIsLoadingComments(false);
    if (fetchError) {
      console.error('Failed to load comments in PostCard:', fetchError);
      setCommentsError(fetchError.message || 'Could not load comments.');
      setComments([]);
    } else {
      setComments((data as ThreadedComment[]) || []);
    }
  }, [post.post_id]);

  useEffect(() => {
    if (showComments && comments.length === 0 && post.post_id && !isLoadingComments) {
      loadComments();
    }
  }, [showComments, comments.length, post.post_id, loadComments, isLoadingComments]);

  const handleNewTopLevelComment = useCallback((newComment: ThreadedComment) => {
    console.log(`[PostCard ${post.post_id}] handleNewTopLevelComment called.`);
    loadComments();
    setCommentCount(prevCount => prevCount + 1);
    if (!showComments) {
        setShowComments(true);
    }
  }, [loadComments, showComments]);

  const handleCommentReply = useCallback((newReply: ThreadedComment) => {
    console.log(`[PostCard ${post.post_id}] handleCommentReply called.`);
    loadComments();
  }, [loadComments]);

  const toggleShowComments = useCallback(() => {
    setShowComments(prev => !prev);
    if (!showComments && comments.length === 0 && post.post_id && !isLoadingComments) {
        loadComments();
    }
  }, [showComments, comments.length, post.post_id, isLoadingComments, loadComments]);

  if (showComments) {
    if (currentUser) {
        console.log(`[PostCard ${post.post_id}] Preparing to render CommentForm. typeof handleNewTopLevelComment:`, typeof handleNewTopLevelComment);
    }
    if (!isLoadingComments && !commentsError) {
        console.log(`[PostCard ${post.post_id}] Preparing to render CommentList. typeof handleCommentReply:`, typeof handleCommentReply);
    }
  }

  return (
    <article className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {post.author_avatar_url && (
            <Image 
              src={post.author_avatar_url} 
              alt={post.author_name || 'Author'} 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          )}
          <div>
            <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                    {post.author_name || 'Anonymous User'}
                </span>
                {post.company_id && post.company_name && (
                    <>
                        <span className="text-gray-500">at</span>
                        <Link
                            href={`/company/${post.company_id}`}
                            className="text-lg font-semibold text-blue-700 hover:text-blue-800"
                        >
                            {post.company_name}
                        </Link>
                    </>
                )}
            </div>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.post_created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {post.post_content && (
         <div className="prose max-w-none mb-2">
          {isLongContent && !isExpanded ? (
            <>
              <p dangerouslySetInnerHTML={{ __html: content.slice(0, 280).replace(/\n/g, '<br />') + '...' }} />
              <button
                onClick={() => setIsExpanded(true)}
                className="text-blue-600 hover:text-blue-700 font-medium mt-1"
              >
                See more
              </button>
            </>
          ) : (
            <p dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
          )}
        </div>
      )}

      {post.post_media_url && post.post_media_type?.startsWith('image/') && (
        <div style={{ width: '300px', height: '200px', position: 'relative' }}>
          <img
            src={post.post_media_url.trim()}
            alt={post.post_content || "Post media"}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
            }}
          />
        </div>
      )}
      {post.post_media_url && post.post_media_type?.startsWith('video/') && (
        <div style={{ width: '300px', height: '200px', position: 'relative' }}>
          <video controls src={post.post_media_url} className="w-full h-full rounded-md" style={{ objectFit: 'contain' }} />
        </div>
      )}

      <div className="mt-4 pt-4 border-t flex flex-col">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
                <LikeButton 
                    postId={post.post_id}
                    userId={currentUser?.id}
                    initialLikes={post.like_count}
                    isInitiallyLiked={post.is_liked_by_current_user}
                />
                <button 
                    onClick={toggleShowComments}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 5.523-4.477 10-10 10S1 17.523 1 12s4.477-10 10-10 10 4.477 10 10z"></path></svg>
                    <span>
                        {showComments 
                            ? 'Hide Comments' 
                            : (commentCount > 0 ? `Show ${commentCount} Comment${commentCount > 1 ? 's' : ''}` : 'Show Comments')
                        }
                    </span>
                </button>
            </div>
            {currentUser && (
              <FlagButton 
                contentId={post.post_id} 
                contentType="post" 
                currentUserId={currentUser.id} 
              />
            )}
        </div>
        
        <div className="mt-3 w-full">
            <CommentForm 
                postId={post.post_id} 
                currentUser={currentUser} 
                onCommentSubmitted={handleNewTopLevelComment}
                placeholderText="Write a comment..."
            />
        </div>

      </div>
      
      {showComments && (
        <CommentList 
            postId={post.post_id} 
            currentUser={currentUser} 
            comments={comments} 
            isLoading={isLoadingComments} 
            error={commentsError} 
            onReplySubmitted={handleCommentReply}
        />
      )}
    </article>
  )
}

export default function PostFeed({ initialPosts, onLoadMore, hasMore }: PostFeedProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return
    try {
      setIsLoading(true)
      await onLoadMore()
    } finally {
      setIsLoading(false)
    }
  }

  if (!initialPosts || initialPosts.length === 0) {
    return null;
  }

  return (
    <div>
      {initialPosts.map((post) => (
        <PostCard key={post.post_id} post={post} />
      ))}

      {hasMore && (
        <div className="flex justify-center mt-4 mb-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More Posts'}
          </button>
        </div>
      )}
    </div>
  )
} 
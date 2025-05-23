'use client'

import { useState, useEffect, useCallback, useRef, forwardRef, Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { type FeedPost } from '@/types/feed'
import LikeButton from './LikeButton'
import CommentList from './CommentList'
import CommentForm from './CommentForm'
import { type ThreadedComment } from '@/types/comments'
import { type CommentWithAuthor } from '@/types/comments'
import { fetchComments } from '../../lib/posts'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import FlagButton from './FlagButton'
import BookmarkButton from './BookmarkButton'
import ShareButton from './ShareButton'
import { CheckBadgeIcon, ShieldCheckIcon, UserCircleIcon } from '@heroicons/react/24/solid'
import { HeartIcon, ChatBubbleOvalLeftEllipsisIcon, BookmarkIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { Menu, Transition } from '@headlessui/react'
import { toast } from 'react-hot-toast'
import type { Database } from '@/types/supabase'

interface PostFeedProps {
  initialPosts: FeedPost[]
  onLoadMore: () => Promise<void>
  hasMore: boolean
  currentUser: User | null
}

interface PostCardProps {
  post: FeedPost
  currentUser: User | null
  onToggleLike: (postId: string, currentLikeStatus: boolean) => Promise<void>
  onToggleBookmark: (postId: string, currentBookmarkStatus: boolean) => Promise<void>
  onCommentAdded: (postId: string) => void
}

const PostCard = forwardRef<HTMLDivElement, PostCardProps>(({ post, currentUser, onToggleLike, onToggleBookmark, onCommentAdded }, ref) => {
  const supabase = createClientComponentClient<Database>()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLiked, setIsLiked] = useState(post.is_liked_by_current_user)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked_by_current_user)
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmark_count)
  const [commentCount, setCommentCount] = useState(post.comment_count)
  const [showCommentInput, setShowCommentInput] = useState(false)

  const content = post.post_content || ''
  const isLongContent = content.length > 280

  useEffect(() => {
    setIsLiked(post.is_liked_by_current_user)
    setLikeCount(post.like_count)
    setIsBookmarked(post.is_bookmarked_by_current_user)
    setBookmarkCount(post.bookmark_count)
    setCommentCount(post.comment_count)
  }, [post.is_liked_by_current_user, post.like_count, post.is_bookmarked_by_current_user, post.bookmark_count, post.comment_count])

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please log in to like posts.")
      return
    }
    const newLikeStatus = !isLiked
    setIsLiked(newLikeStatus)
    setLikeCount(prev => newLikeStatus ? prev + 1 : prev - 1)
    try {
      await onToggleLike(post.post_id, newLikeStatus)
    } catch (error) {
      setIsLiked(!newLikeStatus)
      setLikeCount(prev => !newLikeStatus ? prev + 1 : prev - 1)
      toast.error("Failed to update like status.")
    }
  }

  const handleBookmark = async () => {
    if (!currentUser) {
      toast.error("Please log in to bookmark posts.")
      return
    }
    const newBookmarkStatus = !isBookmarked
    setIsBookmarked(newBookmarkStatus)
    setBookmarkCount(prev => newBookmarkStatus ? prev + 1 : prev - 1)
    try {
      await onToggleBookmark(post.post_id, newBookmarkStatus)
    } catch (error) {
      setIsBookmarked(!newBookmarkStatus)
      setBookmarkCount(prev => !newBookmarkStatus ? prev + 1 : prev - 1)
      toast.error("Failed to update bookmark status.")
    }
  }

  const handleCommentFormSubmit = (newComment: ThreadedComment) => {
    setShowCommentInput(false)
    setCommentCount(prev => prev + 1)
    onCommentAdded(post.post_id)
  }

  const isActingAsCompany = !!post.acting_as_company_id

  return (
    <article ref={ref} className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Avatar Logic considering acting_as_company > company > author */}
          {isActingAsCompany && post.acting_as_company_logo_url ? (
            <Link href={`/company/${post.acting_as_company_id}`} passHref>
              <Image 
                src={post.acting_as_company_logo_url} 
                alt={post.acting_as_company_name || 'Company Logo'} 
                width={40} 
                height={40} 
                className="rounded-full cursor-pointer"
              />
            </Link>
          ) : post.author_avatar_url ? (
            <Link href={`/users/${post.author_user_id}`} passHref> {/* Assume /users/:id route */}
              <Image 
                src={post.author_avatar_url} 
                alt={post.author_name || 'User Avatar'} 
                width={40} 
                height={40} 
                className="rounded-full cursor-pointer"
              />
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
              {isActingAsCompany ? 
                (post.acting_as_company_name ? post.acting_as_company_name.charAt(0).toUpperCase() : 'C') :
                (post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U')
              }
            </div>
          )}
          <div>
            <div className="flex items-center space-x-1">
              {/* Name Logic considering acting_as_company > company > author */}
              {isActingAsCompany && post.acting_as_company_name ? (
                <>
                  <Link
                      href={`/company/${post.acting_as_company_id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                  >
                      {post.acting_as_company_name}
                  </Link>
                  <span className="text-sm text-gray-500">
                    (by <Link href={`/users/${post.author_user_id}`} className="hover:underline">{post.author_name || 'User'}</Link>)
                  </span>
                </>
              ) : (
                <Link href={`/users/${post.author_user_id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                  {post.author_name || 'Anonymous User'}
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(post.post_created_at), { addSuffix: true })}
                </p>
            </div>
          </div>
        </div>
        {/* More Actions Menu */}
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700">
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="px-1 py-1 ">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-primary-500 text-white' : 'text-gray-900'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                      onClick={() => console.log("Report post", post.post_id)}
                    >
                      Report Post
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
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

      {post.post_media_urls && post.post_media_urls.length > 0 && (
        <div className={`grid ${post.post_media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-4`}>
          {post.post_media_urls.map((url: string, index: number) => {
            const mediaType = post.post_media_types?.[index] || '';
            
            if (mediaType.startsWith('image/')) {
              return (
                <div key={index} className="relative aspect-square">
                  <Image
                    src={url.trim()}
                    alt={`Post media ${index + 1}`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                </div>
              );
            }
            
            if (mediaType.startsWith('video/')) {
              return (
                <div key={index} className="relative aspect-video">
                  <video 
                    controls 
                    src={url} 
                    className="w-full h-full rounded-md"
                  />
                </div>
              );
            }
            
            return null;
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t flex flex-col">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
                <button onClick={handleLike} className="flex items-center space-x-1 hover:text-red-500 focus:outline-none">
                    {isLiked ? <HeartIconSolid className="h-5 w-5 text-red-500" /> : <HeartIcon className="h-5 w-5" />}
                    <span className="text-sm">{likeCount}</span>
                </button>
                <button onClick={() => setShowCommentInput(!showCommentInput)} className="flex items-center space-x-1 hover:text-blue-500 focus:outline-none">
                    <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
                    <span className="text-sm">{commentCount}</span>
                </button>
                <BookmarkButton
                  postId={post.post_id}
                  userId={currentUser?.id}
                  initialBookmarkCount={post.bookmark_count}
                  isInitiallyBookmarked={post.is_bookmarked_by_current_user}
                />
                <ShareButton
                  postId={post.post_id}
                  postContent={post.post_content}
                />
            </div>
            {currentUser && post.author_user_id && (
              <FlagButton 
                contentId={post.post_id} 
                contentType="post" 
                contentOwnerId={post.author_user_id} 
              />
            )}
        </div>
        
        {showCommentInput && (
            <div className="mt-3 w-full">
                <CommentForm 
                    postId={post.post_id} 
                    currentUser={currentUser} 
                    onCommentSubmitted={handleCommentFormSubmit} 
                    placeholderText="Write a comment..."
                    onCancel={() => setShowCommentInput(false)}
                />
            </div>
        )}

      </div>
    </article>
  )
})

PostCard.displayName = 'PostCard'

export default function PostFeed({ initialPosts, onLoadMore, hasMore, currentUser }: PostFeedProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const observer = useRef<IntersectionObserver | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  const handleToggleLike = async (postId: string, newLikeStatus: boolean) => {
    const { error } = await supabase.rpc('toggle_post_like', { p_post_id: postId })
    if (error) {
      console.error("Error toggling like:", error)
      toast.error("Failed to update like.")
      throw error
    }
  }

  const handleToggleBookmark = async (postId: string, newBookmarkStatus: boolean) => {
    const { error } = await supabase.rpc('toggle_post_bookmark', { p_post_id: postId })
    if (error) {
      console.error("Error toggling bookmark:", error)
      toast.error("Failed to update bookmark.")
      throw error
    }
  }

  const handlePostCommentAdded = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.post_id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
      )
    );
  };

  const lastPostElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || !hasMore) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setIsLoading(true)
          onLoadMore().finally(() => setIsLoading(false))
        }
      })
      if (node) observer.current.observe(node)
    },
    [isLoading, hasMore, onLoadMore]
  )

  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <div>
      {posts.map((post, index) => (
        <PostCard 
          key={post.post_id} 
          post={post} 
          currentUser={currentUser} 
          onToggleLike={handleToggleLike} 
          onToggleBookmark={handleToggleBookmark}
          onCommentAdded={handlePostCommentAdded}
          {...(index === posts.length - 1 && { ref: lastPostElementRef })}
        />
      ))}

      {isLoading && posts.length > 0 && <div className="text-center text-sm text-gray-500 py-4">Loading more posts...</div>}
      {!isLoading && !hasMore && posts.length > 0 && <div className="text-center text-sm text-gray-500 py-4">You&apos;ve reached the end.</div>}
      {!isLoading && posts.length === 0 && <div className="text-center text-sm text-gray-500 py-10">No posts to display.</div>}
    </div>
  )
} 
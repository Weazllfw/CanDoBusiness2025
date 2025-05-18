import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'
import { Analytics } from '@/lib/analytics'
import ShareButton from './ShareButton'
import CommentForm from './CommentForm'
import CommentList from './CommentList'
import type { Comment } from '@/types/comments'

interface FeedPost {
  post_id: string;
  post_content: string;
  post_created_at: string;
  post_category: string;
  post_media_urls: string[];
  post_media_types: string[];
  author_user_id: string;
  author_name: string;
  author_avatar_url: string;
  author_subscription_tier: string;
  company_id: string;
  company_name: string;
  company_avatar_url: string;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  is_liked_by_current_user: boolean;
  is_bookmarked_by_current_user: boolean;
  is_network_post: number;
}

function PostCard({ post }: { post: FeedPost }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const supabase = createClientComponentClient<Database>();
  const content = post.post_content || '';
  const isLongContent = content.length > 280;

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      // Track post view for Pro users
      if (user) {
        Analytics.trackPostView(user.id, post.post_id);
      }
    };
    fetchUser();
  }, [supabase, post.post_id]);

  const handleMediaView = (mediaIndex: number, mediaType: string) => {
    if (currentUser) {
      Analytics.trackMediaView(currentUser.id, post.post_id, mediaIndex, mediaType);
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;

    try {
      if (post.is_liked_by_current_user) {
        await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: post.post_id, user_id: currentUser.id });
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: post.post_id, user_id: currentUser.id });
        
        // Track like for Pro users
        Analytics.trackPostEngagement(currentUser.id, post.post_id, 'like');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = () => {
    if (currentUser) {
      Analytics.trackPostEngagement(currentUser.id, post.post_id, 'share');
    }
  };

  const handleNewTopLevelComment = async (comment: Comment) => {
    if (!currentUser) return;
    
    try {
      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.post_id,
          user_id: currentUser.id,
          content: comment.content,
          parent_id: null
        })
        .select()
        .single();

      if (error) throw error;

      setComments(prev => [newComment, ...prev]);
      
      // Track comment for Pro users
      Analytics.trackPostEngagement(currentUser.id, post.post_id, 'comment');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  return (
    <article className="bg-white rounded-lg shadow mb-4 p-4">
      <div className="flex items-start space-x-3 mb-4">
        <img
          src={post.author_avatar_url || '/default-avatar.png'}
          alt={post.author_name}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{post.author_name}</span>
            {post.company_name && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">{post.company_name}</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {new Date(post.post_created_at).toLocaleDateString()}
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

      {post.post_media_urls && post.post_media_urls.length > 0 && (
        <div className={`grid ${post.post_media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-4`}>
          {post.post_media_urls.map((url: string, index: number) => {
            const mediaType = post.post_media_types?.[index] || '';
            
            if (mediaType.startsWith('image/')) {
              return (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url.trim()}
                    alt={`Post media ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                    onClick={() => handleMediaView(index, mediaType)}
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
                    onPlay={() => handleMediaView(index, mediaType)}
                  />
                </div>
              );
            }
            
            return null;
          })}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 ${
              post.is_liked_by_current_user ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill={post.is_liked_by_current_user ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span>{post.like_count}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1 text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{post.comment_count}</span>
          </button>

          <ShareButton postId={post.post_id} postContent={post.post_content} onShare={handleShare} />
        </div>
      </div>

      {showComments && (
        <>
          <div className="mt-3 w-full">
            <CommentForm 
              postId={post.post_id} 
              currentUser={currentUser} 
              onCommentSubmitted={handleNewTopLevelComment}
              placeholderText="Write a comment..."
            />
          </div>
          
          <CommentList 
            postId={post.post_id} 
            currentUser={currentUser} 
            comments={comments} 
            isLoading={isLoadingComments} 
            error={commentsError} 
          />
        </>
      )}
    </article>
  );
}

export default function PostFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }

        const { data: posts, error: postsError } = await supabase
          .rpc('get_feed_posts', {
            p_user_id: user.id,
            p_limit: 20,
            p_offset: 0
          });

        if (postsError) throw postsError;
        setPosts(posts || []);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [supabase]);

  if (isLoading) {
    return <div className="text-center py-4">Loading posts...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 py-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.post_id} post={post} />
      ))}
      {posts.length === 0 && (
        <div className="text-center text-gray-600 py-4">
          No posts to display. Follow some companies to see their updates here!
        </div>
      )}
    </div>
  );
} 
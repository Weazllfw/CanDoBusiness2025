// import { supabase } from './supabase' // No longer using shared global instance
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase' // Ensure Database type is imported
import type { User } from '@supabase/supabase-js'

/**
 * Likes a post for the current user.
 * @param postId The ID of the post to like.
 * @param userId The ID of the user liking the post.
 */
export const likePost = async (postId: string, userId: string) => {
  const supabase = createClientComponentClient<Database>() // Instantiate client here
  if (!userId) {
    console.error('User ID is required to like a post');
    return { error: { message: 'User not authenticated' } };
  }
  if (!postId) {
    console.error('Post ID is required to like a post');
    return { error: { message: 'Post ID missing' } };
  }

  const { data, error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId })
    .select() // Select to confirm insertion and potentially get data back
    .single(); // Assuming one like per user per post

  if (error) {
    console.error('Error liking post:', error);
  }
  return { data, error };
};

/**
 * Unlikes a post for the current user.
 * @param postId The ID of the post to unlike.
 * @param userId The ID of the user unliking the post.
 */
export const unlikePost = async (postId: string, userId: string) => {
  const supabase = createClientComponentClient<Database>() // Instantiate client here
  if (!userId) {
    console.error('User ID is required to unlike a post');
    return { error: { message: 'User not authenticated' } };
  }
  if (!postId) {
    console.error('Post ID is required to unlike a post');
    return { error: { message: 'Post ID missing' } };
  }

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .match({ post_id: postId, user_id: userId });

  if (error) {
    console.error('Error unliking post:', error);
  }
  // For delete, Supabase doesn't return the deleted row by default in the same way insert does.
  // The absence of an error typically means success.
  return { error }; 
};

/**
 * Adds a comment to a post.
 * @param postId The ID of the post to comment on.
 * @param userId The ID of the user adding the comment.
 * @param content The text content of the comment.
 * @param parentCommentId Optional ID of the parent comment if this is a reply.
 */
export const addComment = async (
  postId: string, 
  userId: string, 
  content: string, 
  parentCommentId?: string | null
) => {
  const supabase = createClientComponentClient<Database>() // Instantiate client here
  if (!userId || !postId || !content) {
    console.error('Missing required fields for adding comment');
    return { data: null, error: { message: 'Post ID, User ID, and content are required.' } };
  }

  // 1. Insert the comment
  const { data: commentData, error: commentError } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: content,
      parent_comment_id: parentCommentId || undefined,
    })
    .select('*') // Select all fields of the comment itself
    .single();

  if (commentError) {
    console.error('Error adding comment:', commentError);
    return { data: null, error: commentError };
  }

  if (!commentData) {
    console.error('Failed to add comment, no data returned.');
    return { data: null, error: { message: 'Failed to add comment, no data returned.' } };
  }

  // 2. Fetch the user profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('id', commentData.user_id) // use commentData.user_id to fetch the profile
    .single();

  if (profileError) {
    console.error('Error fetching profile for comment:', profileError);
    // Return the comment data even if profile fetch fails, but include the error
    return { 
      data: { ...commentData, user_object: null }, 
      error: { 
        message: 'Comment added, but failed to fetch author profile.', 
        details: profileError 
      } 
    };
  }

  // 3. Combine comment data with profile data
  const fullCommentData = {
    ...commentData,
    user_object: profileData,
  };

  return { data: fullCommentData, error: null };
};

/**
 * Fetches comments for a given post, including author details.
 * @param postId The ID of the post for which to fetch comments.
 */
export const fetchComments = async (postId: string) => {
  const supabase = createClientComponentClient<Database>() // Instantiate client here
  if (!postId) {
    console.error('Post ID is required to fetch comments');
    return { data: [], error: { message: 'Post ID missing' } }; // Return empty array on error
  }

  const { data, error } = await supabase
    .rpc('get_post_comments_threaded', { p_post_id: postId });

  if (error) {
    console.error('Error fetching comments:', error);
    return { data: [], error }; // Return empty array on error, but pass error object
  }

  // Ensure data is an array. If RPC returns null for data, treat as empty.
  const commentsArray = Array.isArray(data) ? data : [];

  const formattedData = commentsArray.map(comment => ({
    ...comment, // Spread all fields from the RPC: id, created_at, content, parent_comment_id, user_id, user_name, user_avatar_url, depth, sort_path, status
    user_object: { // Create the nested user_object
      id: comment.user_id,
      name: comment.user_name,
      avatar_url: comment.user_avatar_url,
      // email is not included as per RPC definition
    }
  }));

  return { data: formattedData, error: null }; // Return formatted data and null for error if successful
};

// TODO: Add function for creating a new post (if not handled directly in CreatePost.tsx)
// TODO: Add function for fetching a single post details (if needed for a dedicated post page) 
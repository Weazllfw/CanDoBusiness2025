import type { Database } from './supabase';

// Base PostComment type from Supabase schema
export type PostComment = Database['public']['Tables']['post_comments']['Row'];

// Profile type, assuming it exists in a similar way or directly from Supabase types
// This is a simplified profile structure, adjust if your profiles table is different
export type AuthorProfile = Pick<
  Database['public']['Tables']['profiles']['Row'], 
  'id' | 'name' | 'avatar_url'
>; // Add other relevant profile fields if needed, e.g., 'title', 'company_name'

// CommentWithAuthor combines PostComment with the author's profile information
export interface CommentWithAuthor extends PostComment {
  user_object: AuthorProfile | null; // Standardized user object
  like_count?: number; // Optional, if you join likes count
  is_liked_by_user?: boolean; // Optional, if you check if current user liked it
  // children?: CommentWithAuthor[]; // For threaded comments, if you structure them this way
}

// For deeply nested comments, you might have a structure like this:
export interface ThreadedComment extends CommentWithAuthor {
  depth: number;
  children_count?: number; // If you count direct replies
  children?: ThreadedComment[]; // Recursive definition for nested children
} 
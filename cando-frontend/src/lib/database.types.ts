export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string
          content: string
          created_at: string
          user_id: string
          media_url: string | null
          media_type: string | null
        }
        Insert: {
          id?: string
          content: string
          created_at?: string
          user_id: string
          media_url?: string | null
          media_type?: string | null
        }
        Update: {
          id?: string
          content?: string
          created_at?: string
          user_id?: string
          media_url?: string | null
          media_type?: string | null
        }
      }
      post_bookmarks: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_comment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_comment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          parent_comment_id?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          avatar_url: string | null
          email: string | null
          subscription_tier: string | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          avatar_url?: string | null
          email?: string | null
          subscription_tier?: string | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          avatar_url?: string | null
          email?: string | null
          subscription_tier?: string | null
          company_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      toggle_post_bookmark: {
        Args: {
          p_post_id: string
        }
        Returns: {
          is_bookmarked: boolean
          bookmark_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 
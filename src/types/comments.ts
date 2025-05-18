export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  author_name?: string;
  author_avatar_url?: string;
  replies?: Comment[];
} 
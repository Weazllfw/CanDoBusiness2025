export interface Author {
  name: string;
  role: string;
  avatar: string;
}

export interface Post {
  id: number;
  author: Author;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

export interface Connection {
  id: number;
  name: string;
  role: string;
  industry: string;
  avatar: string;
} 
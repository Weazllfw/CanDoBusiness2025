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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          company_role: string | null
          bio: string | null
          website: string | null
          location: string | null
          messaging_preference: 'all' | 'connections' | 'none'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          company_role?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          messaging_preference?: 'all' | 'connections' | 'none'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          company_role?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          messaging_preference?: 'all' | 'connections' | 'none'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 
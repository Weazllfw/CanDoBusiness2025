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
      companies: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          website: string | null
          location: string | null
          industry: string | null
          owner_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          website?: string | null
          location?: string | null
          industry?: string | null
          owner_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          website?: string | null
          location?: string | null
          industry?: string | null
          owner_id?: string
        }
      }
      posts: {
        Row: {
          id: string
          created_at: string
          content: string
          company_id: string
          type: 'general' | 'rfq'
          title: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          content: string
          company_id: string
          type?: 'general' | 'rfq'
          title?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          content?: string
          company_id?: string
          type?: 'general' | 'rfq'
          title?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          content: string
          sender_id: string
          receiver_id: string
          read: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          content: string
          sender_id: string
          receiver_id: string
          read?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          content?: string
          sender_id?: string
          receiver_id?: string
          read?: boolean
        }
      }
      rfqs: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string
          budget: number | null
          currency: string
          deadline: string | null
          company_id: string
          status: 'open' | 'in_progress' | 'closed'
          category: string | null
          required_certifications: string[] | null
          attachments: string[] | null
          preferred_delivery_date: string | null
          visibility: 'public' | 'private' | 'invited'
          tags: string[] | null
          requirements: any | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description: string
          budget?: number | null
          currency?: string
          deadline?: string | null
          company_id: string
          status?: 'open' | 'in_progress' | 'closed'
          category?: string | null
          required_certifications?: string[] | null
          attachments?: string[] | null
          preferred_delivery_date?: string | null
          visibility?: 'public' | 'private' | 'invited'
          tags?: string[] | null
          requirements?: any | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string
          budget?: number | null
          currency?: string
          deadline?: string | null
          company_id?: string
          status?: 'open' | 'in_progress' | 'closed'
          category?: string | null
          required_certifications?: string[] | null
          attachments?: string[] | null
          preferred_delivery_date?: string | null
          visibility?: 'public' | 'private' | 'invited'
          tags?: string[] | null
          requirements?: any | null
        }
      }
      rfq_templates: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          name: string
          description: string | null
          category: string | null
          required_certifications: string[] | null
          requirements: any | null
          is_public: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          company_id: string
          name: string
          description?: string | null
          category?: string | null
          required_certifications?: string[] | null
          requirements?: any | null
          is_public?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          company_id?: string
          name?: string
          description?: string | null
          category?: string | null
          required_certifications?: string[] | null
          requirements?: any | null
          is_public?: boolean
        }
      }
      rfq_invitations: {
        Row: {
          rfq_id: string
          company_id: string
          created_at: string
          status: 'pending' | 'accepted' | 'declined'
          response_at: string | null
        }
        Insert: {
          rfq_id: string
          company_id: string
          created_at?: string
          status?: 'pending' | 'accepted' | 'declined'
          response_at?: string | null
        }
        Update: {
          rfq_id?: string
          company_id?: string
          created_at?: string
          status?: 'pending' | 'accepted' | 'declined'
          response_at?: string | null
        }
      }
      quotes: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          rfq_id: string
          company_id: string
          amount: number
          currency: string
          delivery_time: string | null
          validity_period: string | null
          status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn'
          notes: string | null
          attachments: string[] | null
          terms_and_conditions: string | null
          technical_specifications: any | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          rfq_id: string
          company_id: string
          amount: number
          currency?: string
          delivery_time?: string | null
          validity_period?: string | null
          status?: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn'
          notes?: string | null
          attachments?: string[] | null
          terms_and_conditions?: string | null
          technical_specifications?: any | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          rfq_id?: string
          company_id?: string
          amount?: number
          currency?: string
          delivery_time?: string | null
          validity_period?: string | null
          status?: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn'
          notes?: string | null
          attachments?: string[] | null
          terms_and_conditions?: string | null
          technical_specifications?: any | null
        }
      }
      quote_revisions: {
        Row: {
          id: string
          quote_id: string
          created_at: string
          amount: number
          currency: string
          delivery_time: string | null
          notes: string | null
          revision_number: number
          changes_description: string | null
        }
        Insert: {
          id?: string
          quote_id: string
          created_at?: string
          amount: number
          currency: string
          delivery_time?: string | null
          notes?: string | null
          revision_number: number
          changes_description?: string | null
        }
        Update: {
          id?: string
          quote_id?: string
          created_at?: string
          amount?: number
          currency?: string
          delivery_time?: string | null
          notes?: string | null
          revision_number?: number
          changes_description?: string | null
        }
      }
    }
  }
} 
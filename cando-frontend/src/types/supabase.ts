export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_actions_log: {
        Row: {
          action_type: Database["public"]["Enums"]["admin_action_type_enum"]
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          reason_notes: string | null
          target_content_id: string | null
          target_content_type:
            | Database["public"]["Enums"]["admin_action_target_type_enum"]
            | null
          target_profile_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["admin_action_type_enum"]
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          reason_notes?: string | null
          target_content_id?: string | null
          target_content_type?:
            | Database["public"]["Enums"]["admin_action_target_type_enum"]
            | null
          target_profile_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["admin_action_type_enum"]
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          reason_notes?: string | null
          target_content_id?: string | null
          target_content_type?:
            | Database["public"]["Enums"]["admin_action_target_type_enum"]
            | null
          target_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_log_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_flags: {
        Row: {
          admin_notes: string | null
          comment_id: string
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["flag_status_enum"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          comment_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["flag_status_enum"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["flag_status_enum"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_flags_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          banner_url: string | null
          business_number: string | null
          business_type: string | null
          certifications: string[] | null
          city: string | null
          contact_person_email: string | null
          contact_person_name: string | null
          contact_person_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          employee_count: string | null
          id: string
          industry: string | null
          location: string | null
          major_metropolitan_area: string | null
          name: string
          other_metropolitan_area_specify: string | null
          owner_id: string
          postal_code: string | null
          province: string | null
          public_presence_links: string[] | null
          revenue_range: string | null
          self_attestation_completed: boolean
          services: string[] | null
          social_media_links: Json | null
          street_address: string | null
          tags: string[] | null
          tier2_document_filename: string | null
          tier2_document_storage_path: string | null
          tier2_document_type: string | null
          tier2_document_uploaded_at: string | null
          tier2_submission_date: string | null
          updated_at: string | null
          verification_status: string
          website: string | null
          year_founded: number | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          business_number?: string | null
          business_type?: string | null
          certifications?: string[] | null
          city?: string | null
          contact_person_email?: string | null
          contact_person_name?: string | null
          contact_person_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          major_metropolitan_area?: string | null
          name: string
          other_metropolitan_area_specify?: string | null
          owner_id: string
          postal_code?: string | null
          province?: string | null
          public_presence_links?: string[] | null
          revenue_range?: string | null
          self_attestation_completed?: boolean
          services?: string[] | null
          social_media_links?: Json | null
          street_address?: string | null
          tags?: string[] | null
          tier2_document_filename?: string | null
          tier2_document_storage_path?: string | null
          tier2_document_type?: string | null
          tier2_document_uploaded_at?: string | null
          tier2_submission_date?: string | null
          updated_at?: string | null
          verification_status?: string
          website?: string | null
          year_founded?: number | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          business_number?: string | null
          business_type?: string | null
          certifications?: string[] | null
          city?: string | null
          contact_person_email?: string | null
          contact_person_name?: string | null
          contact_person_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          major_metropolitan_area?: string | null
          name?: string
          other_metropolitan_area_specify?: string | null
          owner_id?: string
          postal_code?: string | null
          province?: string | null
          public_presence_links?: string[] | null
          revenue_range?: string | null
          self_attestation_completed?: boolean
          services?: string[] | null
          social_media_links?: Json | null
          street_address?: string | null
          tags?: string[] | null
          tier2_document_filename?: string | null
          tier2_document_storage_path?: string | null
          tier2_document_type?: string | null
          tier2_document_uploaded_at?: string | null
          tier2_submission_date?: string | null
          updated_at?: string | null
          verification_status?: string
          website?: string | null
          year_founded?: number | null
        }
        Relationships: []
      }
      company_to_company_connections: {
        Row: {
          connection_type: string
          created_at: string
          id: string
          source_company_id: string
          target_company_id: string
          updated_at: string
        }
        Insert: {
          connection_type: string
          created_at?: string
          id?: string
          source_company_id: string
          target_company_id: string
          updated_at?: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          id?: string
          source_company_id?: string
          target_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_to_company_connections_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_to_company_connections_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_to_company_connections_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_to_company_connections_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      post_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["content_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["content_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["content_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_flags: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          post_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["flag_status_enum"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["flag_status_enum"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["flag_status_enum"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_flags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_subscription_tier: string | null
          category: Database["public"]["Enums"]["post_category"]
          company_id: string | null
          content: string
          created_at: string
          id: string
          media_types: string[] | null
          media_urls: string[] | null
          rfq_id: string | null
          status: Database["public"]["Enums"]["content_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          author_subscription_tier?: string | null
          category?: Database["public"]["Enums"]["post_category"]
          company_id?: string | null
          content: string
          created_at?: string
          id?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["content_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          author_subscription_tier?: string | null
          category?: Database["public"]["Enums"]["post_category"]
          company_id?: string | null
          content?: string
          created_at?: string
          id?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["content_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_expires_at: string | null
          created_at: string | null
          email: string | null
          id: string
          last_warning_at: string | null
          name: string | null
          status: Database["public"]["Enums"]["profile_status_enum"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_expires_at?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          last_warning_at?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["profile_status_enum"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_expires_at?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_warning_at?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["profile_status_enum"]
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_revisions: {
        Row: {
          amount: number
          changes_description: string | null
          created_at: string | null
          currency: string
          delivery_time: string | null
          id: string
          notes: string | null
          quote_id: string
          revision_number: number
        }
        Insert: {
          amount: number
          changes_description?: string | null
          created_at?: string | null
          currency: string
          delivery_time?: string | null
          id?: string
          notes?: string | null
          quote_id: string
          revision_number: number
        }
        Update: {
          amount?: number
          changes_description?: string | null
          created_at?: string | null
          currency?: string
          delivery_time?: string | null
          id?: string
          notes?: string | null
          quote_id?: string
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number
          attachments: string[] | null
          company_id: string
          created_at: string | null
          currency: string
          delivery_time: string | null
          id: string
          notes: string | null
          rfq_id: string
          status: string
          technical_specifications: Json | null
          terms_and_conditions: string | null
          updated_at: string | null
          validity_period: unknown | null
        }
        Insert: {
          amount: number
          attachments?: string[] | null
          company_id: string
          created_at?: string | null
          currency?: string
          delivery_time?: string | null
          id?: string
          notes?: string | null
          rfq_id: string
          status?: string
          technical_specifications?: Json | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          validity_period?: unknown | null
        }
        Update: {
          amount?: number
          attachments?: string[] | null
          company_id?: string
          created_at?: string | null
          currency?: string
          delivery_time?: string | null
          id?: string
          notes?: string | null
          rfq_id?: string
          status?: string
          technical_specifications?: Json | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          validity_period?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_invitations: {
        Row: {
          company_id: string
          created_at: string | null
          response_at: string | null
          rfq_id: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          response_at?: string | null
          rfq_id: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          response_at?: string | null
          rfq_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_invitations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_templates: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          required_certifications: string[] | null
          requirements: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          required_certifications?: string[] | null
          requirements?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          required_certifications?: string[] | null
          requirements?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          attachments: string[] | null
          budget: number | null
          category: string | null
          company_id: string
          created_at: string | null
          currency: string | null
          deadline: string | null
          description: string
          id: string
          preferred_delivery_date: string | null
          required_certifications: string[] | null
          requirements: Json | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          attachments?: string[] | null
          budget?: number | null
          category?: string | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description: string
          id?: string
          preferred_delivery_date?: string | null
          required_certifications?: string[] | null
          requirements?: Json | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          attachments?: string[] | null
          budget?: number | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: string
          id?: string
          preferred_delivery_date?: string | null
          required_certifications?: string[] | null
          requirements?: Json | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_follows: {
        Row: {
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_follows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_follows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_to: string | null
          message: string
          notification_type: Database["public"]["Enums"]["notification_type_enum"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_to?: string | null
          message: string
          notification_type?: Database["public"]["Enums"]["notification_type_enum"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_to?: string | null
          message?: string
          notification_type?: Database["public"]["Enums"]["notification_type_enum"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_view: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          business_type: string | null
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          employee_count: string | null
          id: string | null
          industry: string | null
          is_verified: boolean | null
          metro_area: string | null
          name: string | null
          other_metro_specify: string | null
          owner_id: string | null
          postal_code: string | null
          province: string | null
          revenue_range: string | null
          services: string[] | null
          social_media_links: Json | null
          street_address: string | null
          tags: string[] | null
          tier1_business_number: string | null
          tier1_public_presence_links: string[] | null
          tier1_self_attestation_completed: boolean | null
          tier2_document_filename: string | null
          tier2_document_storage_path: string | null
          tier2_document_type: string | null
          tier2_document_uploaded_at: string | null
          tier2_submission_date: string | null
          updated_at: string | null
          verification_status: string | null
          verification_tier: string | null
          website: string | null
          year_founded: number | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          business_type?: string | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string | null
          industry?: string | null
          is_verified?: never
          metro_area?: string | null
          name?: string | null
          other_metro_specify?: string | null
          owner_id?: string | null
          postal_code?: string | null
          province?: string | null
          revenue_range?: string | null
          services?: string[] | null
          social_media_links?: Json | null
          street_address?: string | null
          tags?: string[] | null
          tier1_business_number?: string | null
          tier1_public_presence_links?: string[] | null
          tier1_self_attestation_completed?: boolean | null
          tier2_document_filename?: string | null
          tier2_document_storage_path?: string | null
          tier2_document_type?: string | null
          tier2_document_uploaded_at?: string | null
          tier2_submission_date?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verification_tier?: never
          website?: string | null
          year_founded?: number | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          business_type?: string | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string | null
          industry?: string | null
          is_verified?: never
          metro_area?: string | null
          name?: string | null
          other_metro_specify?: string | null
          owner_id?: string | null
          postal_code?: string | null
          province?: string | null
          revenue_range?: string | null
          services?: string[] | null
          social_media_links?: Json | null
          street_address?: string | null
          tags?: string[] | null
          tier1_business_number?: string | null
          tier1_public_presence_links?: string[] | null
          tier1_self_attestation_completed?: boolean | null
          tier2_document_filename?: string | null
          tier2_document_storage_path?: string | null
          tier2_document_type?: string | null
          tier2_document_uploaded_at?: string | null
          tier2_submission_date?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verification_tier?: never
          website?: string | null
          year_founded?: number | null
        }
        Relationships: []
      }
      message_view: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          read: boolean | null
          receiver_avatar: string | null
          receiver_id: string | null
          receiver_name: string | null
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ban_user: {
        Args: {
          p_target_profile_id: string
          p_reason: string
          p_duration_days?: number
          p_related_content_id?: string
          p_related_content_type?: Database["public"]["Enums"]["admin_action_target_type_enum"]
          p_related_flag_id?: string
          p_flag_table?: string
        }
        Returns: {
          avatar_url: string | null
          ban_expires_at: string | null
          created_at: string | null
          email: string | null
          id: string
          last_warning_at: string | null
          name: string | null
          status: Database["public"]["Enums"]["profile_status_enum"]
          updated_at: string | null
        }[]
      }
      admin_get_all_companies_with_owner_info: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["CompositeTypes"]["admin_company_details"][]
      }
      admin_get_comment_flags: {
        Args: {
          p_status?: Database["public"]["Enums"]["flag_status_enum"]
          p_page_number?: number
          p_page_size?: number
        }
        Returns: {
          flag_id: string
          comment_id: string
          comment_content: string
          comment_author_id: string
          comment_author_username: string
          flagger_user_id: string
          flagger_username: string
          reason: string
          status: Database["public"]["Enums"]["flag_status_enum"]
          created_at: string
          updated_at: string
          admin_notes: string
          total_count: number
        }[]
      }
      admin_get_flag_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: Database["public"]["Enums"]["flag_status_enum"]
          post_flag_count: number
          comment_flag_count: number
        }[]
      }
      admin_get_post_flags: {
        Args: {
          p_status?: Database["public"]["Enums"]["flag_status_enum"]
          p_page_number?: number
          p_page_size?: number
        }
        Returns: {
          flag_id: string
          post_id: string
          post_content: string
          post_media_url: string
          post_media_type: string
          post_author_id: string
          post_author_username: string
          flagger_user_id: string
          flagger_username: string
          reason: string
          status: Database["public"]["Enums"]["flag_status_enum"]
          created_at: string
          updated_at: string
          admin_notes: string
          total_count: number
        }[]
      }
      admin_remove_comment: {
        Args: {
          p_comment_id: string
          p_reason: string
          p_related_flag_id?: string
          p_flag_table?: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["content_status_enum"]
          updated_at: string
          user_id: string
        }[]
      }
      admin_remove_post: {
        Args: {
          p_post_id: string
          p_reason: string
          p_related_flag_id?: string
          p_flag_table?: string
        }
        Returns: {
          author_subscription_tier: string | null
          category: Database["public"]["Enums"]["post_category"]
          company_id: string | null
          content: string
          created_at: string
          id: string
          media_types: string[] | null
          media_urls: string[] | null
          rfq_id: string | null
          status: Database["public"]["Enums"]["content_status_enum"]
          updated_at: string
          user_id: string
        }[]
      }
      admin_update_comment_flag_status: {
        Args: {
          p_flag_id: string
          p_new_status: Database["public"]["Enums"]["flag_status_enum"]
          p_admin_notes?: string
        }
        Returns: {
          admin_notes: string | null
          comment_id: string
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["flag_status_enum"]
          updated_at: string | null
          user_id: string
        }[]
      }
      admin_update_company_verification: {
        Args: {
          p_company_id: string
          p_new_status: string
          p_new_admin_notes: string
        }
        Returns: {
          admin_notes: string | null
          avatar_url: string | null
          banner_url: string | null
          business_number: string | null
          business_type: string | null
          certifications: string[] | null
          city: string | null
          contact_person_email: string | null
          contact_person_name: string | null
          contact_person_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          employee_count: string | null
          id: string
          industry: string | null
          location: string | null
          major_metropolitan_area: string | null
          name: string
          other_metropolitan_area_specify: string | null
          owner_id: string
          postal_code: string | null
          province: string | null
          public_presence_links: string[] | null
          revenue_range: string | null
          self_attestation_completed: boolean
          services: string[] | null
          social_media_links: Json | null
          street_address: string | null
          tags: string[] | null
          tier2_document_filename: string | null
          tier2_document_storage_path: string | null
          tier2_document_type: string | null
          tier2_document_uploaded_at: string | null
          tier2_submission_date: string | null
          updated_at: string | null
          verification_status: string
          website: string | null
          year_founded: number | null
        }
      }
      admin_update_post_flag_status: {
        Args: {
          p_flag_id: string
          p_new_status: Database["public"]["Enums"]["flag_status_enum"]
          p_admin_notes?: string
        }
        Returns: {
          admin_notes: string | null
          created_at: string
          id: string
          post_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["flag_status_enum"]
          updated_at: string | null
          user_id: string
        }[]
      }
      admin_warn_user: {
        Args: {
          p_target_profile_id: string
          p_reason: string
          p_related_content_id?: string
          p_related_content_type?: Database["public"]["Enums"]["admin_action_target_type_enum"]
          p_related_flag_id?: string
          p_flag_table?: string
        }
        Returns: {
          avatar_url: string | null
          ban_expires_at: string | null
          created_at: string | null
          email: string | null
          id: string
          last_warning_at: string | null
          name: string | null
          status: Database["public"]["Enums"]["profile_status_enum"]
          updated_at: string | null
        }[]
      }
      get_company_verification_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
          count: number
        }[]
      }
      get_conversations: {
        Args: { p_current_user_id: string }
        Returns: {
          other_user_id: string
          other_user_name: string
          other_user_avatar: string
          last_message_id: string
          last_message_content: string
          last_message_at: string
          last_message_sender_id: string
          unread_count: number
        }[]
      }
      get_cymk_suggestions: {
        Args: { p_requesting_user_id: string; p_limit?: number }
        Returns: {
          suggested_company_id: string
          company_name: string
          company_avatar_url: string
          company_industry: string
          score: number
          reason: string
        }[]
      }
      get_feed_posts: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
          p_category?: Database["public"]["Enums"]["post_category"]
        }
        Returns: {
          post_id: string
          post_content: string
          post_created_at: string
          post_category: Database["public"]["Enums"]["post_category"]
          post_media_urls: string[]
          post_media_types: string[]
          author_user_id: string
          author_name: string
          author_avatar_url: string
          author_subscription_tier: string
          company_id: string
          company_name: string
          company_avatar_url: string
          like_count: number
          comment_count: number
          bookmark_count: number
          is_liked_by_current_user: boolean
          is_bookmarked_by_current_user: boolean
          is_network_post: number
        }[]
      }
      get_post_comments_threaded: {
        Args: { p_post_id: string }
        Returns: {
          id: string
          created_at: string
          content: string
          parent_comment_id: string
          user_id: string
          user_name: string
          user_avatar_url: string
          user_email: string
          depth: number
          sort_path: string[]
        }[]
      }
      get_pymk_suggestions: {
        Args: { p_requesting_user_id: string; p_limit?: number }
        Returns: {
          suggested_user_id: string
          user_name: string
          user_avatar_url: string
          score: number
          reason: string
        }[]
      }
      get_rfq_statistics: {
        Args: { p_rfq_id: string }
        Returns: {
          total_quotes: number
          avg_quote_amount: number
          min_quote_amount: number
          max_quote_amount: number
          avg_delivery_time: unknown
        }[]
      }
      get_user_analytics: {
        Args: { p_user_id: string; p_start_date?: string; p_end_date?: string }
        Returns: {
          event_type: string
          event_count: number
          first_occurrence: string
          last_occurrence: string
        }[]
      }
      get_user_companies: {
        Args: { user_id_param: string }
        Returns: {
          avatar_url: string | null
          banner_url: string | null
          business_type: string | null
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          employee_count: string | null
          id: string | null
          industry: string | null
          is_verified: boolean | null
          metro_area: string | null
          name: string | null
          other_metro_specify: string | null
          owner_id: string | null
          postal_code: string | null
          province: string | null
          revenue_range: string | null
          services: string[] | null
          social_media_links: Json | null
          street_address: string | null
          tags: string[] | null
          tier1_business_number: string | null
          tier1_public_presence_links: string[] | null
          tier1_self_attestation_completed: boolean | null
          tier2_document_filename: string | null
          tier2_document_storage_path: string | null
          tier2_document_type: string | null
          tier2_document_uploaded_at: string | null
          tier2_submission_date: string | null
          updated_at: string | null
          verification_status: string | null
          verification_tier: string | null
          website: string | null
          year_founded: number | null
        }[]
      }
      get_user_notifications: {
        Args: { p_limit?: number; p_page_number?: number }
        Returns: {
          id: string
          user_id: string
          title: string
          message: string
          link_to: string
          is_read: boolean
          notification_type: Database["public"]["Enums"]["notification_type_enum"]
          created_at: string
          unread_count: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      internal_upsert_profile_for_user: {
        Args: {
          p_user_id: string
          p_email: string
          p_name: string
          p_avatar_url?: string
        }
        Returns: undefined
      }
      mark_all_notifications_as_read: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          link_to: string | null
          message: string
          notification_type: Database["public"]["Enums"]["notification_type_enum"]
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      request_company_tier1_verification: {
        Args: {
          p_company_id: string
          p_business_number: string
          p_public_presence_links: string[]
          p_self_attestation_completed: boolean
        }
        Returns: undefined
      }
      request_company_tier2_verification: {
        Args: {
          p_company_id: string
          p_tier2_document_type: string
          p_tier2_document_filename: string
          p_tier2_document_storage_path: string
        }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      toggle_post_bookmark: {
        Args: { p_post_id: string }
        Returns: {
          is_bookmarked: boolean
          bookmark_count: number
        }[]
      }
    }
    Enums: {
      admin_action_target_type_enum: "post" | "comment" | "profile" | "flag"
      admin_action_type_enum:
        | "content_removed_post"
        | "content_removed_comment"
        | "user_warned"
        | "user_banned_temporarily"
        | "user_banned_permanently"
        | "flag_status_changed"
        | "user_unbanned"
        | "user_warning_cleared"
      content_status_enum: "visible" | "removed_by_admin"
      flag_status_enum:
        | "pending_review"
        | "resolved_no_action"
        | "resolved_content_removed"
        | "resolved_user_warned"
        | "resolved_user_banned"
      notification_type_enum:
        | "system_alert"
        | "content_moderation"
        | "new_message_summary"
        | "connection_request"
        | "rfq_update"
        | "default"
      post_category:
        | "general"
        | "business_update"
        | "industry_news"
        | "job_opportunity"
        | "event"
        | "question"
        | "partnership"
        | "product_launch"
      profile_status_enum:
        | "active"
        | "warned"
        | "banned_temporarily"
        | "banned_permanently"
    }
    CompositeTypes: {
      admin_company_details: {
        company_id: string | null
        company_name: string | null
        company_created_at: string | null
        company_website: string | null
        company_industry: string | null
        owner_id: string | null
        owner_email: string | null
        profile_name: string | null
        verification_status: string | null
        admin_notes: string | null
        self_attestation_completed: boolean | null
        business_number: string | null
        public_presence_links: string[] | null
        street_address: string | null
        city: string | null
        province: string | null
        postal_code: string | null
        major_metropolitan_area: string | null
        other_metropolitan_area_specify: string | null
        contact_person_name: string | null
        contact_person_email: string | null
        contact_person_phone: string | null
        services: string[] | null
        tier2_document_type: string | null
        tier2_document_filename: string | null
        tier2_document_storage_path: string | null
        tier2_document_uploaded_at: string | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_action_target_type_enum: ["post", "comment", "profile", "flag"],
      admin_action_type_enum: [
        "content_removed_post",
        "content_removed_comment",
        "user_warned",
        "user_banned_temporarily",
        "user_banned_permanently",
        "flag_status_changed",
        "user_unbanned",
        "user_warning_cleared",
      ],
      content_status_enum: ["visible", "removed_by_admin"],
      flag_status_enum: [
        "pending_review",
        "resolved_no_action",
        "resolved_content_removed",
        "resolved_user_warned",
        "resolved_user_banned",
      ],
      notification_type_enum: [
        "system_alert",
        "content_moderation",
        "new_message_summary",
        "connection_request",
        "rfq_update",
        "default",
      ],
      post_category: [
        "general",
        "business_update",
        "industry_news",
        "job_opportunity",
        "event",
        "question",
        "partnership",
        "product_launch",
      ],
      profile_status_enum: [
        "active",
        "warned",
        "banned_temporarily",
        "banned_permanently",
      ],
    },
  },
} as const


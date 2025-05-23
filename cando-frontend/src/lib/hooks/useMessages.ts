import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Matches the public.message_view structure
export interface MessageView {
  id: string
  created_at: string
  content: string
  sender_id: string
  sender_name: string | null
  sender_avatar_url: string | null
  acting_as_company_id: string | null
  acting_as_company_name: string | null
  acting_as_company_logo_url: string | null
  is_sent_by_current_user: boolean
}

// Matches the return type of public.get_conversations function
export interface Conversation {
  partner_id: string
  partner_type: 'user' | 'company'
  partner_name: string | null
  partner_avatar_url: string | null
  last_message_id: string
  last_message_content: string
  last_message_at: string
  last_message_sender_id: string
  last_message_acting_as_company_id: string | null
  unread_count: number
}

// Define a more specific type for the new message payload from the subscription
// This matches the columns of the `messages` table for an INSERT event.
interface MessagesTableRow {
  id: string
  created_at: string
  content: string
  sender_id: string
  receiver_id: string
  read: boolean
  acting_as_company_id?: string | null
  target_is_company?: boolean
}

export function useMessages(currentUserId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentMessages, setCurrentMessages] = useState<MessageView[]>([])
  const [currentOpenPartner, setCurrentOpenPartner] = useState<{ id: string; type: 'user' | 'company' } | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const supabase = createClientComponentClient<Database>() as SupabaseClient<Database>

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([])
      setIsLoadingConversations(false)
      return
    }
    setIsLoadingConversations(true)
    try {
      const { data, error } = await supabase
        .rpc('get_conversations')
      
      if (error) {
        console.error('Error loading conversations:', error.message)
        setConversations([])
      } else {
        setConversations((data as Conversation[]) || [])
      }
    } catch (catchError) {
      console.error('Unexpected error in fetchConversations:', catchError)
      setConversations([])
    } finally {
      setIsLoadingConversations(false)
    }
  }, [currentUserId, supabase])

  const loadConversationMessages = useCallback(async (partnerId: string, partnerType: 'user' | 'company') => {
    if (!currentUserId || !partnerId || !partnerType) {
      setCurrentMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    setCurrentOpenPartner({ id: partnerId, type: partnerType });
    let formattedMessages: MessageView[] = [];
    try {
      const { data, error } = await supabase
        .rpc('get_messages_for_conversation', {
          p_partner_id: partnerId,
          p_partner_type: partnerType,
          p_page_number: 1,
          p_page_size: 20
        });

      if (error) {
        console.error('Error loading messages:', error.message);
        setCurrentMessages([]);
      } else {
        const rawMessages = (data as any[]) || [];
        formattedMessages = rawMessages.map(msg => ({
          ...msg,
          is_sent_by_current_user: msg.is_sent_by_current_user_context
        }));
        setCurrentMessages(formattedMessages);
      }

      if (formattedMessages && formattedMessages.length > 0) {
        await fetchConversations();
      }
    } catch (catchError) {
      console.error('Unexpected error in loadConversationMessages:', catchError);
      setCurrentMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUserId, supabase, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!currentUserId) return

    const channel: RealtimeChannel = supabase.channel('public:messages')

    const handleNewMessage = async (payload: RealtimePostgresChangesPayload<MessagesTableRow>) => {
      if (payload.eventType !== 'INSERT') return
      const newMessageRow = payload.new

      await fetchConversations()

      if (currentOpenPartner) {
        let messageIsForCurrentOpenPartner = false;

        if (currentOpenPartner.type === 'user') {
          if ((newMessageRow.sender_id === currentUserId && newMessageRow.receiver_id === currentOpenPartner.id && !newMessageRow.target_is_company && !newMessageRow.acting_as_company_id) ||
              (newMessageRow.sender_id === currentOpenPartner.id && newMessageRow.receiver_id === currentUserId && !newMessageRow.target_is_company && !newMessageRow.acting_as_company_id)) {
            messageIsForCurrentOpenPartner = true;
          }
        } else {
          if ((newMessageRow.sender_id === currentUserId && newMessageRow.target_is_company && newMessageRow.receiver_id === currentOpenPartner.id) ||
              (newMessageRow.receiver_id === currentUserId && !newMessageRow.target_is_company && newMessageRow.acting_as_company_id === currentOpenPartner.id) ||
              (newMessageRow.acting_as_company_id && newMessageRow.target_is_company && 
                ( (await isUserAdminOfCompany(supabase, newMessageRow.acting_as_company_id, currentUserId) && newMessageRow.receiver_id === currentOpenPartner.id) ||
                  (newMessageRow.acting_as_company_id === currentOpenPartner.id && await isUserAdminOfCompany(supabase, newMessageRow.receiver_id, currentUserId))
                )
              )
             ){
             messageIsForCurrentOpenPartner = true;
          }
        }

        if (messageIsForCurrentOpenPartner) {
          loadConversationMessages(currentOpenPartner.id, currentOpenPartner.type)
        }
      }
    }

    channel
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
        },
        handleNewMessage
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`Subscription error on 'public:messages':`, err.message)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase, fetchConversations, currentMessages, currentOpenPartner, loadConversationMessages])

  const sendMessage = async (receiverId: string, content: string, actingAsCompanyId?: string | null, targetIsCompany?: boolean) => {
    if (!currentUserId || !receiverId || !content.trim()) {
      console.error('Missing currentUserId, receiverId, or content for sendMessage')
      throw new Error('Missing required fields for sending message')
    }
    try {
      const { data, error } = await supabase
        .rpc('send_message', {
          p_receiver_id: receiverId,
          p_content: content.trim(),
          p_acting_as_company_id: actingAsCompanyId ?? undefined,
          p_target_is_company: targetIsCompany ?? false
        })

      if (error) {
        console.error('Error sending message:', error.message)
        throw error
      }
      
      return data as MessagesTableRow | null
    } catch (catchError) {
      console.error('Unexpected error in sendMessage:', catchError)
      throw catchError
    }
  }

  return {
    conversations,
    currentMessages,
    isLoadingConversations,
    isLoadingMessages,
    loadConversationMessages,
    sendMessage,
    fetchConversations, 
  }
}

async function isUserAdminOfCompany(supabase: SupabaseClient<Database>, companyId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from('company_users')
    .select('count')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .in('role', ['ADMIN', 'OWNER'])
    .single();
  if (error) {
    console.error('Error checking company admin status:', error);
    return false;
  }
  return (data?.count ?? 0) > 0;
} 
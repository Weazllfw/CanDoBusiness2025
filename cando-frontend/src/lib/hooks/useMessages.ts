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
  receiver_id: string
  read: boolean
  sender_name: string | null
  sender_avatar: string | null
  receiver_name: string | null
  receiver_avatar: string | null
}

// Matches the return type of public.get_conversations function
export interface Conversation {
  other_user_id: string
  other_user_name: string | null
  other_user_avatar: string | null
  last_message_id: string
  last_message_content: string
  last_message_at: string
  last_message_sender_id: string
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
}

export function useMessages(currentUserId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentMessages, setCurrentMessages] = useState<MessageView[]>([])
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
        .rpc('get_conversations', { p_current_user_id: currentUserId })
      
      if (error) {
        console.error('Error loading conversations:', error.message)
        setConversations([])
      } else {
        setConversations(data || [])
      }
    } catch (catchError) {
      console.error('Unexpected error in fetchConversations:', catchError)
      setConversations([])
    } finally {
      setIsLoadingConversations(false)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!currentUserId) return

    const channel: RealtimeChannel = supabase.channel('public:messages')

    const handleNewMessage = async (payload: RealtimePostgresChangesPayload<MessagesTableRow>) => {
      if (payload.eventType !== 'INSERT') return
      const newMessageRow = payload.new

      await fetchConversations()

      const isRelevantToCurrentView = 
        currentMessages.length > 0 && 
        (newMessageRow.sender_id === currentUserId || newMessageRow.receiver_id === currentUserId)

      if (isRelevantToCurrentView) {
        const firstMessageInView = currentMessages[0]
        const currentConversationOtherUserId =
          firstMessageInView.sender_id === currentUserId 
            ? firstMessageInView.receiver_id 
            : firstMessageInView.sender_id

        if (newMessageRow.sender_id === currentConversationOtherUserId || 
            newMessageRow.receiver_id === currentConversationOtherUserId) {
          
          const { data: newlyFetchedMessage, error: fetchError } = await supabase
            .from('message_view')
            .select('*')
            .eq('id', newMessageRow.id)
            .single()
          
          if (fetchError) {
            console.error('Error fetching new message details from view:', fetchError.message)
            return
          }

          if (newlyFetchedMessage) {
            setCurrentMessages(prevMessages => 
              [newlyFetchedMessage as MessageView, ...prevMessages]
              .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .filter((msg, index, self) => index === self.findIndex(t => t.id === msg.id)) 
            )
          }
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
  }, [currentUserId, supabase, fetchConversations, currentMessages])

  const loadConversationMessages = useCallback(async (otherUserId: string) => {
    if (!currentUserId || !otherUserId) {
      setCurrentMessages([])
      return
    }
    setIsLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('message_view')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading messages:', error.message)
        setCurrentMessages([])
      } else {
        setCurrentMessages((data as MessageView[]) || [])
      }

      if (data && data.length > 0) {
        const unreadMessageIds = data
          .filter(msg => msg.receiver_id === currentUserId && !msg.read)
          .map(msg => msg.id)
        
        if (unreadMessageIds.length > 0) {
          const { error: updateError } = await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadMessageIds)
            .eq('receiver_id', currentUserId)
          
          if (updateError) {
            console.error('Error marking messages as read:', updateError.message)
          }
          await fetchConversations()
        }
      }
    } catch (catchError) {
      console.error('Unexpected error in loadConversationMessages:', catchError)
      setCurrentMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }, [currentUserId, supabase, fetchConversations])

  const sendMessage = async (receiverId: string, content: string) => {
    if (!currentUserId || !receiverId || !content.trim()) {
      console.error('Missing currentUserId, receiverId, or content for sendMessage')
      throw new Error('Missing required fields for sending message')
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: content.trim(),
        })
        .select('id, created_at, content, sender_id, receiver_id, read') 
        .single()

      if (error) {
        console.error('Error sending message:', error.message)
        throw error
      }
      
      await fetchConversations()

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
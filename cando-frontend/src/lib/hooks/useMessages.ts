import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface Message {
  id: number
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  sender: {
    name: string
    avatar_url: string
    is_company: boolean
  }
}

interface Conversation {
  id: string
  name: string
  lastMessage: string
  avatar: string
  isCompany: boolean
  unreadCount: number
}

export function useMessages(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentMessages, setCurrentMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    // Load conversations
    async function loadConversations() {
      try {
        const { data, error } = await supabase
          .rpc('get_user_conversations', { user_id: userId })
        
        if (error) throw error
        
        setConversations(data.map(conv => ({
          id: conv.id,
          name: conv.name,
          lastMessage: conv.last_message,
          avatar: conv.avatar_url,
          isCompany: conv.is_company,
          unreadCount: conv.unread_count
        })))
      } catch (error) {
        console.error('Error loading conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`
      }, payload => {
        // Update conversations list
        loadConversations()
        
        // Update current conversation if needed
        const newMessage = payload.new as Message
        setCurrentMessages(prev => 
          prev.some(msg => msg.sender_id === newMessage.sender_id) 
            ? [...prev, newMessage]
            : prev
        )
      })
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }, [userId, supabase])

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          sender:profiles(name, avatar_url, is_company)
        `)
        .or(`sender_id.eq.${conversationId},receiver_id.eq.${conversationId}`)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      setCurrentMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (receiverId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          content
        })

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  return {
    conversations,
    currentMessages,
    isLoading,
    loadConversationMessages,
    sendMessage
  }
} 
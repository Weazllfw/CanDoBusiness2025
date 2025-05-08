import { Database } from '@/types/supabase'
import { createServerSupabaseClient } from './auth'
import { cache } from 'react'

export interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  thread_id: string
  created_at: string
  updated_at: string
  read: boolean
  attachments?: string[]
  reply_to_id?: string
}

export interface Thread {
  id: string
  type: 'direct' | 'rfq' | 'quote'
  company: {
    id: string
    name: string
    avatar_url?: string
  }
  rfq?: {
    id: string
    title: string
  }
  created_at: string
  updated_at: string
}

export interface MessageThread {
  otherCompany: {
    id: string
    name: string
    avatar_url?: string
  }
  lastMessage: {
    content: string
    created_at: string
    read: boolean
  }
  unreadCount: number
}

const MESSAGES_PER_PAGE = 20

// Cache message threads to prevent unnecessary refetches
export const getMessageThreads = cache(async (companyId: string): Promise<MessageThread[]> => {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the latest message and unread count for each conversation
    const { data: threads, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        receiver_id,
        read,
        companies!sender_id(id, name),
        companies!receiver_id(id, name),
        unread_count:messages!receiver_id_read_idx(count)
      `)
      .or(`sender_id.eq.${companyId},receiver_id.eq.${companyId}`)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching message threads:', error)
      return []
    }

    // Process and deduplicate threads with proper typing
    const threadMap = new Map<string, MessageThread>()
    
    threads?.forEach((message: any) => {
      const isReceiver = message.receiver_id === companyId
      const otherCompanyId = isReceiver ? message.sender_id : message.receiver_id
      const otherCompany = isReceiver 
        ? message.companies.sender_id 
        : message.companies.receiver_id

      if (!threadMap.has(otherCompanyId)) {
        threadMap.set(otherCompanyId, {
          otherCompany: {
            id: otherCompanyId,
            name: otherCompany.name
          },
          lastMessage: message,
          unreadCount: message.unread_count || 0
        })
      }
    })

    return Array.from(threadMap.values())
  } catch (error) {
    console.error('Error in getMessageThreads:', error)
    return []
  }
})

export async function getMessages(
  companyId: string,
  otherCompanyId: string,
  page = 1
): Promise<{ messages: Message[]; hasMore: boolean }> {
  try {
    const supabase = createServerSupabaseClient()
    const from = (page - 1) * MESSAGES_PER_PAGE
    
    // Use a more efficient query with proper indexing
    const { data: messages, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .or(
        `and(sender_id.eq.${companyId},receiver_id.eq.${otherCompanyId}),` +
        `and(sender_id.eq.${otherCompanyId},receiver_id.eq.${companyId})`
      )
      .order('created_at', { ascending: false })
      .range(from, from + MESSAGES_PER_PAGE - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return { messages: [], hasMore: false }
    }

    return {
      messages: messages || [],
      hasMore: count ? from + MESSAGES_PER_PAGE < count : false
    }
  } catch (error) {
    console.error('Error in getMessages:', error)
    return { messages: [], hasMore: false }
  }
}

// Add rate limiting to prevent spam
let lastMessageTimestamp = 0
const MESSAGE_RATE_LIMIT_MS = 500 // 500ms between messages

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<Message | null> {
  try {
    const now = Date.now()
    if (now - lastMessageTimestamp < MESSAGE_RATE_LIMIT_MS) {
      throw new Error('Please wait before sending another message')
    }
    lastMessageTimestamp = now

    const supabase = createServerSupabaseClient()
    
    // Validate sender company ownership
    const { data: senderCompany, error: senderError } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', senderId)
      .single()

    if (senderError || !senderCompany) {
      console.error('Error validating sender:', senderError)
      return null
    }

    // Insert the message with retry logic
    let retries = 3
    let message = null
    while (retries > 0 && !message) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: senderId,
          receiver_id: receiverId,
          read: false
        })
        .select()
        .single()

      if (!error) {
        message = data
        break
      }

      console.error(`Error sending message (retry ${4 - retries}):`, error)
      retries--
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return message
  } catch (error) {
    console.error('Error in sendMessage:', error)
    return null
  }
}

export async function markMessagesAsRead(
  companyId: string,
  otherCompanyId: string
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', companyId)
      .eq('sender_id', otherCompanyId)
      .eq('read', false)

    if (error) {
      console.error('Error marking messages as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error)
    return false
  }
} 
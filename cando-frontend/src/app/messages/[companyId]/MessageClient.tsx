'use client'

import { useEffect, useState } from 'react'
import { Message, Thread } from '@/lib/messages'
import MessageList from '@/components/messages/MessageList'
import MessageInput from '@/components/messages/MessageInput'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import FileUpload from '@/components/messages/FileUpload'
import QuoteManager from '@/components/messages/QuoteManager'
import ThreadHeader from '@/components/messages/ThreadHeader'

interface MessageClientProps {
  initialThread: Thread
  initialMessages: Message[]
  currentCompanyId: string
  otherCompanyId: string
  initialHasMore: boolean
}

export default function MessageClient({
  initialThread,
  initialMessages,
  currentCompanyId,
  otherCompanyId,
  initialHasMore,
}: MessageClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [page, setPage] = useState(1)
  const supabase = createClientComponentClient<Database>()

  // Real-time subscriptions
  useEffect(() => {
    const messageChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${initialThread.id}`,
        },
        handleMessageChange
      )
      .subscribe()

    const typingChannel = supabase
      .channel(`typing:${initialThread.id}`)
      .on('broadcast', { event: 'typing' }, handleTypingEvent)
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(typingChannel)
    }
  }, [initialThread.id])

  const handleMessageChange = (payload: any) => {
    switch (payload.eventType) {
      case 'INSERT':
        setMessages(prev => [payload.new as Message, ...prev])
        break
      case 'UPDATE':
        setMessages(prev => 
          prev.map(msg => 
            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
          )
        )
        break
      case 'DELETE':
        setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
        break
    }
  }

  const handleTypingEvent = (payload: any) => {
    if (payload.user_id !== currentCompanyId) {
      setIsTyping(true)
      // Clear typing indicator after 3 seconds
      setTimeout(() => setIsTyping(false), 3000)
    }
  }

  const sendMessage = async (content: string, attachments: File[]) => {
    try {
      // Upload attachments first if any
      const attachmentUrls = await Promise.all(
        attachments.map(file => uploadAttachment(file))
      )

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content,
          thread_id: initialThread.id,
          sender_id: currentCompanyId,
          receiver_id: otherCompanyId,
          attachments: attachmentUrls,
          reply_to_id: replyTo?.id,
          read: false,
        })
        .select()
        .single()

      if (error) throw error

      setMessages(prev => [message as Message, ...prev])
      setReplyTo(null) // Clear reply after sending
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const uploadAttachment = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${initialThread.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    return filePath
  }

  const loadMore = async () => {
    if (isLoading || !hasMore) return

    try {
      setIsLoading(true)
      const nextPage = page + 1
      
      const { data: newMessages, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('thread_id', initialThread.id)
        .order('created_at', { ascending: false })
        .range((nextPage - 1) * 20, nextPage * 20 - 1)

      if (error) throw error

      setMessages(prev => [...prev, ...(newMessages as Message[])])
      setHasMore(count ? nextPage * 20 < count : false)
      setPage(nextPage)
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ThreadHeader 
        thread={initialThread}
        isTyping={isTyping}
      />
      
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          currentCompanyId={currentCompanyId}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={loadMore}
          onReply={setReplyTo}
        />
      </div>

      {initialThread.type === 'rfq' && (
        <QuoteManager
          rfqId={initialThread.rfq?.id}
          threadId={initialThread.id}
        />
      )}

      <MessageInput
        onSend={sendMessage}
        onTyping={() => {
          supabase
            .channel(`typing:${initialThread.id}`)
            .send({
              type: 'broadcast',
              event: 'typing',
              payload: { user_id: currentCompanyId }
            })
        }}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  )
} 
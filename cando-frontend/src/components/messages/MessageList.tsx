import { useState } from 'react'
import { MessageView } from '@/lib/hooks/useMessages'
import { format } from 'date-fns'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface MessageListProps {
  messages: MessageView[]
  currentUserId: string
  isLoadingMessages?: boolean
}

const REACTIONS = ['👍', '❤️', '😊', '🎉', '👏', '🤝']

function MessageBubble({
  message,
  currentUserId,
}: {
  message: MessageView
  currentUserId: string
}) {
  const isSender = message.sender_id === currentUserId

  return (
    <div
      className={`group flex flex-col space-y-2 ${
        isSender ? 'items-end' : 'items-start'
      }`}
    >
      <div className="relative flex items-end gap-2">
        {!isSender && (
          message.sender_avatar ? (
            <img src={message.sender_avatar} alt={message.sender_name || 'Sender'} className="h-8 w-8 rounded-full" />
          ) : (
            <span className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
              {message.sender_name?.charAt(0).toUpperCase() || 'S'}
            </span>
          )
        )}
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 ${
            isSender
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {!isSender && (
            <p className="text-xs font-semibold mb-1">
              {message.sender_name || 'Unknown Sender'}
            </p>
          )}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="mt-1 text-xs opacity-70 text-right">
            {format(new Date(message.created_at), 'h:mm a')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessageList({
  messages,
  currentUserId,
  isLoadingMessages,
}: MessageListProps) {
  if (isLoadingMessages && messages.length === 0) {
    return <p className="p-4 text-gray-500 text-center">Loading messages...</p>
  }

  if (messages.length === 0) {
    return <p className="p-4 text-gray-500 text-center">No messages in this conversation yet.</p>
  }

  return (
    <div className="flex flex-col-reverse p-4 space-y-reverse space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
} 
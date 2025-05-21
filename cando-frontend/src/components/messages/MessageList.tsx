import { useState } from 'react'
import { MessageView } from '@/lib/hooks/useMessages'
import { format } from 'date-fns'
import Image from 'next/image';
import { UserIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

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
  const isSender = message.is_sent_by_current_user;

  const senderDisplayName = message.acting_as_company_name 
    ? `${message.acting_as_company_name} (${message.sender_name || 'User'})` 
    : message.sender_name || 'Unknown Sender';
  
  const senderAvatarUrl = message.acting_as_company_logo_url || message.sender_avatar_url;
  const senderDefaultIconType = message.acting_as_company_id ? 'company' : 'user';

  return (
    <div
      className={`group flex flex-col space-y-2 ${
        isSender ? 'items-end' : 'items-start'
      }`}
    >
      <div className="relative flex items-end gap-2">
        {!isSender && (
          senderAvatarUrl ? (
            <Image src={senderAvatarUrl} alt={senderDisplayName} width={32} height={32} className="h-8 w-8 rounded-full" />
          ) : (
            <span className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
              {senderDefaultIconType === 'user' ? 
                <UserIcon className="h-5 w-5 text-white" /> : 
                <BuildingOffice2Icon className="h-5 w-5 text-white" />
              }
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
              {senderDisplayName}
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
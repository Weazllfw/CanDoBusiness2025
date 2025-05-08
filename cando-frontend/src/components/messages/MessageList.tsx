import { useState } from 'react'
import { Message } from '@/lib/messages'
import { format } from 'date-fns'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface MessageListProps {
  messages: Message[]
  currentCompanyId: string
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  onReply: (message: Message) => void
}

const REACTIONS = ['👍', '❤️', '😊', '🎉', '👏', '🤝']

function MessageBubble({
  message,
  currentCompanyId,
  onReply,
}: {
  message: Message
  currentCompanyId: string
  onReply: () => void
}) {
  const [showReactions, setShowReactions] = useState(false)
  const supabase = createClientComponentClient<Database>()
  const isSender = message.sender_id === currentCompanyId

  const addReaction = async (reaction: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: message.id,
          company_id: currentCompanyId,
          reaction,
        })

      if (error) throw error
    } catch (error) {
      console.error('Error adding reaction:', error)
    } finally {
      setShowReactions(false)
    }
  }

  return (
    <div
      className={`group flex flex-col space-y-2 ${
        isSender ? 'items-end' : 'items-start'
      }`}
    >
      {message.reply_to_id && (
        <div className="text-xs text-gray-500 px-4">
          Replying to a message
        </div>
      )}
      
      <div className="relative flex items-end gap-2">
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 ${
            isSender
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={`/api/attachments/${attachment}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-sm ${
                    isSender ? 'text-primary-100' : 'text-primary-600'
                  } hover:underline`}
                >
                  📎 Attachment {index + 1}
                </a>
              ))}
            </div>
          )}
          
          <div className="mt-1 text-xs opacity-70">
            {format(new Date(message.created_at), 'h:mm a')}
          </div>
        </div>

        <div className="absolute bottom-0 right-0 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1 rounded-full hover:bg-gray-100 text-lg"
          >
            😊
          </button>
          <button
            onClick={onReply}
            className="p-1 rounded-full hover:bg-gray-100 text-lg"
          >
            ↩️
          </button>
        </div>

        {showReactions && (
          <div className="absolute bottom-0 right-0 translate-y-full bg-white shadow-lg rounded-full border p-1 flex items-center gap-1">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => addReaction(reaction)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                {reaction}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessageList({
  messages,
  currentCompanyId,
  hasMore,
  isLoading,
  onLoadMore,
  onReply,
}: MessageListProps) {
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  return (
    <div className="flex flex-col-reverse p-4 space-y-reverse space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentCompanyId={currentCompanyId}
          onReply={() => setReplyTo(message)}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {replyTo && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Replying to: {replyTo.content.slice(0, 50)}...
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
} 
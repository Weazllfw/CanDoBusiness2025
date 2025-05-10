import { Conversation } from '@/lib/hooks/useMessages'
import { format } from 'date-fns'
import Link from 'next/link'

interface ThreadListProps {
  conversations: Conversation[]
  currentOtherUserId?: string
}

export default function ThreadList({ conversations, currentOtherUserId }: ThreadListProps) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500">
        No messages yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conv) => (
        <Link
          key={conv.other_user_id}
          href={`/messages/${conv.other_user_id}`}
          className={`block hover:bg-gray-50 ${
            currentOtherUserId === conv.other_user_id ? 'bg-primary-50' : ''
          }`}
        >
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {conv.other_user_avatar ? (
                  <img src={conv.other_user_avatar} alt={conv.other_user_name || 'User'} className="h-8 w-8 rounded-full mr-3" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs mr-3">
                    {conv.other_user_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
                <p className="truncate text-sm font-medium text-primary-600">
                  {conv.other_user_name || 'Unknown User'}
                </p>
                {conv.unread_count > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              <div className="ml-2 flex-shrink-0 text-sm text-gray-500">
                {format(new Date(conv.last_message_at), 'MMM d, h:mm a')}
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600 line-clamp-2">
                {conv.last_message_sender_id !== conv.other_user_id ? 'You: ' : ''}
                {conv.last_message_content}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
} 
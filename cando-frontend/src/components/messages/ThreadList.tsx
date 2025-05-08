import { MessageThread } from '@/lib/messages'
import { format } from 'date-fns'
import Link from 'next/link'

interface Thread {
  id: string
  company: {
    id: string
    name: string
    avatar_url?: string
  }
  last_message: {
    content: string
    created_at: string
    read: boolean
  }
  unread_count: number
  type: 'direct' | 'rfq' | 'quote'
  rfq?: {
    id: string
    title: string
  }
}

interface ThreadListProps {
  threads: MessageThread[]
  currentThreadId?: string
}

export default function ThreadList({ threads, currentThreadId }: ThreadListProps) {
  return (
    <div className="divide-y divide-gray-200">
      {threads.map((thread) => (
        <Link
          key={thread.otherCompany.id}
          href={`/messages/${thread.otherCompany.id}`}
          className={`block hover:bg-gray-50 ${
            currentThreadId === thread.otherCompany.id ? 'bg-primary-50' : ''
          }`}
        >
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="truncate text-sm font-medium text-primary-600">
                  {thread.otherCompany.name}
                </p>
                {thread.unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              <div className="ml-2 flex-shrink-0 text-sm text-gray-500">
                {format(new Date(thread.lastMessage.created_at), 'MMM d, h:mm a')}
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600 line-clamp-2">
                {thread.lastMessage.content}
              </p>
            </div>
          </div>
        </Link>
      ))}
      {threads.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-gray-500">
          No messages yet
        </div>
      )}
    </div>
  )
} 
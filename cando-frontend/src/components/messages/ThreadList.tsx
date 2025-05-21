import { Conversation } from '@/lib/hooks/useMessages'
import { format } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image';
import { UserIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

interface ThreadListProps {
  conversations: Conversation[]
  selectedPartnerId?: string | null;
  currentUserId: string;
}

export default function ThreadList({ conversations, selectedPartnerId, currentUserId }: ThreadListProps) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500">
        No messages yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conv) => {
        const isSelected = selectedPartnerId === conv.partner_id;
        let lastMessagePrefix = '';
        if (conv.last_message_sender_id === currentUserId) {
          lastMessagePrefix = 'You: ';
        } else if (conv.last_message_acting_as_company_id) {
        }

        return (
          <Link
            key={conv.partner_id}
            href={`/messages/${conv.partner_type}/${conv.partner_id}`}
            className={`block hover:bg-gray-50 ${isSelected ? 'bg-primary-50' : ''
            }`}
          >
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {conv.partner_avatar_url ? (
                    <Image src={conv.partner_avatar_url} alt={conv.partner_name || (conv.partner_type === 'user' ? 'User' : 'Company')} width={32} height={32} className="h-8 w-8 rounded-full mr-3" />
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs mr-3">
                      {conv.partner_type === 'user' ? 
                        <UserIcon className="h-5 w-5 text-white" /> : 
                        <BuildingOffice2Icon className="h-5 w-5 text-white" />
                      }
                    </span>
                  )}
                  <p className="truncate text-sm font-medium text-primary-600">
                    {conv.partner_name || (conv.partner_type === 'user' ? 'Unknown User' : 'Unknown Company')}
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
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {lastMessagePrefix}
                  {conv.last_message_content}
                </p>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
} 
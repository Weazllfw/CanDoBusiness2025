import { Thread } from '@/lib/messages'
import Link from 'next/link'

interface ThreadHeaderProps {
  thread: Thread
  isTyping?: boolean
}

export default function ThreadHeader({ thread, isTyping }: ThreadHeaderProps) {
  return (
    <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center min-w-0">
        <div className="min-w-0">
          <Link
            href={`/company/${thread.company.id}`}
            className="text-base font-medium text-gray-900 hover:text-primary-600 truncate block"
          >
            {thread.company.name}
          </Link>
          
          {thread.type === 'rfq' && thread.rfq && (
            <div className="flex items-center mt-0.5">
              <span className="text-xs font-medium bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                RFQ
              </span>
              <span className="mx-2 text-gray-300">·</span>
              <Link
                href={`/rfq/${thread.rfq.id}`}
                className="text-sm text-gray-500 hover:text-gray-700 truncate"
              >
                {thread.rfq.title}
              </Link>
            </div>
          )}
          
          {isTyping && (
            <p className="text-sm text-gray-500 mt-0.5">
              Typing...
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1 rounded-full text-gray-400 hover:text-gray-500 text-lg"
        >
          ⋯
        </button>
      </div>
    </div>
  )
} 
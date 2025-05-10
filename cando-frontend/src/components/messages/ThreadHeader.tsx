import Link from 'next/link'

interface ThreadHeaderProps {
  otherUserName: string | null;
  otherUserAvatar: string | null;
  isTyping?: boolean;
}

export default function ThreadHeader({
  otherUserName,
  otherUserAvatar,
  isTyping,
}: ThreadHeaderProps) {
  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center">
        {otherUserAvatar ? (
          <img src={otherUserAvatar} alt={otherUserName || 'User'} className="h-10 w-10 rounded-full mr-3" />
        ) : (
          <span className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-lg mr-3">
            {otherUserName?.charAt(0).toUpperCase() || 'U'}
          </span>
        )}
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {otherUserName || 'Unknown User'}
          </h3>
          {isTyping && <p className="text-xs text-primary-600">typing...</p>}
        </div>
      </div>
    </div>
  );
} 
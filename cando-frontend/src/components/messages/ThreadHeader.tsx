import Link from 'next/link'
import Image from 'next/image';
import { UserIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

interface ThreadHeaderProps {
  partnerName: string | null;
  partnerAvatarUrl: string | null;
  partnerType: 'user' | 'company' | undefined;
  isTyping?: boolean;
}

export default function ThreadHeader({
  partnerName,
  partnerAvatarUrl,
  partnerType,
  isTyping,
}: ThreadHeaderProps) {
  const displayName = partnerName || (partnerType === 'user' ? 'Unknown User' : partnerType === 'company' ? 'Unknown Company' : 'Select a conversation');
  const displayInitial = partnerType === 'user' ? <UserIcon className="h-6 w-6 text-white" /> : partnerType === 'company' ? <BuildingOffice2Icon className="h-6 w-6 text-white" /> : '?';

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center">
        {partnerAvatarUrl ? (
          <Image src={partnerAvatarUrl} alt={displayName} width={40} height={40} className="h-10 w-10 rounded-full mr-3" />
        ) : (
          <span className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-lg mr-3">
            {displayInitial}
          </span>
        )}
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {displayName}
          </h3>
          {isTyping && <p className="text-xs text-primary-600">typing...</p>}
        </div>
      </div>
    </div>
  );
} 
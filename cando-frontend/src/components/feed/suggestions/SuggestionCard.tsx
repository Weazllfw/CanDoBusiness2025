import Image from 'next/image';
import Link from 'next/link';
import { UserPlusIcon, BuildingOffice2Icon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import UserConnectButton from '@/components/connections/UserConnectButton';

export interface Suggestion {
  id: string;
  name: string;
  avatar_url?: string | null;
  reason?: string | null; // e.g., "X mutual connections" or "In your industry"
  type: 'person' | 'company';
  // Optional fields based on type
  role?: string | null; // For person
  industry?: string | null; // For company or person
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  currentUser: User | null;
  onConnect?: (id: string) => Promise<boolean>; // Kept for now, but will be unused for person
  onFollow?: (id: string) => Promise<boolean>;  // Returns true on success
  onConnectionStatusChange?: (targetUserId: string, newStatus: string) => void;
  followed?: boolean; // Added for company follow state
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, currentUser, onConnect, onFollow, onConnectionStatusChange, followed }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleFollowAction = async () => {
    if (suggestion.type === 'company' && onFollow) {
      setIsLoading(true);
      const success = await onFollow(suggestion.id);
      setIsLoading(false);
      if (success) {
        setIsDone(true);
      }
    }
  };

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className="flex-shrink-0 h-10 w-10">
        {suggestion.avatar_url && suggestion.avatar_url.includes('api.dicebear.com') ? (
          <Image src={suggestion.avatar_url} alt={suggestion.name} width={40} height={40} className="rounded-full bg-gray-200 object-cover" />
        ) : suggestion.avatar_url ? (
          <Image src={suggestion.avatar_url} alt={suggestion.name} width={40} height={40} className="rounded-full bg-gray-200 object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            {suggestion.type === 'person' ? (
              <UserPlusIcon className="h-6 w-6 text-gray-400" />
            ) : (
              <BuildingOffice2Icon className="h-6 w-6 text-gray-400" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          <Link href={suggestion.type === 'person' ? `/profile/${suggestion.id}` : `/company/${suggestion.id}`} className="hover:underline">
            {suggestion.name}
          </Link>
        </p>
        {suggestion.role && suggestion.type === 'person' && (
          <p className="text-sm text-gray-500 truncate">{suggestion.role}</p>
        )}
        {suggestion.industry && (
            <p className="text-xs text-gray-500 truncate">{suggestion.industry}</p>
        )}
        {suggestion.reason && (
          <p className="text-xs text-gray-500 truncate">{suggestion.reason}</p>
        )}
      </div>
      {suggestion.type === 'person' && currentUser ? (
        <UserConnectButton 
          targetUserId={suggestion.id} 
          currentUser={currentUser} 
          {...(onConnectionStatusChange && { onStatusChange: onConnectionStatusChange })}
        />
      ) : suggestion.type === 'company' ? (
        followed ? (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-50 text-green-500">
            <CheckIcon className="h-5 w-5" />
          </div>
        ) : !isDone ? (
          <button
            onClick={handleFollowAction}
            disabled={isLoading}
            title={'Follow'}
            className={`flex items-center justify-center h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <PlusIcon className="h-5 w-5" />
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-50 text-green-500">
            <CheckIcon className="h-5 w-5" />
          </div>
        )
      ) : null}
    </div>
  );
};

export default SuggestionCard; 
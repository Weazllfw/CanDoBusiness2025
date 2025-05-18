'use client'

import { useState, Fragment, useEffect } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface FlagButtonProps {
  contentType: 'post' | 'comment';
  contentId: string;
  contentOwnerId: string;
}

export default function FlagButton({ contentType, contentId, contentOwnerId }: FlagButtonProps) {
  const supabase = createClientComponentClient<Database>();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, [supabase]);

  const openModal = () => {
    if (!currentUserId) {
      toast.error('You must be logged in to flag content.');
      return;
    }
    if (currentUserId === contentOwnerId) {
      toast.error("You cannot flag your own content.");
      return;
    }
    console.log(`Opening flag modal for ${contentType} ID: ${contentId}`);
    setIsOpen(true);
  };
  const closeModal = () => setIsOpen(false);

  const handleSubmitFlag = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for flagging.');
      return;
    }
    if (!currentUserId) {
      toast.error('User session not found. Please log in again.');
      return;
    }

    console.log(`Attempting to submit flag for ${contentType} ID: ${contentId} by user ${currentUserId} with reason: "${reason || ''}"`);

    const flagData = {
      user_id: currentUserId,
      reason: reason,
      status: 'pending_review' as const,
      ...(contentType === 'post' ? { post_id: contentId } : { comment_id: contentId }),
    };

    const { data, error } = await supabase
      .from(contentType === 'post' ? 'post_flags' : 'comment_flags')
      .insert(flagData)
      .select();

    if (error) {
      console.error(`Error submitting flag for ${contentType} ${contentId}:`, error);
      toast.error(`Failed to submit flag: ${error.message}`);
    } else {
      // console.log('Flag submitted successfully:', data);
      toast.success('Content flagged successfully. A moderator will review it shortly.');
      closeModal();
      setReason('');
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors duration-150 p-1 rounded-md"
        title="Flag content as inappropriate"
      >
        <FlagIcon className="h-4 w-4" />
        <span className="text-xs hidden sm:inline">Flag</span>
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        {/* ... Modal JSX ... */}
      </Transition>
    </>
  );
} 
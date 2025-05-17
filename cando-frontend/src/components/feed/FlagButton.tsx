'use client'

import { useState } from 'react';
import FlagModal from './FlagModal'; // Uncommented and imported
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'; // Example icon
import { submitFlag } from '../../lib/flags'; // Import submitFlag

interface FlagButtonProps {
  contentId: string;
  contentType: 'post' | 'comment';
  currentUserId: string | undefined; // To ensure user is logged in
}

export default function FlagButton({ contentId, contentType, currentUserId }: FlagButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Optional: Add a state to track if the current user has already flagged this item
  // const [hasFlagged, setHasFlagged] = useState(false); 
  // This would require fetching initial flag status or checking after a flag attempt.

  const handleOpenModal = () => {
    if (!currentUserId) {
      // Optionally, redirect to login or show a message
      alert('You must be logged in to flag content.');
      return;
    }
    // if (hasFlagged) { // Optional: Prevent opening modal if already flagged
    //   alert('You have already flagged this content.');
    //   return;
    // }
    setIsModalOpen(true);
    console.log(`Opening flag modal for ${contentType} ID: ${contentId}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitFlag = async (reason: string | null) => {
    if (!currentUserId) {
      alert('User session ended. Please log in again to flag content.');
      handleCloseModal();
      return;
    }

    console.log(`Attempting to submit flag for ${contentType} ID: ${contentId} by user ${currentUserId} with reason: "${reason || ''}"`);
    
    const { data, error } = await submitFlag(contentId, contentType, reason, currentUserId);

    if (error) {
      console.error('Error submitting flag:', error);
      alert(`Failed to flag ${contentType}: ${error.message}`);
      // setHasFlagged(error.message.includes('already flagged')); // Update if it was a duplicate flag error
    } else if (data) {
      console.log('Flag submitted successfully:', data);
      alert(`Successfully flagged ${contentType}. Thank you for your feedback.`);
      // setHasFlagged(true); // Mark as flagged to prevent re-flagging UI interaction
    }
    handleCloseModal();
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        // disabled={hasFlagged} // Optional: Disable button if already flagged
        className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600 focus:outline-none disabled:opacity-50 disabled:hover:text-gray-500 disabled:cursor-not-allowed"
        title={/*hasFlagged ? `You have flagged this ${contentType}` :*/ `Flag this ${contentType}`}
      >
        <ShieldExclamationIcon className="h-4 w-4" />
        <span>{/*hasFlagged ? 'Flagged' :*/ 'Flag'}</span>
      </button>

      {isModalOpen && (
        <FlagModal 
          contentId={contentId} 
          contentType={contentType} 
          onClose={handleCloseModal} 
          onSubmit={handleSubmitFlag} 
          currentUserId={currentUserId}
        />
      )}
    </>
  );
} 
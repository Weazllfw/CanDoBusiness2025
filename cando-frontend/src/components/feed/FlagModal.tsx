'use client'

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface FlagModalProps {
  contentId: string;
  contentType: 'post' | 'comment';
  onClose: () => void;
  onSubmit: (reason: string | null) => void; // Callback when flag is submitted
  currentUserId: string | undefined; // To ensure user is logged in before submission
}

export default function FlagModal({
  contentId,
  contentType,
  onClose,
  onSubmit,
  currentUserId
}: FlagModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      setError('You must be logged in to submit a flag.');
      return;
    }
    // Basic validation for reason length, though it's optional
    if (reason.length > 1000) { 
      setError('Reason cannot exceed 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Here, the actual call to the backend service (e.g., submitFlag) would happen.
      // For now, we just call the onSubmit prop passed from FlagButton.
      onSubmit(reason.trim() || null); // Pass trimmed reason or null if empty
      // onClose(); // onSubmit in FlagButton already calls handleCloseModal
    } catch (submissionError: any) {
      console.error(`Error submitting flag for ${contentType} ${contentId}:`, submissionError);
      setError(submissionError.message || 'Failed to submit flag.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-out" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-scale-up">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-800">
            Flag {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4">
            <label htmlFor="flag-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason (Optional):
            </label>
            <textarea
              id="flag-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Why are you flagging this ${contentType}? (Max 1000 characters)`}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              maxLength={1000}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 mb-3 text-center">Error: {error}</p>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentUserId}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add this to your global CSS or a style tag in your layout for the animation
/*
@keyframes modal-scale-up {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-modal-scale-up {
  animation: modal-scale-up 0.2s ease-out forwards;
}
*/ 
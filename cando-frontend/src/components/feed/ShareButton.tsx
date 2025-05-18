'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface ShareButtonProps {
  postId: string
  postContent: string
}

export default function ShareButton({ postId, postContent }: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${postId}`
    const shareText = `${postContent.slice(0, 100)}${postContent.length > 100 ? '...' : ''}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on CanDo Business',
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setIsModalOpen(true)
        }
      }
    } else {
      setIsModalOpen(true)
    }
  }

  const copyToClipboard = async () => {
    const shareUrl = `${window.location.origin}/post/${postId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!')
      setIsModalOpen(false)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-blue-600"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
        <span>Share</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Share this post</h3>
            <div className="space-y-4">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy Link</span>
              </button>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 
import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface ShareButtonProps {
  postId: string
  postContent: string
  onShare?: () => void
}

export default function ShareButton({ postId, postContent, onShare }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Shared Post',
          text: postContent,
          url: `${window.location.origin}/post/${postId}`
        })
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
        toast.success('Link copied to clipboard!')
      }
      onShare?.()
    } catch (error) {
      console.error('Error sharing:', error)
      toast.error('Failed to share post')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="flex items-center space-x-1 text-gray-600"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
      <span>Share</span>
    </button>
  )
} 
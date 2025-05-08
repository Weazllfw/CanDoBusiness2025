import { useState, useRef, useEffect } from 'react'
import { FileUpload } from './FileUpload'
import { Message } from '@/lib/messages'

interface MessageInputProps {
  onSend: (content: string, attachments: File[]) => void
  onTyping?: () => void
  replyTo?: Message | null
  onCancelReply?: () => void
}

export default function MessageInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      onTyping?.()
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return

    onSend(content, attachments)
    setContent('')
    setAttachments([])

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {replyTo && (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">↩️ Replying to:</span>
            <span className="text-sm text-gray-700 line-clamp-1">
              {replyTo.content}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      <FileUpload
        files={attachments}
        onFilesChange={setAttachments}
      />

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            handleTyping()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500 min-h-[44px] max-h-32 py-2 px-3"
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim() && attachments.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed h-[44px]"
        >
          Send
        </button>
      </div>
    </form>
  )
} 
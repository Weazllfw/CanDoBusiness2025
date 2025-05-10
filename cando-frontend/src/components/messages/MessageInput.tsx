import { useState, useRef, FormEvent } from 'react'

interface MessageInputProps {
  onSend: (content: string) => Promise<void>
  // onTyping: () => void; // Typing indicator can be added back later
  // replyTo?: MessageView | null; // Reply feature can be added back later
  // onCancelReply?: () => void; // Reply feature can be added back later
}

export default function MessageInput({
  onSend,
  // onTyping, // Removed for now
  // replyTo, // Removed for now
  // onCancelReply, // Removed for now
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSending(true)
    try {
      await onSend(content.trim())
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto' // Reset height after sending
      }
    } catch (error) {
      console.error("Error in MessageInput handleSubmit:", error)
      // Optionally show an error to the user, e.g., using a toast notification
    } finally {
      setIsSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // onTyping(); // Removed for now
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-4 border-t border-gray-200 bg-white flex items-start space-x-3"
    >
      {/* ReplyTo UI removed */}
      <textarea
        ref={textareaRef}
        rows={1}
        className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 resize-none"
        placeholder="Type your message..."
        value={content}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
        disabled={isSending}
      />
      {/* FileUpload button removed */}
      <button
        type="submit"
        disabled={isSending || !content.trim()}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {isSending ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          'Send'
        )}
      </button>
    </form>
  )
} 
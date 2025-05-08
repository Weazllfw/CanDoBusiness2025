'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface CreatePostProps {
  companyId: string
  onPostCreated: () => void
}

export default function CreatePost({ companyId, onPostCreated }: CreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'general' | 'rfq'>('general')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient<Database>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('posts')
        .insert({
          content,
          title,
          type,
          company_id: companyId,
        })

      if (error) throw error

      setContent('')
      setTitle('')
      setType('general')
      setIsModalOpen(false)
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Post Creation Box */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full text-left px-4 py-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100"
        >
          Start a post...
        </button>
        <div className="flex mt-4 space-x-4">
          <button
            onClick={() => {
              setType('general')
              setIsModalOpen(true)
            }}
            className="flex-1 flex items-center justify-center px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-600"
          >
            <span>📝 Post Update</span>
          </button>
          <button
            onClick={() => {
              setType('rfq')
              setIsModalOpen(true)
            }}
            className="flex-1 flex items-center justify-center px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-600"
          >
            <span>🔍 Request Quote</span>
          </button>
        </div>
      </div>

      {/* Post Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Create a Post</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-4">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'general' | 'rfq')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="general">General Update</option>
                  <option value="rfq">Request for Quote</option>
                </select>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title (optional)"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What do you want to share?"
                rows={6}
                className="w-full p-2 border rounded-md mb-4"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !content.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
} 
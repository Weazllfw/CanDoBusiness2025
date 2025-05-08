'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  content: string
  type: 'general' | 'rfq'
  created_at: string
  companies: {
    id: string
    name: string
  }
}

interface PostFeedProps {
  initialPosts: Post[]
  onLoadMore: () => Promise<void>
  hasMore: boolean
}

function PostCard({ post }: { post: Post }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLongContent = post.content.length > 280

  return (
    <article className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link
            href={`/company/${post.companies.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {post.companies.name}
          </Link>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          {post.type === 'rfq' ? 'RFQ' : 'Update'}
        </span>
      </div>

      {post.title && (
        <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
      )}

      <div className="prose max-w-none">
        {isLongContent && !isExpanded ? (
          <>
            <p>{post.content.slice(0, 280)}...</p>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              See more
            </button>
          </>
        ) : (
          <p>{post.content}</p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex items-center space-x-4">
        <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
          <span>👍</span>
          <span>Like</span>
        </button>
        <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
          <span>💬</span>
          <span>Comment</span>
        </button>
        {post.type === 'rfq' && (
          <Link
            href={`/messages/${post.companies.id}?rfq=${post.id}`}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
          >
            <span>📨</span>
            <span>Send Quote</span>
          </Link>
        )}
      </div>
    </article>
  )
}

export default function PostFeed({ initialPosts, onLoadMore, hasMore }: PostFeedProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [posts, setPosts] = useState<Post[]>(initialPosts)

  const handleLoadMore = async () => {
    if (isLoading) return
    try {
      setIsLoading(true)
      await onLoadMore()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
} 
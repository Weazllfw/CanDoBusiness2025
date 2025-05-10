'use client'

import PostFeed from '@/components/feed/PostFeed'
import CreatePost from '@/components/feed/CreatePost'
import RightSidebar from '@/components/feed/RightSidebar'
import { useState } from 'react'

const mockPosts = [
  {
    id: '1',
    title: 'Welcome to CanDo!',
    content: 'This is your business feed. Start posting updates or RFQs.',
    type: 'general' as 'general',
    created_at: new Date().toISOString(),
    companies: { id: '1', name: 'Demo Company' },
  },
]

export default function FeedPage() {
  const [posts, setPosts] = useState(mockPosts)
  const [hasMore, setHasMore] = useState(false)

  const handlePostCreated = () => {
    // Placeholder: In real app, reload posts from backend
  }

  const handleLoadMore = async () => {
    // Placeholder: In real app, fetch more posts
  }

  return (
    <div className="flex gap-8 max-w-7xl mx-auto py-8">
      <div className="flex-1">
        <CreatePost companyId="1" onPostCreated={handlePostCreated} />
        <PostFeed initialPosts={posts} onLoadMore={handleLoadMore} hasMore={hasMore} />
      </div>
      <RightSidebar />
    </div>
  )
} 
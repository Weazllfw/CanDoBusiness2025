import { getUser } from '@/lib/auth'
import ThreadList from '@/components/messages/ThreadList'
import MessageClient from './MessageClient'
import { redirect } from 'next/navigation'
import { useMessages } from '@/lib/hooks/useMessages'

interface MessagesPageProps {
  params: {
    otherUserId: string
  }
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
    return null
  }

  if (params.otherUserId === user.id) {
    redirect('/messages')
    return null
  }

  return (
    <div className="flex h-screen bg-white">
      <MessageClient
        currentUserId={user.id}
        otherUserId={params.otherUserId}
      />
    </div>
  )
} 
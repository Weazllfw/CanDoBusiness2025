import { getUser } from '@/lib/auth'
import ThreadList from '@/components/messages/ThreadList' // This import might be unused here now
import MessageClient from './MessageClient'
import { redirect } from 'next/navigation'
// import { useMessages } from '@/lib/hooks/useMessages' // This import was unused

interface MessagesPageProps {
  params: {
    partnerType: string; // Updated
    partnerId: string;   // Updated
  }
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
    return null
  }

  // Updated logic: Prevent self-chat if partnerType is 'user' and partnerId is current user
  if (params.partnerType === 'user' && params.partnerId === user.id) {
    redirect('/messages') // Redirect to the main messages page (conversation list)
    return null
  }

  return (
    <div className="flex h-screen bg-white">
      <MessageClient
        currentUserId={user.id}
        partnerId={params.partnerId}       // Updated
        partnerType={params.partnerType as 'user' | 'company'} // Updated, with assertion for now
      />
    </div>
  )
} 
import { getUser, getUserCompanies } from '@/lib/auth'
import { getMessageThreads, getMessages } from '@/lib/messages'
import ThreadList from '@/components/messages/ThreadList'
import MessageClient from './MessageClient'
import { redirect } from 'next/navigation'

interface MessagesPageProps {
  params: {
    companyId: string
  }
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's companies
  const companies = await getUserCompanies(user.id)
  if (!companies.length) {
    redirect('/company/new')
  }

  // Get message threads
  const currentCompany = companies[0] // Default to first company
  const threads = await getMessageThreads(currentCompany.id)

  // Get messages for the selected thread
  const { messages, hasMore } = await getMessages(
    currentCompany.id,
    params.companyId
  )

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThreadList
            threads={threads}
            currentThreadId={params.companyId}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <MessageClient
          initialMessages={messages}
          currentCompanyId={currentCompany.id}
          otherCompanyId={params.companyId}
          initialHasMore={hasMore}
        />
      </div>
    </div>
  )
} 
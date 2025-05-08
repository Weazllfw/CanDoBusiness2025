import Image from 'next/image'
import Link from 'next/link'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import type { Connection } from '@/types/feed'

const suggestedConnections: Connection[] = [
  {
    id: 1,
    name: 'Sarah Wong',
    role: 'Procurement Manager',
    industry: 'Food & Beverage',
    avatar: '/images/avatars/avatar-3.jpg'
  },
  {
    id: 2,
    name: 'Mark Tremblay',
    role: 'Supply Chain Director',
    industry: 'Technology',
    avatar: '/images/avatars/avatar-4.jpg'
  },
  {
    id: 3,
    name: 'Lisa Chen',
    role: 'Operations Manager',
    industry: 'Manufacturing',
    avatar: '/images/avatars/avatar-5.jpg'
  }
]

export default function RightSidebar() {
  return (
    <div className="w-80 hidden lg:block">
      <div className="fixed w-80">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">People you may know</h2>
          </div>
          <div className="p-4">
            <div className="space-y-6">
              {suggestedConnections.map((connection) => (
                <div key={connection.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {connection.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {connection.role}
                    </p>
                    <p className="text-xs text-gray-500">
                      {connection.industry}
                    </p>
                  </div>
                  <button className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-500">
                    <UserPlusIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <Link 
                href="/network" 
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all suggestions →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
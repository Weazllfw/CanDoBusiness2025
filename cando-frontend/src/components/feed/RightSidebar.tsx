import Image from 'next/image'
import Link from 'next/link'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import type { Connection } from '@/types/feed'
import PeopleYouMayKnow from './suggestions/PeopleYouMayKnow';
import CompaniesYouMayKnow from './suggestions/CompaniesYouMayKnow';

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
      <div className="fixed w-80 space-y-6">
        {/* People You May Know Section */}
        <PeopleYouMayKnow />

        {/* Companies You May Know Section */}
        <CompaniesYouMayKnow />
        
        {/* Potentially other sidebar content can go here if needed */}
      </div>
    </div>
  )
} 
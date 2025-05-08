'use client'

import Image from 'next/image'
import Link from 'next/link'

interface SuggestedPerson {
  id: string
  name: string
  role: string
  avatar: string
}

const suggestedPeople: SuggestedPerson[] = [
  {
    id: '1',
    name: 'Sarah Wong',
    role: 'Food & Beverage',
    avatar: '/images/avatars/sarah.jpg'
  },
  {
    id: '2',
    name: 'Mark Tremblay',
    role: 'Tech',
    avatar: '/images/avatars/mark.jpg'
  },
  {
    id: '3',
    name: 'Natalie Ferrer',
    role: 'Retail',
    avatar: '/images/avatars/natalie.jpg'
  },
  {
    id: '4',
    name: 'Karen Greene',
    role: 'Construction',
    avatar: '/images/avatars/karen.jpg'
  }
]

export default function Sidebar() {
  return (
    <div className="w-80 bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        People you may know
      </h2>
      <div className="space-y-4">
        {suggestedPeople.map((person) => (
          <div key={person.id} className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src={person.avatar}
                alt={person.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{person.name}</p>
                <p className="text-xs text-gray-500">{person.role}</p>
              </div>
            </div>
            <Link
              href={`/network/connect/${person.id}`}
              className="text-sm font-medium text-[#C41E3A] hover:text-[#A01830]"
            >
              Connect
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
} 
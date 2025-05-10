'use client'

import { useEffect, useState, Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EnvelopeIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import MessagesModal from '../messages/MessagesModal'
import { useAuth } from '@/lib/hooks/useAuth'
import CompanySelector from '../company/CompanySelector'

export default function Header() {
  const pathname = usePathname()
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const { user, signOut } = useAuth()

  useEffect(() => {
    const handleOpenMessages = () => {
      setIsMessagesOpen(true)
    }

    window.addEventListener('openMessages', handleOpenMessages)
    return () => {
      window.removeEventListener('openMessages', handleOpenMessages)
    }
  }, [])

  return (
    <header className="bg-primary-600 relative z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-white">CanDo</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link 
              href="/"
              className={`text-white hover:text-white/90 text-sm font-medium ${
                pathname === '/' ? 'opacity-100' : 'opacity-80'
              }`}
            >
              Home
            </Link>
            <Link 
              href="/network"
              className={`text-white hover:text-white/90 text-sm font-medium ${
                pathname === '/network' ? 'opacity-100' : 'opacity-80'
              }`}
            >
              Network
            </Link>
            <button 
              onClick={() => setIsMessagesOpen(true)}
              className={`text-white hover:text-white/90 text-sm font-medium relative flex items-center ${
                isMessagesOpen ? 'opacity-100' : 'opacity-80'
              }`}
            >
              <EnvelopeIcon className="h-6 w-6" />
              <span className="absolute -top-1 -right-2 h-2 w-2 bg-green-400 rounded-full"></span>
            </button>
          </div>

          {/* Right-aligned items: Company Selector + User Profile Dropdown */}
          <div className="flex items-center space-x-3">
            {user?.id && (
              <div className="w-56">
                <CompanySelector currentUserId={user.id} />
              </div>
            )}
            {/* User Profile Dropdown */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-3 text-white hover:text-white/90">
                <div className="flex items-center space-x-2">
                  <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200">
                    {user?.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary-700 text-white">
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{user?.name || 'Loading...'}</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </div>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[100]">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/account"
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-2 text-sm text-gray-700`}
                        >
                          Account Management
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/dashboard/companies"
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-2 text-sm text-gray-700`}
                        >
                          Manage Companies
                        </Link>
                      )}
                    </Menu.Item>
                    <div className="border-t border-gray-100 my-1" />
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={signOut}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          Sign Out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </nav>

      <MessagesModal 
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />
    </header>
  )
} 
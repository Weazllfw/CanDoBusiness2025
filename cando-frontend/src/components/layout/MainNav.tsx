'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useActiveCompany } from '@/lib/hooks/useActiveCompany'
import LogoutButton from '@/components/auth/LogoutButton'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  isActive?: boolean
}

function NavLink({ href, children, isActive }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`${
        isActive
          ? 'border-blue-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
    >
      {children}
    </Link>
  )
}

export default function MainNav({ userId }: { userId: string }) {
  const { activeCompany, companies, switchCompany } = useActiveCompany(userId)
  const router = useRouter()
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/feed" className="text-xl font-bold text-blue-600">
                CanDo Business
              </Link>
            </div>

            {/* Main Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink href="/feed" isActive={pathname === '/feed'}>
                Feed
              </NavLink>
              <NavLink href="/messages" isActive={pathname?.startsWith('/messages')}>
                Messages
              </NavLink>
              <NavLink href="/network" isActive={pathname === '/network'}>
                Network
              </NavLink>
              <NavLink href="/bookmarks" isActive={pathname === '/bookmarks'}>
                Bookmarks
              </NavLink>
              <NavLink href="/opportunities" isActive={pathname === '/opportunities'}>
                Opportunities
              </NavLink>
            </div>
          </div>

          <div className="flex items-center">
            {/* Company Switcher */}
            {activeCompany && (
              <div className="relative inline-block text-left mr-4">
                <select
                  value={activeCompany.id}
                  onChange={(e) => switchCompany(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Create Company Button */}
            <Link
              href="/company/new"
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              New Company
            </Link>

            {/* User Menu */}
            <div className="ml-4 relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {activeCompany?.name?.[0] || 'U'}
                  </span>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </Link>
                    <div className="px-4 py-2">
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 
'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

// These routes don't show the header
const noHeaderRoutes = ['/', '/auth/login', '/auth/signup', '/auth/verify-email', '/auth/reset-password']

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const showHeader = !noHeaderRoutes.includes(pathname)

  return (
    <>
      {showHeader && <Header />}
      <main className={`min-h-screen ${showHeader ? 'bg-gray-50' : 'bg-white'}`}>
        {children}
      </main>
    </>
  )
} 
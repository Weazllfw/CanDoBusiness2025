'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import CompanyVerificationTable from '@/components/admin/CompanyVerificationTable'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'

// List of known admin emails (consider moving to environment variables for better security)
// TODO: Consolidate admin email list or use a more robust role check (e.g., from DB)
const ADMIN_EMAILS = ['rmarshall@itmarshall.net', 'anotheradmin@example.com'];

export default function AdminVerificationsPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUser(session.user)

      if (session.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        setIsAdmin(true)
      } else {
        router.push('/feed') // Redirect to feed if not admin
      }
      setIsLoading(false)
    }
    checkAdminStatus()
  }, [supabase, router])

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading verification dashboard...</div>
  }

  if (!isAdmin) {
    // This part might not be reached if redirecting non-admins
    return <div className="container mx-auto px-4 py-8">Access Denied. You are not authorized to view this page.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Company Verification Management</h1>
      <CompanyVerificationTable />
    </div>
  )
} 
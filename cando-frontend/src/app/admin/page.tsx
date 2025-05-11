'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
// import CompanyVerificationTable from '@/components/admin/CompanyVerificationTable' // Removed
import Link from 'next/link' // Added for navigation
import { ArrowRightIcon } from '@heroicons/react/24/outline' // Added for link styling
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'

// Define a type for the statistics
interface VerificationStat {
  status: string;
  count: number;
}

// List of known admin emails (consider moving to environment variables for better security)
const ADMIN_EMAILS = ['rmarshall@itmarshall.net', 'anotheradmin@example.com'];

export default function AdminPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationStats, setVerificationStats] = useState<VerificationStat[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);

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
        // Fetch verification stats if user is admin
        try {
          const { data: statsData, error: statsRpcError } = await supabase.rpc('get_company_verification_stats');
          if (statsRpcError) throw statsRpcError;
          setVerificationStats(statsData || []);
        } catch (e: any) {
          console.error('Error fetching verification stats:', e);
          setStatsError(e.message || 'Failed to load company statistics.');
        }
      } else {
        router.push('/feed') // Redirect to feed if not admin
      }
      setIsLoading(false)
    }
    checkAdminStatus()
  }, [supabase, router])

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading admin dashboard...</div>
  }

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-8">Access Denied. You are not authorized to view this page.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
      
      {/* Verification Statistics Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Company Verification Statistics</h2>
        {statsError && <p className="text-red-500">Error loading stats: {statsError}</p>}
        {verificationStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {verificationStats.map(stat => (
              <div key={stat.status} className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-600">{stat.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <p className="text-3xl font-bold text-primary-600">{stat.count}</p>
              </div>
            ))}
          </div>
        ) : (
          !statsError && <p className="text-gray-500">No verification statistics available or loading...</p>
        )}
      </div>

      {/* Link to Company Verification Management Page */}
      <div className="mb-12">
         <h2 className="text-2xl font-semibold text-gray-700 mb-4">Verification Management</h2>
        <Link href="/admin/verifications"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Manage Company Verifications
          <ArrowRightIcon className="ml-3 -mr-1 h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
      
      {/* Company Verification Table Section - Removed */}
      {/* <CompanyVerificationTable /> */}
      
    </div>
  )
} 
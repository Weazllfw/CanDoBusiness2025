'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
// import CompanyVerificationTable from '@/components/admin/CompanyVerificationTable' // Removed
import Link from 'next/link' // Added for navigation
import { ArrowRightIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline' // Added ShieldExclamationIcon
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'

// Define a type for the company verification statistics
interface VerificationStat {
  status: string;
  count: number;
}

// Define a type for the flag statistics (matches RPC output)
interface FlagStat {
  status: Database['public']['Enums']['flag_status_enum']; // Use the generated ENUM type
  post_flag_count: number | null;
  comment_flag_count: number | null;
}

// List of known admin emails (consider moving to environment variables for better security)
// const ADMIN_EMAILS = ['rmarshall@itmarshall.net', 'anotheradmin@example.com']; // To be replaced

export default function AdminPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationStats, setVerificationStats] = useState<VerificationStat[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [flagStats, setFlagStats] = useState<FlagStat[]>([]);
  const [flagStatsError, setFlagStatsError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatusAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) { // Ensure session and user exist
        router.push('/auth/login')
        return
      }
      setUser(session.user)

      // TODO: Replace with a call to an RPC like `is_current_user_admin()`
      // For now, we'll assume the user is admin if they reach this page.
      // This needs to be secured properly with an RPC call.
      // const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_current_user_admin');
      // if (adminCheckError || !isAdminResult) {
      //  setIsAdmin(false);
      //  router.push('/feed'); // Redirect to feed if not admin
      //  setIsLoading(false);
      //  return;
      // }
      // setIsAdmin(true);
      
      // For demonstration, let's tentatively set isAdmin to true if a session exists.
      // THIS IS NOT SECURE and is a placeholder for the RPC call.
      // if (session.user) { // Basic check, will be replaced by proper admin check
      //     setIsAdmin(true);

      // Call the RPC to check if the current user is an admin
      try {
        const { data: isAdminUser, error: adminCheckError } = await supabase.rpc('is_current_user_admin');
        
        if (adminCheckError) {
          console.error('Error checking admin status:', adminCheckError);
          setIsAdmin(false);
          router.push('/feed'); // Redirect if error or not admin
          setIsLoading(false);
          return;
        }

        if (!isAdminUser) {
          setIsAdmin(false);
          router.push('/feed'); // Redirect if not admin
          setIsLoading(false);
          return;
        }
        
        setIsAdmin(true); // User is admin, proceed to fetch admin-specific data

        // Fetch verification stats
        try {
          const { data: companyStatsData, error: companyStatsRpcError } = await supabase.rpc('get_company_verification_stats');
          if (companyStatsRpcError) throw companyStatsRpcError;
          setVerificationStats(companyStatsData || []);
        } catch (e: any) {
          console.error('Error fetching verification stats:', e);
          setStatsError(e.message || 'Failed to load company statistics.');
        }

        // Fetch flag stats
        try {
          const { data: flagStatsData, error: flagStatsRpcError } = await supabase.rpc('admin_get_flag_statistics');
          if (flagStatsRpcError) throw flagStatsRpcError;
          setFlagStats(flagStatsData || []);
        } catch (e: any) {
          console.error('Error fetching flag stats:', e);
          setFlagStatsError(e.message || 'Failed to load flag statistics.');
        }

      } catch (e) { // Catch errors from the admin check RPC itself or other setup issues
        console.error('General error during admin check or data fetching:', e);
        setIsAdmin(false);
        router.push('/auth/login'); // Fallback redirect
      }
      setIsLoading(false)
    }
    checkAdminStatusAndFetchData()
  }, [supabase, router])

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading admin dashboard...</div>
  }

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-8">Access Denied. You are not authorized to view this page.</div>
  }

  const formatStatusName = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
      
      {/* Verification Statistics Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Company Verification</h2>
        {statsError && <p className="text-red-500">Error loading company stats: {statsError}</p>}
        {verificationStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {verificationStats.map(stat => (
              <div key={stat.status} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-gray-600">{formatStatusName(stat.status)}</h3>
                <p className="text-4xl font-bold text-primary-600 mt-1">{stat.count}</p>
              </div>
            ))}
          </div>
        ) : (
          !statsError && <p className="text-gray-500">No company verification statistics available or loading...</p>
        )}
        <Link href="/admin/verifications"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Manage Company Verifications
          <ArrowRightIcon className="ml-3 -mr-1 h-5 w-5" aria-hidden="true" />
        </Link>
      </section>

      {/* Content Flagging Statistics Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Content Flagging</h2>
        {flagStatsError && <p className="text-red-500">Error loading flag stats: {flagStatsError}</p>}
        {flagStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {flagStats.map(stat => (
              <div key={stat.status} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-gray-600">{formatStatusName(stat.status)}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-500">Post Flags: <span className="font-semibold text-indigo-600 text-2xl">{stat.post_flag_count || 0}</span></p>
                  <p className="text-sm text-gray-500">Comment Flags: <span className="font-semibold text-indigo-600 text-2xl">{stat.comment_flag_count || 0}</span></p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !flagStatsError && <p className="text-gray-500">No flag statistics available or loading...</p>
        )}
        <Link href="/admin/flags"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Manage Flagged Content
          <ShieldExclamationIcon className="ml-3 -mr-1 h-5 w-5" aria-hidden="true" />
        </Link>
      </section>

      {/* User Management Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">User Management</h2>
        <Link href="/admin/users"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          Manage Users
          <ArrowRightIcon className="ml-3 -mr-1 h-5 w-5" aria-hidden="true" />
        </Link>
      </section>
      
      {/* Company Verification Table Section - Removed */}
      {/* <CompanyVerificationTable /> */}
      
    </div>
  )
} 
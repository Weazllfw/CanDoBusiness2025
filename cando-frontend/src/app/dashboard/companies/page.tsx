'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation' // For redirecting if not logged in
import { BuildingOffice2Icon, PencilSquareIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import { 
  CheckBadgeIcon, 
  ClockIcon, 
  XCircleIcon, 
  QuestionMarkCircleIcon, 
  ShieldCheckIcon 
} from '@heroicons/react/24/solid'
import type { Database } from '@/types/supabase'

// Matches the structure returned by get_user_companies (which now returns companies_view)
interface UserCompany {
  id: string;
  name: string;
  avatar_url?: string | null;
  verification_status?: string | null;
  // Add other fields from companies_view if needed for display, e.g., description
}

const getStatusStyles = (status?: string | null): { badgeClass: string; iconClass: string; textClass: string; IconComponent: React.ElementType } => {
  switch (status) {
    case 'TIER2_FULLY_VERIFIED':
      return { badgeClass: 'bg-green-100 border-green-400', iconClass: 'text-green-500', textClass: 'text-green-700', IconComponent: ShieldCheckIcon };
    case 'TIER1_VERIFIED':
      return { badgeClass: 'bg-green-50 border-green-300', iconClass: 'text-green-400', textClass: 'text-green-600', IconComponent: CheckBadgeIcon };
    case 'TIER1_PENDING':
    case 'TIER2_PENDING':
      return { badgeClass: 'bg-blue-50 border-blue-300', iconClass: 'text-blue-400', textClass: 'text-blue-600', IconComponent: ClockIcon };
    case 'TIER1_REJECTED':
    case 'TIER2_REJECTED':
      return { badgeClass: 'bg-red-50 border-red-300', iconClass: 'text-red-400', textClass: 'text-red-600', IconComponent: XCircleIcon };
    case 'UNVERIFIED':
    default:
      return { badgeClass: 'bg-yellow-50 border-yellow-300', iconClass: 'text-yellow-400', textClass: 'text-yellow-600', IconComponent: QuestionMarkCircleIcon };
  }
};

const formatVerificationStatusText = (status?: string | null): string => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b(TIER\s*\d*)/gi, txt => txt.toUpperCase()).replace(/\b([A-Z]{4,})/g, (txt) => txt.charAt(0) + txt.slice(1).toLowerCase());
};

interface VerificationBadgeProps {
  status?: string | null;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status }) => {
  const { badgeClass, iconClass, textClass, IconComponent } = getStatusStyles(status);
  const formattedText = formatVerificationStatusText(status);

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
      <IconComponent className={`mr-1.5 h-4 w-4 ${iconClass}`} />
      <span className={textClass}>{formattedText}</span>
    </div>
  );
};

export default function ManageCompaniesPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [companies, setCompanies] = useState<UserCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        router.push('/auth/login');
        return;
      }
      setUserId(session.user.id);
    };
    fetchSession();
  }, [supabase, router]);

  useEffect(() => {
    if (!userId) return; // Don't fetch companies if userId is not set

    const fetchCompanies = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // get_user_companies now returns SETOF companies_view based on our migrations
        const { data, error: rpcError } = await supabase.rpc('get_user_companies', {
          p_user_id: userId, // Ensure param name matches the function definition
        })

        if (rpcError) throw rpcError
        setCompanies(data as UserCompany[] || [])
      } catch (e: any) {
        console.error('Error fetching companies:', e)
        setError(e.message || 'Failed to fetch companies.')
        setCompanies([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanies()
  }, [userId, supabase])

  if (isLoading && !error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">Manage Your Companies</h1>
        <p className="text-gray-600">Loading your companies...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">Manage Your Companies</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4 sm:mb-0">Manage Your Companies</h1>
        <Link href="/company/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          <PlusCircleIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Create New Company
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new company.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id} className="bg-white shadow-lg rounded-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 ease-in-out">
              <div className="p-5">
                <div className="flex items-center mb-4">
                  {company.avatar_url ? (
                    <Image src={company.avatar_url} alt={company.name} width={48} height={48} className="rounded-full mr-4" />
                  ) : (
                    <BuildingOffice2Icon className="h-12 w-12 text-gray-300 mr-4 p-2 bg-gray-100 rounded-full" aria-hidden="true" />
                  )}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 truncate" title={company.name}>{company.name}</h2>
                    <VerificationBadge status={company.verification_status} />
                  </div>
                </div>
                {/* Optionally display more info like description here */}
                {/* <p className="text-gray-600 text-sm mb-4 truncate">{company.description || 'No description'}</p> */}
                <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  {(company.verification_status === 'UNVERIFIED' || company.verification_status === 'TIER1_REJECTED') && (
                    <Link 
                      href={`/company/${company.id}/apply-for-verification`}
                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 w-full sm:w-auto"
                    >
                      Apply for Tier 1 Verification
                    </Link>
                  )}
                  {company.verification_status === 'TIER1_VERIFIED' && (
                    <Link
                      href={`/company/${company.id}/apply-for-tier2-verification`}
                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto"
                    >
                      Apply for Tier 2 Verification ⭐
                    </Link>
                  )}
                  <Link href={`/company/${company.id}/edit`}
                    className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 w-full sm:w-auto">
                    <PencilSquareIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                    Edit Company
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
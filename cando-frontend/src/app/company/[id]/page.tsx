'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useParams } from 'next/navigation'
// import CompanyForm from '@/components/company/CompanyForm' // Removed
import type { Database } from '@/types/supabase'
import Link from 'next/link'
import Image from 'next/image' // For avatar and banner
import { User } from '@supabase/supabase-js' // For session user type
import { Analytics } from '@/lib/analytics'; // Import Analytics
import CompanyConnectButton from '@/components/connections/CompanyConnectButton'; // Added
import toast from 'react-hot-toast'; // Added for notifications
import { BellIcon, NoSymbolIcon, UserMinusIcon, UserPlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'; // Added Cog6ToothIcon

// Define a type for the company data we expect from the view
type CompanyProfileView = Database['public']['Views']['companies_view']['Row'];
// Define a type for company user roles for fetching acting company
type CompanyUserRole = Database['public']['Tables']['company_users']['Row'];

interface CompanyPageProps {
  params: {
    id: string
  }
}

export default function CompanyProfilePage({ params }: CompanyPageProps) {
  const router = useRouter();
  const paramsFromHook = useParams(); // Use this if params prop isn't passed directly
  const companyId = params.id || paramsFromHook?.id as string;

  const supabase = createClientComponentClient<Database>();
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<CompanyProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [actingCompanyId, setActingCompanyId] = useState<string | null>(null); // Added
  
  // New state for follow functionality
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isCurrentUserAdminOfThisCompany, setIsCurrentUserAdminOfThisCompany] = useState(false); // New state

  const fetchCompanyData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: companyData, error: fetchError } = await supabase
        .from('companies_view')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch company data: ${fetchError.message}`);
      }
      if (!companyData) {
        throw new Error('Company not found.');
      }
      setCompany(companyData);
    } catch (e: any) {
      console.error('Error loading company:', e);
      setError(e.message || 'An unexpected error occurred.');
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user ?? null);
    return session?.user ?? null; // Return user for chaining
  }, [supabase]);

  const fetchActingCompanyId = useCallback(async (user: User) => {
    if (!user) return;
    try {
      const { data: companyUsers, error: companyUsersError } = await supabase
        .from('company_users')
        .select('company_id, role')
        .eq('user_id', user.id)
        .in('role', ['OWNER', 'ADMIN']); // User is owner or admin

      if (companyUsersError) {
        console.error('Error fetching user company admin roles:', companyUsersError);
        // Don't throw, just means connect button might not show if we can't determine acting company
        setActingCompanyId(null);
        return;
      }

      if (companyUsers && companyUsers.length > 0) {
        setActingCompanyId(companyUsers[0].company_id); // Use the first company they are admin of
      } else {
        setActingCompanyId(null); // User is not an admin of any company
      }
    } catch (e) {
      console.error('Exception in fetchActingCompanyId:', e);
      setActingCompanyId(null);
    }
  }, [supabase]);

  // New function to fetch follow status
  const fetchFollowStatus = useCallback(async (targetCompanyId: string) => {
    if (!targetCompanyId) return;
    setFollowLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_company_follow_status', {
        p_company_id: targetCompanyId,
      } as { p_company_id: string });
      if (error) throw error;
      setIsFollowing(data || false);
    } catch (err) {
      console.error('Error fetching follow status:', err);
      // Do not toast error here as it might be too intrusive on page load
    } finally {
      setFollowLoading(false);
    }
  }, [supabase]);

  // New function to check if current user is admin of THIS company profile
  const checkIfCurrentUserIsAdmin = useCallback(async (companyId: string, userId: string) => {
    if (!supabase || !userId || !companyId) return;
    try {
      const { data, error } = await supabase.rpc('check_if_user_is_company_admin', {
        p_target_company_id: companyId,
        p_user_id_to_check: userId,
      });
      if (error) throw error;
      setIsCurrentUserAdminOfThisCompany(data || false);
    } catch (err) {
      console.error('Error checking admin status for current company profile:', err);
      setIsCurrentUserAdminOfThisCompany(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData(companyId);
      fetchCurrentUser().then(user => {
        if (user) {
          fetchActingCompanyId(user); // For connect button (acting as another company)
          fetchFollowStatus(companyId); // Adjusted call: only pass companyId
          checkIfCurrentUserIsAdmin(companyId, user.id); // For Manage Connections link
        }
      });
    } else {
      setError("No company ID provided.");
      setIsLoading(false);
    }
  }, [companyId, fetchCompanyData, fetchCurrentUser, fetchActingCompanyId, fetchFollowStatus, checkIfCurrentUserIsAdmin]);

  useEffect(() => {
    if (currentUser && company && companyId) {
      Analytics.trackCompanyView(currentUser.id, companyId);
    }
  }, [currentUser, company, companyId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Loading company profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-red-500">Error: {error}</p>
        <div className="mt-4 text-center">
          <Link href="/feed" className="text-primary-600 hover:text-primary-800">
            Go to Feed
          </Link>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Company not found.</p>
         <div className="mt-4 text-center">
          <Link href="/feed" className="text-primary-600 hover:text-primary-800">
            Go to Feed
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && company && currentUser.id === company.owner_id;

  // New function to handle follow/unfollow toggle
  const handleFollowToggle = async () => {
    if (!currentUser || !companyId) {
      toast.error('You must be logged in to follow a company.');
      return;
    }
    if (isOwner) {
      toast('You cannot follow your own company.');
      return;
    }

    setFollowLoading(true);
    // Ensure companyName is robustly a string for toast messages
    let companyNameToDisplay = 'this company';
    if (company && company.name) {
      companyNameToDisplay = company.name;
    }

    try {
      if (isFollowing) {
        const { error: unfollowError } = await supabase.rpc('unfollow_company', {
          p_company_id: companyId,
        });
        if (unfollowError) throw unfollowError;
        setIsFollowing(false);
        toast.success(`Unfollowed ${companyNameToDisplay}`);
      } else {
        const { error: followError } = await supabase.rpc('follow_company', {
          p_company_id: companyId,
        });
        if (followError) throw followError;
        setIsFollowing(true);
        toast.success(`Following ${companyNameToDisplay}`);
      }
      // Optionally: update follower count if displayed on page, or refetch company data if it includes follower_count
    } catch (err: any) {
      console.error('Error toggling follow status:', err);
      toast.error(err.message || 'Failed to update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Callback for CompanyConnectButton to handle status changes if needed
  const handleCompanyConnectionStatusChange = (newStatus: string, targetId: string) => {
    console.log(`Company connection status with ${targetId} changed to ${newStatus}`);
    // Potentially refresh parts of the page or show notifications
  };

  // Helper to display array data
  const renderArrayField = (label: string, items: readonly string[] | null | undefined) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">
          <ul className="list-disc list-inside">
            {items.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </dd>
      </div>
    );
  };
  
  // Helper to display social media links
  const renderSocialMediaLinks = (links: any | null | undefined) => { // Type 'any' for now, assuming JSONB structure {platform: string, url: string}[]
    if (!links || !Array.isArray(links) || links.length === 0) return null;
    return (
      <div>
        <dt className="text-sm font-medium text-gray-500">Social Media</dt>
        <dd className="mt-1 text-sm text-gray-900">
          <ul className="space-y-1">
            {links.map((link: { platform?: string; url?: string }, index: number) => (
              link.url && (
                <li key={index}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 underline">
                    {link.platform || link.url}
                  </a>
                </li>
              )
            ))}
          </ul>
        </dd>
      </div>
    );
  };


  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Banner Image - REMOVED FOR MVP */}
      {/* {company.banner_url && (
        <div className="mb-6 h-48 md:h-64 rounded-lg overflow-hidden relative bg-gray-200">
          <Image src={company.banner_url} alt={`${company.name || 'Company'} banner`} layout="fill" objectFit="cover" />
        </div>
      )} */}

      {/* Verification Banners - Placed here */}
      {isOwner && companyId && (company.verification_status === 'UNVERIFIED' || company.verification_status === 'TIER1_REJECTED') && (
        <div className="mb-6 p-4 border border-blue-300 bg-blue-50 rounded-md">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">Company Verification</h2>
          <p className="text-sm text-blue-600 mb-3">
            This company is currently <strong>{company.verification_status?.toLowerCase().replace(/_/g, ' ')}</strong>. 
            Complete the verification process to enhance trust and unlock more features.
          </p>
          <Link 
            href={`/company/${companyId}/apply-for-verification`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Apply for Tier 1 Verification
          </Link>
        </div>
      )}

      {isOwner && companyId && company.verification_status === 'TIER1_VERIFIED' && (
        <div className="mb-6 p-4 border border-green-300 bg-green-50 rounded-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-green-700">🌟 Tier 1 Verified!</h2>
            {/* Placeholder for a badge or icon if available */}
          </div>
          <p className="text-sm text-green-600 mt-1 mb-3">
            Congratulations! This company is Tier 1 Verified. 
            Apply for Tier 2 Verification for the highest level of trust and a &quot;Fully Verified Business&quot; badge.
          </p>
          <Link 
            href={`/company/${companyId}/apply-for-tier2-verification`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Apply for Tier 2 Verification
          </Link>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-4">
              {company.avatar_url && (
                <div className="flex-shrink-0 h-20 w-20 rounded-md overflow-hidden bg-gray-100">
                  <Image src={company.avatar_url} alt={`${company.name || 'Company'} logo`} width={80} height={80} className="object-contain" />
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            </div>
            {company.industry && <p className="mt-1 max-w-2xl text-sm text-gray-500">{company.industry}</p>}
          </div>
          <div className="flex flex-wrap items-center space-x-2 mt-2 sm:mt-0">
            {/* Follow/Unfollow Button */}
            {currentUser && !isOwner && companyId && (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`inline-flex items-center justify-center px-3 py-2 mb-2 sm:mb-0 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${isFollowing 
                    ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500' 
                    : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'} 
                  ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {followLoading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : isFollowing ? (
                  <NoSymbolIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                ) : (
                  <BellIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                )}
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {/* Company Connect Button */}
            {currentUser && actingCompanyId && companyId && actingCompanyId !== companyId && (
                <CompanyConnectButton 
                  actingCompanyId={actingCompanyId}
                  targetCompanyId={companyId}
                  currentUser={currentUser}
                  onStatusChange={handleCompanyConnectionStatusChange}
                  // Add mb-2 sm:mb-0 for consistent spacing if it becomes a flex column on small screens
                  // className="mb-2 sm:mb-0"
                />
              ) 
            }
            {/* Edit Profile and Manage Connections for Admins/Owners */}
            {isCurrentUserAdminOfThisCompany && companyId && (
              <>
                <Link 
                  href={`/company/${companyId}/edit`} 
                  className="inline-flex items-center px-3 py-2 mb-2 sm:mb-0 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Edit Profile
                </Link>
                <Link 
                  href={`/company/${companyId}/connections`} 
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Cog6ToothIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Manage Connections
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            {/* ADDED: Owner Information Display */}
            {company.owner_id && (company.owner_name || company.owner_avatar_url) && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Owned by</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <Link href={`/users/${company.owner_id}`} className="flex items-center space-x-3 group">
                    {company.owner_avatar_url ? (
                      <Image 
                        src={company.owner_avatar_url} 
                        alt={company.owner_name || 'Owner avatar'} 
                        width={32} 
                        height={32} 
                        className="h-8 w-8 rounded-full object-cover group-hover:ring-2 group-hover:ring-primary-500"
                      />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs group-hover:ring-2 group-hover:ring-primary-500">
                        {company.owner_name ? company.owner_name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                    <span className="font-medium group-hover:underline group-hover:text-primary-600">
                      {company.owner_name || 'View Profile'}
                    </span>
                  </Link>
                </dd>
              </div>
            )}
            {company.description && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-line">{company.description}</dd>
              </div>
            )}
            {company.website && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 underline">
                    {company.website}
                  </a>
                </dd>
              </div>
            )}
            {/* REMOVED non-MVP fields: year_founded, business_type, employee_count, revenue_range */}
            {/* REMOVED non-MVP fields: Address Section */}
            {/* REMOVED non-MVP fields: Contact Section */}
            {/* REMOVED non-MVP fields: services, certifications, tags */}
            {/* REMOVED non-MVP fields: social_media_links */}
          </dl>
        </div>
      </div>
    </div>
  );
} 
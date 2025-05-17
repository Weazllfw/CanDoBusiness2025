'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useParams } from 'next/navigation'
// import CompanyForm from '@/components/company/CompanyForm' // Removed
import type { Database } from '@/types/supabase'
import Link from 'next/link'
import Image from 'next/image' // For avatar and banner
import { User } from '@supabase/supabase-js' // For session user type

// Define a type for the company data we expect from the view
type CompanyProfileView = Database['public']['Views']['companies_view']['Row'];

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
  }, [supabase]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData(companyId);
      fetchCurrentUser();
    } else {
      setError("No company ID provided.");
      setIsLoading(false);
    }
  }, [companyId, fetchCompanyData, fetchCurrentUser]);

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
      {/* Banner Image */}
      {company.banner_url && (
        <div className="mb-6 h-48 md:h-64 rounded-lg overflow-hidden relative bg-gray-200">
          <Image src={company.banner_url} alt={`${company.name || 'Company'} banner`} layout="fill" objectFit="cover" />
        </div>
      )}

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
          <h2 className="text-lg font-semibold text-green-700 mb-2">🌟 Tier 1 Verified!</h2>
          <p className="text-sm text-green-600 mb-3">
            Congratulations! This company is Tier 1 Verified. 
            Apply for Tier 2 Verification for the highest level of trust and a "Fully Verified Business" badge.
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
          {isOwner && (
            <Link 
              href={`/company/${company.id}/edit`} 
              className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Edit Profile
            </Link>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
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
             {company.year_founded && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Year Founded</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{company.year_founded}</dd>
              </div>
            )}
            {company.business_type && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{company.business_type}</dd>
              </div>
            )}
            {company.employee_count && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Employee Count</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{company.employee_count}</dd>
              </div>
            )}
            {company.revenue_range && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Revenue Range</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{company.revenue_range}</dd>
              </div>
            )}

            {/* Address Section */}
            {(company.street_address || company.city || company.province || company.postal_code || company.metro_area) && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {company.street_address && <div>{company.street_address}</div>}
                  <div>
                    {company.city && <span>{company.city}{company.province ? ', ' : ''}</span>}
                    {company.province && <span>{company.province} </span>}
                    {company.postal_code && <span>{company.postal_code}</span>}
                  </div>
                  {company.metro_area && <div>Metropolitan Area: {company.metro_area === 'OTHER' ? company.other_metro_specify : company.metro_area}</div>}
                </dd>
              </div>
            )}
            
            {/* Contact Section */}
             {(company.contact_name || company.contact_email || company.contact_phone) && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Contact</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {company.contact_name && <p>{company.contact_name}</p>}
                  {company.contact_email && <p><a href={`mailto:${company.contact_email}`} className="text-primary-600 hover:text-primary-800">{company.contact_email}</a></p>}
                  {company.contact_phone && <p>{company.contact_phone}</p>}
                </dd>
              </div>
            )}
            
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              {renderArrayField("Services Offered", company.services)}
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              {renderArrayField("Certifications", company.certifications)}
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              {renderArrayField("Tags/Keywords", company.tags)}
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
             {renderSocialMediaLinks(company.social_media_links)}
            </div>
            
            {/* Verification Status Display */}
            {company.verification_tier && (
                 <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Verification Status</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            company.verification_tier?.includes('VERIFIED') ? 'bg-green-100 text-green-800' :
                            company.verification_tier?.includes('PENDING') ? 'bg-yellow-100 text-yellow-800' :
                            company.verification_tier?.includes('REJECTED') ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {company.verification_tier?.replace('_', ' ') || company.verification_status?.replace('_', ' ') || 'Not Verified'}
                        </span>
                        {(company.verification_tier === 'UNVERIFIED' || company.verification_tier === 'TIER1_REJECTED') && isOwner && (
                            <Link href={`/company/${company.id}/apply-for-verification`} className="ml-4 text-sm text-primary-600 hover:text-primary-800">
                                Apply for Tier 1
                            </Link>
                        )}
                        {company.verification_tier === 'TIER1_VERIFIED' && isOwner && (
                             <Link href={`/company/${company.id}/apply-for-tier2-verification`} className="ml-4 text-sm text-primary-600 hover:text-primary-800">
                                Apply for Tier 2
                            </Link>
                        )}
                    </dd>
                </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
} 
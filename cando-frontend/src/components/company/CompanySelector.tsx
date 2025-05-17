'use client'

import { Fragment, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Menu, Transition } from '@headlessui/react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronDownIcon,
  BuildingOffice2Icon,
  PlusCircleIcon,
  CheckIcon as CheckIcon20 // Renaming to avoid conflict if CheckIcon from 24/solid is preferred
} from '@heroicons/react/20/solid'
import {
  CheckBadgeIcon,     // Tier 1 Verified
  ShieldCheckIcon,    // Tier 2 Fully Verified
  ClockIcon,          // Pending statuses
  XCircleIcon,        // Rejected statuses
  QuestionMarkCircleIcon, // Unverified or other
  CheckIcon // For the selected item indicator in dropdown
} from '@heroicons/react/24/solid' // Using solid for badges
import type { Database } from '@/types/supabase'

// Define the structure for a company object, similar to UserCompanyPage
interface Company {
  id: string | null; // Allow id to be null initially as per RPC typings
  name: string | null; // Also allow name to be null for robustness
  avatar_url?: string | null;
  verification_status?: string | null; // Made optional to handle cases where it might be missing
}

interface CompanySelectorProps {
  currentUserId: string;
  // Callback to inform parent about company selection. 
  // For a more global state, this would interact with Context/Zustand.
  onCompanySelected?: (companyId: string | null) => void; 
}

// Helper function to get badge properties based on verification status
const getVerificationBadge = (status?: string | null) => {
  if (!status) {
    return { Icon: QuestionMarkCircleIcon, color: 'text-gray-400', title: 'Status Unknown' };
  }
  switch (status) {
    case 'UNVERIFIED':
      return { Icon: QuestionMarkCircleIcon, color: 'text-gray-400', title: 'Unverified' };
    case 'TIER1_PENDING':
      return { Icon: ClockIcon, color: 'text-yellow-500', title: 'Tier 1 Pending' };
    case 'TIER1_VERIFIED':
      return { Icon: CheckBadgeIcon, color: 'text-green-500', title: 'Tier 1 Verified' };
    case 'TIER1_REJECTED':
      return { Icon: XCircleIcon, color: 'text-red-500', title: 'Tier 1 Rejected' };
    case 'TIER2_PENDING':
      return { Icon: ClockIcon, color: 'text-blue-500', title: 'Tier 2 Pending' }; // Different color for Tier 2 pending
    case 'TIER2_FULLY_VERIFIED':
      return { Icon: ShieldCheckIcon, color: 'text-green-600', title: 'Tier 2 Fully Verified' };
    case 'TIER2_REJECTED':
      return { Icon: XCircleIcon, color: 'text-red-600', title: 'Tier 2 Rejected' };
    default:
      return { Icon: QuestionMarkCircleIcon, color: 'text-gray-400', title: status };
  }
};

export default function CompanySelector({ currentUserId, onCompanySelected }: CompanySelectorProps) {
  const supabase = createClientComponentClient<Database>()
  const [userCompanies, setUserCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      setUserCompanies([]);
      setSelectedCompany(null); // Clear selected company if no user
      return;
    }

    const fetchUserCompanies = async () => {
      setIsLoading(true);
      try {
        // The RPC call with the corrected 'user_id_param'
        const { data: rpcData, error } = await supabase.rpc('get_user_companies', { user_id_param: currentUserId });
        if (error) throw error;

        // Filter out any companies that might have a null id or name, and cast to Company[]
        const companies: Company[] = (rpcData || [])
          .filter(c => c.id !== null && c.name !== null) 
          .map(c => ({
            id: c.id as string, // Now we can safely cast id to string
            name: c.name as string, // Safely cast name to string
            avatar_url: c.avatar_url,
            verification_status: c.verification_status,
          }));

        setUserCompanies(companies);
        
        if (companies.length > 0) {
          const storedCompanyId = localStorage.getItem(`selectedCompany_${currentUserId}`);
          const previouslySelected = companies.find(c => c.id === storedCompanyId);

          if (previouslySelected) {
            setSelectedCompany(previouslySelected);
            if (onCompanySelected && previouslySelected.id) onCompanySelected(previouslySelected.id);
          } else if (!selectedCompany) {
            setSelectedCompany(companies[0]);
            if (onCompanySelected && companies[0].id) {
                onCompanySelected(companies[0].id);
            localStorage.setItem(`selectedCompany_${currentUserId}`, companies[0].id);
            }
          }
        } else {
          setSelectedCompany(null);
          if (onCompanySelected) onCompanySelected(null);
          localStorage.removeItem(`selectedCompany_${currentUserId}`);
        }
      } catch (e) {
        console.error("Error fetching user companies:", e);
        setUserCompanies([]);
        setSelectedCompany(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCompanies();
  // selectedCompany removed from deps to avoid potential loops if onCompanySelected causes re-renders.
  // localStorage logic will handle re-selection on mount.
  }, [currentUserId, supabase, onCompanySelected]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    if (onCompanySelected) {
      // Ensure company.id is not null before calling
      if (company.id) onCompanySelected(company.id);
      else onCompanySelected(null); // Or handle error/default
    }
    if (currentUserId && company.id) { // Save selection to localStorage only if id is not null
      localStorage.setItem(`selectedCompany_${currentUserId}`, company.id);
    }
  };
  
  const SelectedCompanyBadge = selectedCompany && selectedCompany.name // Ensure name is also checked
                             ? getVerificationBadge(selectedCompany.verification_status) 
                             : null;

  if (isLoading && !selectedCompany) { // Show loading only if no company is selected yet
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300">
        <BuildingOffice2Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Menu as="div" className="relative w-full md:w-64"> {/* Adjusted width for responsiveness */}
      <Menu.Button className="flex items-center justify-between w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-gray-800">
        <span className="flex items-center flex-grow truncate"> {/* Use flex-grow to push Chevron to the end */}
          {/* Leading Icon: Avatar or Default Building Icon */}
          {selectedCompany && selectedCompany.avatar_url ? (
            <Image 
              src={selectedCompany.avatar_url} 
              alt={selectedCompany.name ? selectedCompany.name : 'Company'} 
              width={20} height={20} 
              className="rounded-full mr-2 flex-shrink-0" 
            />
          ) : (
            // Show BuildingOffice2Icon if no avatar OR if no company is selected yet (good default)
            <BuildingOffice2Icon 
              className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" 
              aria-hidden="true" 
            />
          )}

          {/* Company Name or Placeholder Text */}
          <span className="truncate mr-2"> {/* mr-2 for spacing before badge */}
            {selectedCompany && selectedCompany.name ? selectedCompany.name : 'Select Company'}
          </span>

          {/* Verification Badge (shown only if a company is selected and badge exists) */}
          {selectedCompany && SelectedCompanyBadge && (
            <SelectedCompanyBadge.Icon 
              className={`h-5 w-5 ${SelectedCompanyBadge.color} flex-shrink-0`} 
              title={SelectedCompanyBadge.title} 
            />
          )}
        </span>
        <ChevronDownIcon className="h-5 w-5 text-gray-400 ml-1 flex-shrink-0" aria-hidden="true" />
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
        <Menu.Items className="absolute right-0 z-30 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {isLoading && userCompanies.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-500">Loading companies...</div>
            )}
            {!isLoading && userCompanies.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500">No companies found.</div>
            )}
            {userCompanies.map((company) => {
              // Skip rendering if company.id or company.name is null
              if (!company.id || !company.name) return null; 
              const ItemBadge = getVerificationBadge(company.verification_status);
              return (
                <Menu.Item key={company.id}>
                  {({ active }) => (
                    <button
                      onClick={() => handleSelectCompany(company)}
                      className={`group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {company.avatar_url ? (
                         <Image src={company.avatar_url} alt={company.name!} width={20} height={20} className="rounded-full mr-2 flex-shrink-0" />
                      ) : (
                         <ItemBadge.Icon className={`h-5 w-5 ${ItemBadge.color} mr-2 flex-shrink-0 group-hover:opacity-80`} title={ItemBadge.title} />
                      )}
                      <span className="truncate flex-grow">{company.name}</span>
                      {/* Badge icon is now primary, text status removed to avoid clutter */}
                      {company.id === selectedCompany?.id && (
                          <CheckIcon className="ml-auto h-5 w-5 text-primary-600 flex-shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              );
            })}
            <div className="border-t border-gray-100 my-1" />
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/company/new"
                  className={`group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <PlusCircleIcon className="mr-2 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  Create New Company
                </Link>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/companies"
                  className={`group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <BuildingOffice2Icon className="mr-2 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  Manage Companies
                </Link>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
} 
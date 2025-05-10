'use client'

import { Fragment, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Menu, Transition } from '@headlessui/react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDownIcon, BuildingOffice2Icon, PlusCircleIcon } from '@heroicons/react/20/solid' // Using solid icons
import type { Database } from '@/types/supabase'

// Define the structure for a company object, similar to UserCompanyPage
interface Company {
  id: string;
  name: string;
  avatar_url?: string | null;
  verification_status?: string; // Optional, for display if available
}

interface CompanySelectorProps {
  currentUserId: string;
  // Callback to inform parent about company selection. 
  // For a more global state, this would interact with Context/Zustand.
  onCompanySelected?: (companyId: string | null) => void; 
}

export default function CompanySelector({ currentUserId, onCompanySelected }: CompanySelectorProps) {
  const supabase = createClientComponentClient<Database>()
  const [userCompanies, setUserCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      setUserCompanies([]);
      return;
    }

    const fetchUserCompanies = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_user_companies', { p_user_id: currentUserId });
        if (error) throw error;
        setUserCompanies(data || []);
        // Auto-select the first company if none is selected yet and companies exist
        // Or load from localStorage/global state in a more advanced setup
        if (data && data.length > 0 && !selectedCompany) {
          setSelectedCompany(data[0]);
          if (onCompanySelected) {
            onCompanySelected(data[0].id);
          }
        }
      } catch (e) {
        console.error("Error fetching user companies:", e);
        setUserCompanies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCompanies();
  }, [currentUserId, supabase, onCompanySelected, selectedCompany]); // Added selectedCompany to deps to avoid re-selecting if already set

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    if (onCompanySelected) {
      onCompanySelected(company.id);
    }
    // In a global state setup, you'd dispatch an action here.
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700">
        <BuildingOffice2Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        <span>Loading Companies...</span>
      </div>
    );
  }

  const getStatusIndicator = (status?: string) => {
    if (!status) return '';
    let color = 'text-gray-500';
    let text = status.charAt(0).toUpperCase() + status.slice(1);
    switch (status) {
      case 'unverified':
        color = 'text-yellow-500';
        text = 'Unverified';
        break;
      case 'pending':
        color = 'text-blue-500';
        text = 'Pending Review';
        break;
      case 'verified':
        color = 'text-green-500';
        text = 'Verified';
        break;
      case 'rejected':
        color = 'text-red-500';
        text = 'Rejected';
        break;
    }
    return <span className={`ml-2 text-xs font-normal ${color}`}>({text})</span>;
  };

  return (
    <Menu as="div" className="relative w-full">
      <Menu.Button className="flex items-center justify-between w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
        <span className="flex items-center truncate">
          {selectedCompany && selectedCompany.avatar_url ? (
            <Image src={selectedCompany.avatar_url} alt={selectedCompany.name} width={20} height={20} className="rounded-full mr-2 flex-shrink-0" />
          ) : (
            <BuildingOffice2Icon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">
            {selectedCompany ? selectedCompany.name : 'Select Company'}
          </span>
          {selectedCompany && getStatusIndicator(selectedCompany.verification_status)}
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
        <Menu.Items className="absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {userCompanies.length === 0 && !isLoading && (
              <div className="px-4 py-2 text-sm text-gray-500">No companies found.</div>
            )}
            {userCompanies.map((company) => (
              <Menu.Item key={company.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleSelectCompany(company)}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    {company.avatar_url ? (
                       <Image src={company.avatar_url} alt={company.name} width={20} height={20} className="rounded-full mr-2 flex-shrink-0" />
                    ) : (
                       <BuildingOffice2Icon className="h-5 w-5 text-gray-400 mr-2 group-hover:text-gray-500 flex-shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{company.name}</span>
                    {getStatusIndicator(company.verification_status)}
                    {company.id === selectedCompany?.id && (
                        <svg className="ml-auto h-5 w-5 text-primary-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                           <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/company/new" // Corrected path from earlier discussion
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  <PlusCircleIcon className="mr-2 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  Create New Company
                </Link>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/companies" // Corrected path
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
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
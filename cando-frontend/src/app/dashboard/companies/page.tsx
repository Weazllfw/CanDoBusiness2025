'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { DashboardLayout } from '@/components/layout'
import { CompanyForm } from './CompanyForm'
import { UserRoleManagement } from './UserRoleManagement'
import { cn } from '@/lib/utils'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function CompanyManagementPage() {
  const { currentCompany, companies, isLoading } = useCompany()
  const [activeTab, setActiveTab] = useState<'details' | 'users' | 'settings'>('details')
  const router = useRouter()
  const searchParams = useSearchParams()
  const showWelcome = searchParams?.get('onboarded') === 'true'

  const handleCreateNew = () => {
    router.push('/dashboard/companies/new')
  }

  const handleDismissWelcome = () => {
    router.replace('/dashboard/companies')
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 w-1/3 bg-gray-200 rounded mb-6" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    )
  }

  // Show welcome screen for newly created company
  if (showWelcome && currentCompany) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-900/5 p-8">
            <div className="text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 text-2xl font-semibold text-gray-900">
                Welcome to {currentCompany.name}!
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Your company has been created successfully. Here are some next steps to get started:
              </p>
            </div>

            <div className="mt-8 space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Invite your team</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add team members and assign roles to collaborate effectively.
                  </p>
                  <button
                    onClick={() => {
                      handleDismissWelcome()
                      setActiveTab('users')
                    }}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 inline-flex items-center"
                  >
                    Manage team members
                    <ArrowRightIcon className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Complete your profile</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add more details about your company to help others find and connect with you.
                  </p>
                  <button
                    onClick={() => {
                      handleDismissWelcome()
                      setActiveTab('details')
                    }}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 inline-flex items-center"
                  >
                    Update company details
                    <ArrowRightIcon className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CogIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Configure settings</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Customize your company preferences and notification settings.
                  </p>
                  <button
                    onClick={() => {
                      handleDismissWelcome()
                      setActiveTab('settings')
                    }}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 inline-flex items-center"
                  >
                    Go to settings
                    <ArrowRightIcon className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handleDismissWelcome}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Skip intro and continue to dashboard
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Case: User has no companies at all
  if (!isLoading && companies.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No companies yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first company profile.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Create Company
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Case: Companies exist, but none is selected as current
  if (!currentCompany) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a company from the dropdown or create a new one.
          </p>
          <div className="mt-6">
             <button
               type="button"
               onClick={handleCreateNew}
               className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
             >
               <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
               Create New Company
             </button>
           </div>
        </div>
      </DashboardLayout>
    )
  }

  // Case: A company is selected
  const tabs = [
    { id: 'details', name: 'Company Details', icon: BuildingOfficeIcon },
    { id: 'users', name: 'Users & Roles', icon: UserGroupIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentCompany.name}
            </h1>
            {currentCompany.trading_name && (
              <p className="mt-1 text-sm text-gray-500">
                Trading as {currentCompany.trading_name}
              </p>
            )}
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <PlusIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
              Add New Company
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  tab.id === activeTab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium'
                )}
              >
                <tab.icon
                  className={cn(
                    tab.id === activeTab ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                    '-ml-0.5 mr-2 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Panels */}
        <div className="mt-6">
          {activeTab === 'details' && (
            <CompanyForm company={currentCompany} />
          )}
          {activeTab === 'users' && (
            <UserRoleManagement companyId={currentCompany.id} />
          )}
          {activeTab === 'settings' && (
            <div className="text-sm text-gray-500">
              Company settings coming soon...
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 
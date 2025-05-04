'use client'

import { useState } from 'react'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { DashboardLayout } from '@/components/layout'
import { CompanyForm } from './CompanyForm'
import { UserRoleManagement } from './UserRoleManagement'
import { cn } from '@/lib/utils'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

export default function CompanyManagementPage() {
  const { currentCompany, isLoading } = useCompany()
  const [activeTab, setActiveTab] = useState<'details' | 'users' | 'settings'>('details')

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

  if (!currentCompany) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a company from the dropdown to manage it.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  const tabs = [
    { id: 'details', name: 'Company Details', icon: BuildingOfficeIcon },
    { id: 'users', name: 'Users & Roles', icon: UserGroupIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
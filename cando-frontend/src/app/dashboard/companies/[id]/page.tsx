'use client';

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/types/database.types'
import type { CompanyWithMeta } from '@/lib/types/company'
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  CogIcon,
  ShieldCheckIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { CompanyForm } from '../CompanyForm'
import { UserRoleManagement } from '../UserRoleManagement'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function CompanyManagementPage() {
  const params = useParams()
  const companyId = params.id as string
  const [activeTab, setActiveTab] = useState<'details' | 'users' | 'settings'>('details')
  const { companies, isLoading } = useCompany()
  const [company, setCompany] = useState<CompanyWithMeta | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchCompanyData = async () => {
      // Find company in context first
      const contextCompany = companies.find(c => c.id === companyId)
      if (contextCompany) {
        setCompany(contextCompany)
        setIsOwner(contextCompany.role === 'owner')
        return
      }

      // Fallback to direct fetch if not in context
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) {
        console.error('Error fetching company:', companyError)
        return
      }

      const { data: roleData, error: roleError } = await supabase
        .from('company_users')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (roleError) {
        console.error('Error fetching role:', roleError)
        return
      }

      setCompany(companyData)
      setIsOwner(roleData.role === 'owner')
    }

    fetchCompanyData()
  }, [companyId, companies, supabase])

  if (isLoading || !company) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 w-1/3 bg-gray-200 rounded mb-6" />
          <div className="h-64 bg-gray-200 rounded" />
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
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {company.name}
            </h1>
            {company.trading_name && (
              <p className="mt-1 text-sm text-gray-500">
                Trading as {company.trading_name}
              </p>
            )}
            <div className="mt-1 flex items-center">
              {company.verification_status === 'verified' ? (
                <div className="flex items-center text-green-600">
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span className="ml-1 text-sm">Verified Business</span>
                </div>
              ) : isOwner ? (
                <Link
                  href={`/dashboard/companies/${companyId}/verify`}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <ShieldCheckIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  Verify Business
                </Link>
              ) : null}
            </div>
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
            <CompanyForm company={company} />
          )}
          {activeTab === 'users' && (
            <UserRoleManagement companyId={company.id} />
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
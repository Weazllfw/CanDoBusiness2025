'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { MagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { usePublicCompanies } from '@/lib/hooks/usePublicCompanies'
import { CompanyDetailsModal } from '@/components/common/CompanyDetailsModal'
import { useToast } from '@/components/common/Toast'
import Link from 'next/link'
import type { Database } from '@/lib/types/database.types'

type PublicCompany = Database['public']['Views']['public_companies']['Row']

export default function CompanyDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { companies, isLoading, error } = usePublicCompanies()
  const [selectedCompany, setSelectedCompany] = useState<PublicCompany | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { showToast } = useToast()

  // Filter companies based on search query
  const filteredCompanies = companies.filter(company => 
    !searchQuery || 
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.trading_name && company.trading_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCompanyClick = (company: PublicCompany) => {
    setSelectedCompany(company)
    setIsModalOpen(true)
  }

  const handleConnect = (companyId: string) => {
    // Placeholder for connect functionality
    showToast({
      title: 'Coming Soon',
      message: 'The ability to connect with companies will be available soon.',
      type: 'info'
    })
  }

  const handleMessage = (companyId: string) => {
    // Placeholder for message functionality
    showToast({
      title: 'Coming Soon',
      message: 'The messaging feature will be available soon.',
      type: 'info'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Directory</h1>
          <p className="mt-2 text-sm text-gray-500">
            Browse and connect with businesses on the platform.
          </p>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg">
          <label htmlFor="search" className="sr-only">
            Search companies
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              name="search"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Search companies..."
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading companies</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Company List */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No companies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Check back later for new companies'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleCompanyClick(company)}
                className="text-left group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex flex-1 flex-col space-y-4 p-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                      <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {company.name}
                        {company.is_verified && (
                          <ShieldCheckIcon className="inline-block ml-1 h-4 w-4 text-green-500" aria-label="Verified" />
                        )}
                      </p>
                      {company.trading_name && (
                        <p className="text-sm text-gray-500 line-clamp-1">
                          Trading as {company.trading_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {(company.city || company.province) && (
                    <p className="text-sm text-gray-500">
                      {[company.city, company.province].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {/* Tags */}
                  {company.industry_tags && company.industry_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {company.industry_tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {company.industry_tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                          +{company.industry_tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Company Details Modal */}
        <CompanyDetailsModal
          company={selectedCompany}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConnect={handleConnect}
          onMessage={handleMessage}
        />
      </div>
    </DashboardLayout>
  )
} 
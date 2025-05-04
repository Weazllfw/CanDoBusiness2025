'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { MagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import type { CompanyWithMeta } from '@/lib/types/company'
import { useCompany } from '@/lib/contexts/CompanyContext'
import Link from 'next/link'

export default function CompanyDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { companies, isLoading } = useCompany()

  // Filter companies based on search query only
  const filteredCompanies = companies.filter(company => 
    !searchQuery || company.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

        {/* Company List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-100 rounded-lg" />
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
              <Link
                key={company.id}
                href={`/dashboard/companies/${company.id}`}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex flex-1 flex-col space-y-2 p-4">
                  <div className="flex items-center space-x-3">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200"
                      />
                    ) : (
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {company.name}
                      </p>
                      {company.trading_name && (
                        <p className="text-sm text-gray-500 truncate">
                          Trading as {company.trading_name}
                        </p>
                      )}
                      {company.verification_status === 'verified' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  {company.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {company.description}
                    </p>
                  )}
                  {company.industry_tags && company.industry_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 
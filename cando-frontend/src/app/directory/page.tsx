'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { MagnifyingGlassIcon, BuildingOfficeIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { TagSelector } from '@/components/common/TagSelector/TagSelector'
import type { Database } from '@/lib/types/database.types'
import Link from 'next/link'

type PublicCompany = Database['public']['Views']['public_companies']['Row']

export default function CompanyDirectoryPage() {
  const [companies, setCompanies] = useState<PublicCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true)
      try {
        let query = supabase
          .from('public_companies')
          .select('*')
          .order('name')

        if (showVerifiedOnly) {
          query = query.eq('is_verified', true)
        }

        if (selectedIndustries.length > 0) {
          query = query.contains('industry_tags', selectedIndustries)
        }

        if (selectedCapabilities.length > 0) {
          query = query.contains('capability_tags', selectedCapabilities)
        }

        if (selectedRegions.length > 0) {
          query = query.contains('region_tags', selectedRegions)
        }

        const { data, error } = await query

        if (error) throw error
        setCompanies(data || [])
      } catch (error) {
        console.error('Error fetching companies:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanies()
  }, [supabase, showVerifiedOnly, selectedIndustries, selectedCapabilities, selectedRegions])

  const filteredCompanies = companies.filter(company => 
    !searchQuery || 
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.trading_name && company.trading_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Company Directory</h1>
            <p className="mt-4 text-lg text-gray-500">
              Discover and connect with businesses across Canada
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Search */}
            <div className="flex-1 w-full">
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
                  className="block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="Search companies by name..."
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Filters
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="verified"
                      name="verified"
                      type="checkbox"
                      checked={showVerifiedOnly}
                      onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="verified" className="text-sm font-medium text-gray-700">
                      Show verified companies only
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industries
                  </label>
                  <TagSelector
                    category="industry"
                    selectedTags={selectedIndustries}
                    onChange={setSelectedIndustries}
                    maxTags={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capabilities
                  </label>
                  <TagSelector
                    category="capability"
                    selectedTags={selectedCapabilities}
                    onChange={setSelectedCapabilities}
                    maxTags={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regions
                  </label>
                  <TagSelector
                    category="region"
                    selectedTags={selectedRegions}
                    onChange={setSelectedRegions}
                    maxTags={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
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
                {searchQuery || selectedIndustries.length > 0 || selectedCapabilities.length > 0 || selectedRegions.length > 0
                  ? 'Try adjusting your search criteria'
                  : 'Check back later for new companies'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCompanies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-200"
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
                        {company.industry_tags.slice(0, 3).map((tag: string) => (
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
      </div>
    </div>
  )
} 
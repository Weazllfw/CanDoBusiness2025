'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/types/database.types'
import { 
  BuildingOfficeIcon, 
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

type PublicCompany = Database['public']['Views']['public_companies']['Row']

export default function CompanyDetailsPage() {
  const params = useParams()
  const companyId = params.id as string
  const [company, setCompany] = useState<PublicCompany | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('public_companies')
          .select('*')
          .eq('id', companyId)
          .single()

        if (error) throw error
        setCompany(data)
      } catch (error) {
        console.error('Error fetching company:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompany()
  }, [companyId, supabase])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-1/3 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Company Not Found</h1>
            <p className="mt-2 text-gray-500">The company you're looking for doesn't exist or has been removed.</p>
            <div className="mt-6">
              <Link
                href="/directory"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Directory
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    {company.name}
                    {company.is_verified && (
                      <ShieldCheckIcon className="ml-2 h-6 w-6 text-green-500" aria-label="Verified" />
                    )}
                  </h1>
                  {company.trading_name && (
                    <p className="mt-1 text-sm text-gray-500">
                      Trading as {company.trading_name}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/directory"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Directory
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              {/* Location */}
              {(company.city || company.province) && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {[company.city, company.province].filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}

              {/* Website */}
              {company.website && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <GlobeAltIcon className="h-5 w-5 mr-2" />
                    Website
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {company.website}
                    </a>
                  </dd>
                </div>
              )}

              {/* Industries */}
              {company.industry_tags && company.industry_tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <TagIcon className="h-5 w-5 mr-2" />
                    Industries
                  </dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {company.industry_tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}

              {/* Capabilities */}
              {company.capability_tags && company.capability_tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <TagIcon className="h-5 w-5 mr-2" />
                    Capabilities
                  </dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {company.capability_tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}

              {/* Regions */}
              {company.region_tags && company.region_tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Regions
                  </dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {company.region_tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
} 
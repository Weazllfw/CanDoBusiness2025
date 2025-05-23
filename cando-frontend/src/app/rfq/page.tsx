'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import Sidebar from '@/components/layout/Sidebar'
import { Analytics } from '@/lib/analytics'
import { User } from '@supabase/supabase-js'

type RFQ = Database['public']['Tables']['rfqs']['Row'] & {
  companies?: {
    id: string
    name: string
  } | null
}

export default function RFQListPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [industry, setIndustry] = useState('')
  const [region, setRegion] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const supabase = createClientComponentClient<Database>()

  const loadRFQs = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('rfqs')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRfqs(data as RFQ[] || [])
    } catch (error) {
      console.error('Error loading RFQs:', error)
      setRfqs([]);
    } finally {
      setIsLoading(false)
    }
  }, [supabase]);

  useEffect(() => {
    loadRFQs();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [supabase, loadRFQs]);

  const filteredRFQs = rfqs.filter(rfq =>
    (rfq.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (rfq.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (rfq.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (currentUser && searchTerm.trim() !== '') {
      const handler = setTimeout(() => {
        const currentFilteredCount = rfqs.filter(rfq =>
          (rfq.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (rfq.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (rfq.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        ).length;
        Analytics.trackSearch(currentUser.id, searchTerm, currentFilteredCount);
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [searchTerm, currentUser, rfqs]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Requests for Quotation</h1>
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Keyword"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
                >
                  <option value="">Industry</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="technology">Technology</option>
                  <option value="construction">Construction</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
                >
                  <option value="">Region</option>
                  <option value="ontario">Ontario</option>
                  <option value="quebec">Quebec</option>
                  <option value="bc">British Columbia</option>
                </select>
              </div>
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Apply filters
              </button>
            </div>
          </div>

          {/* RFQ List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                <p className="mt-4 text-sm text-gray-500">Loading RFQs...</p>
              </div>
            ) : filteredRFQs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No RFQs found</p>
              </div>
            ) : (
              filteredRFQs.map((rfq) => (
                <div key={rfq.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                        {rfq.companies?.name?.[0] || 'N'}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          <Link href={`/rfq/${rfq.id}`} className="hover:text-primary-600">
                            {rfq.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-500">
                          {rfq.companies?.name || 'Unknown Company'} • {rfq.created_at ? formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true }) : 'Date N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {rfq.budget && (
                        <span className="text-sm text-gray-500">
                          Budget: {rfq.currency} {rfq.budget.toLocaleString()}
                        </span>
                      )}
                      <Link
                        href={`/rfq/${rfq.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600">{rfq.description}</p>
                  {rfq.tags && rfq.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {rfq.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-80">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Latest RFQs near you</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Watson Electronics</h3>
                <p className="text-sm text-gray-500">Injection molding services</p>
                <p className="text-xs text-gray-400 mt-1">4h ago</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Bright Packaging</h3>
                <p className="text-sm text-gray-500">Corrugated cardboard supplier</p>
                <p className="text-xs text-gray-400 mt-1">1d ago</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/rfq/new"
              className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Create RFQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 
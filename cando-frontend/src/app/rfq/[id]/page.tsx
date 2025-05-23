'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns/format'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import Link from 'next/link'

type RFQ = Database['public']['Tables']['rfqs']['Row'] & {
  companies: {
    id: string
    name: string
  }
}

type Quote = Database['public']['Tables']['quotes']['Row'] & {
  companies: {
    id: string
    name: string
  }
}

interface RFQDetailPageProps {
  params: {
    id: string
  }
}

export default function RFQDetailPage({ params }: RFQDetailPageProps) {
  const router = useRouter()
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  const loadRFQ = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: rfqData, error: rfqError } = await supabase
        .from('rfqs')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('id', params.id)
        .single()

      if (rfqError) throw rfqError
      setRfq(rfqData as RFQ)

      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('rfq_id', params.id)
        .order('created_at', { ascending: false })

      if (quotesError) throw quotesError
      setQuotes(quotesData as Quote[])
    } catch (error) {
      console.error('Error loading RFQ:', error)
      router.push('/rfq')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, params.id, router])

  const loadUserCompany = useCallback(async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) return

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', session.user.id)
        .single()

      if (companyError || !company) return
      setUserCompanyId(company.id)
    } catch (error) {
      console.error('Error loading user company:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadRFQ()
    loadUserCompany()
  }, [params.id, loadRFQ, loadUserCompany])

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'closed') => {
    try {
      const { error } = await supabase
        .from('rfqs')
        .update({ status: newStatus })
        .eq('id', params.id)

      if (error) throw error
      setRfq(prev => prev ? { ...prev, status: newStatus } : null)
    } catch (error) {
      console.error('Error updating RFQ status:', error)
      alert('Failed to update RFQ status. Please try again.')
    }
  }

  const handleQuoteAction = async (quoteId: string, action: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: action })
        .eq('id', quoteId)

      if (error) throw error

      setQuotes(prev =>
        prev.map(quote =>
          quote.id === quoteId
            ? { ...quote, status: action }
            : quote
        )
      )

      if (action === 'accepted') {
        await handleStatusChange('in_progress')
      }
    } catch (error) {
      console.error('Error updating quote status:', error)
      alert('Failed to update quote status. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-500">Loading RFQ details...</p>
        </div>
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm text-gray-500">RFQ not found</p>
        </div>
      </div>
    )
  }

  const isOwner = userCompanyId === rfq.company_id

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {rfq.title}
          </h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              Posted by {rfq.companies.name}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              {rfq.created_at ? formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true }) : 'Date N/A'}
            </div>
            <div className="mt-2 flex items-center">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                rfq.status === 'open'
                  ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                  : rfq.status === 'in_progress'
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                  : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20'
              }`}>
                {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1).replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <select
              value={rfq.status}
              onChange={(e) => handleStatusChange(e.target.value as 'open' | 'in_progress' | 'closed')}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl mb-6">
        <div className="px-4 py-6 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{rfq.description}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Budget</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {rfq.budget ? `${rfq.currency} ${rfq.budget.toLocaleString()}` : 'Not specified'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Deadline</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {rfq.deadline ? format(new Date(rfq.deadline), 'PPP') : 'Not specified'}
              </dd>
            </div>

            {rfq.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{rfq.category}</dd>
              </div>
            )}

            {rfq.required_certifications && rfq.required_certifications.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Required Certifications</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {rfq.required_certifications.map(cert => (
                    <span
                      key={cert}
                      className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"
                    >
                      {cert}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {rfq.tags && rfq.tags.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Tags</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {rfq.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {rfq.attachments && rfq.attachments.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Attachments</dt>
                <dd className="mt-1 flex flex-col gap-2">
                  {rfq.attachments.map(attachment => (
                    <a
                      key={attachment}
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/rfq-attachments/${attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-500"
                    >
                      {attachment.split('/').pop()}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Quotes Section */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Quotes</h3>
            {!isOwner && rfq.status === 'open' && (
              <Link
                href={`/messages/${rfq.company_id}?rfq=${rfq.id}`}
                className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
              >
                Submit Quote
              </Link>
            )}
          </div>
        </div>
        <div className="border-t border-gray-200">
          {quotes.length === 0 ? (
            <p className="px-4 py-5 sm:px-6 text-sm text-gray-500">
              No quotes submitted yet
            </p>
          ) : (
            <ul role="list" className="divide-y divide-gray-200">
              {quotes.map(quote => (
                <li key={quote.id} className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {quote.companies.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Amount: {quote.currency} {quote.amount.toLocaleString()}
                        </p>
                        {quote.delivery_time && (
                          <p className="text-sm text-gray-500">
                            Delivery Time: {quote.delivery_time}
                          </p>
                        )}
                      </div>
                      {quote.notes && (
                        <p className="mt-2 text-sm text-gray-700">{quote.notes}</p>
                      )}
                      <div className="mt-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          quote.status === 'submitted'
                            ? 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20'
                            : quote.status === 'accepted'
                            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                            : quote.status === 'rejected'
                            ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                            : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20'
                        }`}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    {isOwner && quote.status === 'submitted' && (
                      <div className="ml-4 flex items-center space-x-4">
                        <button
                          onClick={() => handleQuoteAction(quote.id, 'accepted')}
                          className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleQuoteAction(quote.id, 'rejected')}
                          className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
} 
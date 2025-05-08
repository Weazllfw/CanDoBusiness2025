import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface QuoteManagerProps {
  rfqId?: string
  threadId: string
}

export default function QuoteManager({ rfqId, threadId }: QuoteManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [quote, setQuote] = useState({
    amount: '',
    currency: 'USD',
    deliveryTime: '',
    notes: '',
  })
  const supabase = createClientComponentClient<Database>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rfqId) return

    try {
      const { error } = await supabase
        .from('quotes')
        .insert({
          rfq_id: rfqId,
          thread_id: threadId,
          amount: parseFloat(quote.amount),
          currency: quote.currency,
          delivery_time: quote.deliveryTime,
          notes: quote.notes,
        })

      if (error) throw error

      // Reset form
      setQuote({
        amount: '',
        currency: 'USD',
        deliveryTime: '',
        notes: '',
      })
      setIsExpanded(false)
    } catch (error) {
      console.error('Error submitting quote:', error)
    }
  }

  if (!rfqId) return null

  return (
    <div className="border-t border-gray-200 p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-gray-900">
          {isExpanded ? 'Cancel Quote' : 'Submit Quote'}
        </span>
        <span className="text-sm text-gray-500">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                value={quote.amount}
                onChange={(e) => setQuote({ ...quote, amount: e.target.value })}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="0.00"
                required
              />
              <select
                value={quote.currency}
                onChange={(e) => setQuote({ ...quote, currency: e.target.value })}
                className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 bg-gray-50 text-gray-500 sm:text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Delivery Time
            </label>
            <input
              type="text"
              value={quote.deliveryTime}
              onChange={(e) => setQuote({ ...quote, deliveryTime: e.target.value })}
              className="mt-1 block w-full px-3 py-2 rounded-md border focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="e.g. 2-3 weeks"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Additional Notes
            </label>
            <textarea
              value={quote.notes}
              onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
              rows={3}
              className="mt-1 block w-full px-3 py-2 rounded-md border focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Any additional details about your quote..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Submit Quote
            </button>
          </div>
        </form>
      )}
    </div>
  )
} 
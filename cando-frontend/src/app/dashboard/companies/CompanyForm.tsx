'use client'

import { useState } from 'react'
import { useCompany } from '@/lib/contexts/CompanyContext'
import type { CompanyWithMeta } from '@/lib/types/company'
import { updateCompany } from '@/lib/db/company'
import { TagSelector } from '@/components/common/TagSelector/TagSelector'

interface CompanyFormProps {
  company: CompanyWithMeta
}

export function CompanyForm({ company }: CompanyFormProps) {
  const { refreshCompanies } = useCompany()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: company.name,
    trading_name: company.trading_name || '',
    registration_number: company.registration_number || '',
    tax_number: company.tax_number || '',
    email: company.email || '',
    phone: company.phone || '',
    website: company.website || '',
    address: company.address || {},
    industry_tags: company.industry_tags || [],
    capability_tags: company.capability_tags || [],
    region_tags: company.region_tags || []
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTagChange = (category: 'industry_tags' | 'capability_tags' | 'region_tags') => (tags: string[]) => {
    setFormData(prev => ({ ...prev, [category]: tags }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await updateCompany(company.id, formData)
      if (error) throw new Error(error)

      await refreshCompanies()
      setMessage('Company details updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {message && (
        <div className="rounded-md bg-green-50 p-4" role="alert">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="trading_name" className="block text-sm font-medium text-gray-700">
            Trading Name
          </label>
          <input
            type="text"
            name="trading_name"
            id="trading_name"
            value={formData.trading_name}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700">
            Registration Number
          </label>
          <input
            type="text"
            name="registration_number"
            id="registration_number"
            value={formData.registration_number}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="tax_number" className="block text-sm font-medium text-gray-700">
            Tax Number
          </label>
          <input
            type="text"
            name="tax_number"
            id="tax_number"
            value={formData.tax_number}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            type="url"
            name="website"
            id="website"
            value={formData.website}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry Tags
          </label>
          <TagSelector
            category="industry"
            selectedTags={formData.industry_tags}
            onChange={handleTagChange('industry_tags')}
            maxTags={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capability Tags
          </label>
          <TagSelector
            category="capability"
            selectedTags={formData.capability_tags}
            onChange={handleTagChange('capability_tags')}
            maxTags={10}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Region Tags
          </label>
          <TagSelector
            category="region"
            selectedTags={formData.region_tags}
            onChange={handleTagChange('region_tags')}
            maxTags={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
} 
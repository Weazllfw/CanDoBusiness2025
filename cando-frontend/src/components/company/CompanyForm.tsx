'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const companySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  location: z.string().optional(),
  industry: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

interface CompanyFormProps {
  initialData?: CompanyFormData
  onSubmit: (data: CompanyFormData) => Promise<void>
  isLoading?: boolean
}

export default function CompanyForm({ initialData, onSubmit, isLoading }: CompanyFormProps) {
  const [error, setError] = useState<string>('')
  
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      website: '',
      location: '',
      industry: '',
    },
  })

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      setError('')
      await onSubmit(data)
    } catch (err) {
      setError('Failed to save company. Please try again.')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Company Name *
        </label>
        <input
          type="text"
          {...form.register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          {...form.register('description')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Website
        </label>
        <input
          type="url"
          {...form.register('website')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {form.formState.errors.website && (
          <p className="mt-1 text-sm text-red-500">
            {form.formState.errors.website.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          {...form.register('location')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Industry
        </label>
        <input
          type="text"
          {...form.register('industry')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isLoading ? 'Saving...' : 'Save Company'}
      </button>
    </form>
  )
} 
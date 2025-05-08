'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Visibility = 'public' | 'private' | 'invited'

interface FormData {
  title: string
  description: string
  budget: string
  currency: string
  deadline: string
  category: string
  required_certifications: string[]
  visibility: Visibility
  tags: string[]
  requirements: any
}

export default function NewRFQPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    budget: '',
    currency: 'USD',
    deadline: '',
    category: '',
    required_certifications: [],
    visibility: 'public',
    tags: [],
    requirements: {},
  })
  const [files, setFiles] = useState<File[]>([])
  const [newTag, setNewTag] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const supabase = createClientComponentClient<Database>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)

      // Get current user's company
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('Authentication required')

      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', session.user.id)
        .single()

      if (companyError || !companies) throw new Error('Company not found')

      // Upload attachments if any
      const attachments = await Promise.all(
        files.map(async (file) => {
          const { data, error } = await supabase
            .storage
            .from('rfq-attachments')
            .upload(`${companies.id}/${Date.now()}-${file.name}`, file)

          if (error) throw error
          return data.path
        })
      )

      // Create RFQ
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .insert({
          title: formData.title,
          description: formData.description,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          currency: formData.currency,
          deadline: formData.deadline || null,
          category: formData.category || null,
          required_certifications: formData.required_certifications.length > 0 ? formData.required_certifications : null,
          attachments,
          visibility: formData.visibility,
          tags: formData.tags.length > 0 ? formData.tags : null,
          requirements: Object.keys(formData.requirements).length > 0 ? formData.requirements : null,
          company_id: companies.id,
          status: 'open'
        })
        .select()
        .single()

      if (rfqError) throw rfqError

      router.push('/rfq')
    } catch (error) {
      console.error('Error creating RFQ:', error)
      alert('Failed to create RFQ. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const addCertification = () => {
    if (newCertification.trim() && !formData.required_certifications.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        required_certifications: [...prev.required_certifications, newCertification.trim()]
      }))
      setNewCertification('')
    }
  }

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      required_certifications: prev.required_certifications.filter(c => c !== cert)
    }))
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create an RFQ</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                placeholder="Enter a title for your request"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Provide more details about your needs"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <select
                id="location"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
              >
                <option value="">Select a location</option>
                <option value="ontario">Ontario</option>
                <option value="quebec">Quebec</option>
                <option value="bc">British Columbia</option>
                {/* Add more provinces */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-400 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-8 h-8">
                <Image
                  src="/images/bot-avatar.png"
                  alt="AI Assistant"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
              <p>Hi there! I can suggest tags for your RFQ to help suppliers find it.</p>
            </div>

            <div className="pt-6 flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-sm font-medium text-gray-700 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
              >
                {isLoading ? 'Creating...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 
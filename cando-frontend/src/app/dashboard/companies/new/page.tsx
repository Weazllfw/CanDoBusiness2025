'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { DashboardLayout } from '@/components/layout'
import { TagSelector } from '@/components/common/TagSelector/TagSelector'
import { BuildingOfficeIcon, BuildingLibraryIcon, MapPinIcon, TagIcon } from '@heroicons/react/24/outline'
import type { CompanyInsert } from '@/lib/types/company'

type OnboardingStep = 'basics' | 'details' | 'location' | 'tags'

interface StepConfig {
  title: string
  description: string
  icon: typeof BuildingOfficeIcon
}

const STEPS: Record<OnboardingStep, StepConfig> = {
  basics: {
    title: 'Basic Information',
    description: 'Start with your company\'s core details',
    icon: BuildingOfficeIcon
  },
  details: {
    title: 'Business Details',
    description: 'Add your business registration information',
    icon: BuildingLibraryIcon
  },
  location: {
    title: 'Location & Contact',
    description: 'How can people reach you?',
    icon: MapPinIcon
  },
  tags: {
    title: 'Business Profile',
    description: 'Help others understand your business',
    icon: TagIcon
  }
}

export default function NewCompanyPage() {
  const router = useRouter()
  const { createCompany } = useCompany()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basics')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CompanyInsert & { industry_tags?: string[], capability_tags?: string[], region_tags?: string[] }>({
    name: '',
    trading_name: null,
    registration_number: null,
    tax_number: null,
    email: null,
    phone: null,
    website: null,
    address: {},
    industry_tags: [],
    capability_tags: [],
    region_tags: []
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value || null }))
  }

  const handleTagChange = (category: 'industry_tags' | 'capability_tags' | 'region_tags') => (tags: string[]) => {
    setFormData(prev => ({ ...prev, [category]: tags }))
  }

  const handleNext = () => {
    const steps: OnboardingStep[] = ['basics', 'details', 'location', 'tags']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: OnboardingStep[] = ['basics', 'details', 'location', 'tags']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      setError('Company name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const newCompany = await createCompany(formData)
      router.push(`/dashboard/companies?companyId=${newCompany.id}&onboarded=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Company Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your company's legal name"
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
                value={formData.trading_name || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="If different from company name"
              />
            </div>
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700">
                Registration Number
              </label>
              <input
                type="text"
                name="registration_number"
                id="registration_number"
                value={formData.registration_number || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Business registration number"
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
                value={formData.tax_number || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Tax identification number"
              />
            </div>
          </div>
        )

      case 'location':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Company Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Business phone number"
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
                value={formData.website || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://www.company.com"
              />
            </div>
          </div>
        )

      case 'tags':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <TagSelector
                category="industry"
                selectedTags={formData.industry_tags || []}
                onChange={handleTagChange('industry_tags')}
                maxTags={5}
              />
              <p className="mt-1 text-sm text-gray-500">Select up to 5 industries that best describe your business</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capabilities
              </label>
              <TagSelector
                category="capability"
                selectedTags={formData.capability_tags || []}
                onChange={handleTagChange('capability_tags')}
                maxTags={10}
              />
              <p className="mt-1 text-sm text-gray-500">What services or products can you provide? (up to 10)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Regions
              </label>
              <TagSelector
                category="region"
                selectedTags={formData.region_tags || []}
                onChange={handleTagChange('region_tags')}
                maxTags={3}
              />
              <p className="mt-1 text-sm text-gray-500">Where do you operate? (up to 3 regions)</p>
            </div>
          </div>
        )
    }
  }

  const steps = Object.entries(STEPS)
  const currentStepIndex = steps.findIndex(([key]) => key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  // Get the current step's icon component
  const StepIcon = STEPS[currentStep].icon

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Company</h1>
          <p className="mt-1 text-sm text-gray-500">
            Let's get your company set up on the platform.
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            {steps.map(([key, step], index) => {
              const Icon = step.icon
              return (
                <div
                  key={key}
                  className={`flex items-center ${
                    index <= currentStepIndex ? 'text-blue-600' : ''
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-8">
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <StepIcon className="h-6 w-6 mr-2 text-blue-500" />
              {STEPS[currentStep].title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{STEPS[currentStep].description}</p>
          </div>

          {renderStepContent()}

          <div className="mt-8 flex justify-between items-center">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 'basics'}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              {currentStep === 'tags' ? (
                <button
                  type="submit"
                  disabled={isLoading || !formData.name}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Company'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStep === 'basics' && !formData.name}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
} 
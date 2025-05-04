'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { DashboardLayout } from '@/components/layout'
import { TagSelector } from '@/components/common/TagSelector/TagSelector'
import { ImageUpload } from '@/components/common/ImageUpload/ImageUpload'
import { BuildingOfficeIcon, BuildingLibraryIcon, MapPinIcon, TagIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { CompanyFormData } from '@/lib/types/company'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/database.types'
import { cn } from '@/lib/utils'

type OnboardingStep = 'basics' | 'details' | 'profile' | 'confirm'

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
    description: 'Tell us more about your business',
    icon: BuildingLibraryIcon
  },
  profile: {
    title: 'Business Profile',
    description: 'Help others understand your business',
    icon: TagIcon
  },
  confirm: {
    title: 'Review & Confirm',
    description: 'Review your company details before creating',
    icon: CheckCircleIcon
  }
}

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' }
] as const;

const FIELD_LIMITS = {
  business_number: 15,
  phone: 20,
  postal_code: 7,
  website: 100,
  linkedin_url: 100,
  email: 100,
  address: 200
} as const;

export default function NewCompanyPage() {
  const router = useRouter()
  const { createCompany } = useCompany()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basics')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    trading_name: null,
    business_number: null,
    email: null,
    phone: null,
    website: null,
    linkedin_url: null,
    description: null,
    address: {},
    location: {},
    industry_tags: [],
    capability_tags: [],
    region_tags: [],
    logo_url: null
  })

  const supabase = createClientComponentClient<Database>()

  // Fetch existing company data for autofill
  useEffect(() => {
    const fetchExistingData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: companies } = await supabase
        .from('companies')
        .select('business_number, website, linkedin_url')
        .eq('id', (await supabase.from('company_users').select('company_id').eq('user_id', user.id).single())?.data?.company_id)
        .single()

      if (companies) {
        setFormData(prev => ({
          ...prev,
          business_number: companies.business_number,
          website: companies.website,
          linkedin_url: companies.linkedin_url
        }))
      }
    }

    fetchExistingData()
  }, [supabase])

  const validateField = (name: string, value: string | null | undefined) => {
    if (!value) return '';

    switch (name) {
      case 'name':
        return !value.trim() ? 'Company name is required' : ''
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email address' : ''
      case 'website':
        return !/^https?:\/\/.*/.test(value) ? 'Website URL must start with http:// or https://' : ''
      case 'linkedin_url':
        return !/^https?:\/\/.*linkedin\.com.*/.test(value) ? 'Please enter a valid LinkedIn URL' : ''
      case 'phone':
        // Allow only Canadian phone numbers in format: +1 (XXX) XXX-XXXX or variations
        return !/^\+?1?\s*[\-(]?\d{3}[\-)]?\s*\d{3}[\-\s]?\d{4}$/.test(value.replace(/\s/g, '')) 
          ? 'Please enter a valid Canadian phone number' : ''
      case 'postal_code':
        // Canadian postal code format: A1A 1A1
        return !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(value) 
          ? 'Please enter a valid Canadian postal code' : ''
      default:
        return ''
    }
  }

  // Add type for form event handlers
  type FormInputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  type FormChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  type FormBlurEvent = React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  type FormDataKey = keyof CompanyFormData;

  const handleInputChange = (e: FormChangeEvent) => {
    const { name, value } = e.target
    
    setFormData(prev => {
      const update = { ...prev }
      
      switch (name) {
        case 'location':
          return {
            ...update,
            location: value ? JSON.parse(value) : {}
          } as CompanyFormData
        case 'address':
          return {
            ...update,
            address: value ? JSON.parse(value) : {}
          } as CompanyFormData
        case 'industry_tags':
        case 'capability_tags':
        case 'region_tags':
          return {
            ...update,
            [name]: value ? value.split(',') : []
          } as CompanyFormData
        default:
          return {
            ...update,
            [name]: value || null
          } as CompanyFormData
      }
    })
    
    // Clear error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (e: FormBlurEvent) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setFieldErrors(prev => ({ ...prev, [name]: error }))
  }

  // Update input fields to include error states
  const renderInput = (
    name: keyof CompanyFormData,
    label: string,
    type: string = 'text',
    placeholder: string = '',
    required: boolean = false,
    maxLength?: number
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">
        <input
          type={type}
          name={name}
          id={name}
          required={required}
          maxLength={maxLength}
          value={formData[name]?.toString() || ''}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={cn(
            "block w-full rounded-md shadow-sm sm:text-sm",
            fieldErrors[name]
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          )}
          placeholder={placeholder}
        />
        {fieldErrors[name] && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors[name]}</p>
        )}
        {maxLength && (
          <p className="mt-1 text-xs text-gray-500">
            {formData[name]?.toString().length || 0}/{maxLength} characters
          </p>
        )}
      </div>
    </div>
  )

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value,
        // Always set country to Canada
        country: 'Canada'
      }
    }))
  }

  const handleTagChange = (category: 'industry_tags' | 'capability_tags' | 'region_tags') => (tags: string[]) => {
    setFormData(prev => ({ ...prev, [category]: tags }))
  }

  const handleLogoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }))
  }

  const handleLogoError = (error: string) => {
    setError(error)
  }

  const validateStep = (step: OnboardingStep): boolean => {
    switch (step) {
      case 'basics':
        return !!formData.name?.trim()
      case 'details':
        // Check if any provided fields are valid
        const emailValid = !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        const websiteValid = !formData.website || /^https?:\/\/.*/.test(formData.website)
        const linkedinValid = !formData.linkedin_url || /^https?:\/\/.*linkedin\.com.*/.test(formData.linkedin_url)
        return emailValid && websiteValid && linkedinValid
      case 'profile':
        // Ensure tags are within limits
        return (
          (formData.industry_tags?.length || 0) <= 5 &&
          (formData.capability_tags?.length || 0) <= 10 &&
          (formData.region_tags?.length || 0) <= 3
        )
      case 'confirm':
        return true
      default:
        return true
    }
  }

  const handleNext = (e?: React.MouseEvent | React.FormEvent) => {
    // Always prevent default behavior
    e?.preventDefault()
    e?.stopPropagation()
    
    const steps: OnboardingStep[] = ['basics', 'details', 'profile', 'confirm']
    const currentIndex = steps.indexOf(currentStep)
    
    if (!validateStep(currentStep)) {
      setError(`Please complete all required fields in ${STEPS[currentStep].title} before proceeding`)
      return
    }
    
    if (currentIndex < steps.length - 1) {
      // Ensure we're not on the last step
      const nextStep = steps[currentIndex + 1]
      setCurrentStep(nextStep)
      setError(null)
    }
  }

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    const steps: OnboardingStep[] = ['basics', 'details', 'profile', 'confirm']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Double-check we're on confirm step
    if (currentStep !== 'confirm') {
      console.warn('Attempted to submit form while not on confirm step')
      return
    }

    // Prevent double submission
    if (isLoading) {
      return
    }

    // Final validation
    const allSteps: OnboardingStep[] = ['basics', 'details', 'profile', 'confirm']
    const invalidStep = allSteps.find(step => !validateStep(step))
    
    if (invalidStep) {
      setError(`Please complete all required fields in ${STEPS[invalidStep].title} before submitting`)
      setCurrentStep(invalidStep)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createCompany(formData)
      if (!result || !result.id) {
        throw new Error('Failed to create company')
      }
      router.replace(`/dashboard/companies/welcome?companyId=${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            <div className="flex items-start space-x-6">
              <div className="w-32">
                <ImageUpload
                  onUpload={handleLogoUpload}
                  onError={handleLogoError}
                  defaultImage={formData.logo_url || undefined}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                {renderInput('name', 'Company Name', 'text', "Enter your company's legal name", true)}
                {renderInput('trading_name', 'Trading Name', 'text', 'If different from company name')}
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Company Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                value={formData.description || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Tell us about your company"
              />
            </div>
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            {renderInput('business_number', 'Business Number', 'text', 'Enter your business registration number', false, FIELD_LIMITS.business_number)}
            {renderInput('email', 'Business Email', 'email', 'contact@company.com', false, FIELD_LIMITS.email)}
            {renderInput('phone', 'Business Phone', 'tel', '+1 (555) 555-5555', false, FIELD_LIMITS.phone)}
            {renderInput('website', 'Website', 'url', 'https://www.company.com', false, FIELD_LIMITS.website)}
            {renderInput('linkedin_url', 'LinkedIn Company Page', 'url', 'https://www.linkedin.com/company/...', false, FIELD_LIMITS.linkedin_url)}
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Business Location</h4>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  maxLength={FIELD_LIMITS.address}
                  value={formData.location?.address || ''}
                  onChange={handleLocationChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={formData.location?.city || ''}
                    onChange={handleLocationChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    Province/Territory
                  </label>
                  <select
                    name="state"
                    id="state"
                    value={formData.location?.state || ''}
                    onChange={handleLocationChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a province/territory</option>
                    {CANADIAN_PROVINCES.map(province => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    id="postal_code"
                    maxLength={FIELD_LIMITS.postal_code}
                    value={formData.location?.postal_code || ''}
                    onChange={handleLocationChange}
                    onBlur={(e) => {
                      // Format postal code on blur
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      if (value.length === 6) {
                        const formatted = `${value.slice(0, 3)} ${value.slice(3)}`;
                        handleLocationChange({
                          target: { name: 'postal_code', value: formatted }
                        } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    placeholder="A1A 1A1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: A1A 1A1</p>
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    id="country"
                    value="Canada"
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'profile':
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

      case 'confirm':
        return (
          <div className="space-y-8">
            <div className="border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                <dl className="mt-4 space-y-4">
                  {formData.logo_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Company Logo</dt>
                      <dd className="mt-1">
                        <div className="w-20 h-20 rounded-lg overflow-hidden">
                          <img src={formData.logo_url} alt="Company logo" className="w-full h-full object-cover" />
                        </div>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.name}</dd>
                  </div>
                  {formData.trading_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Trading Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formData.trading_name}</dd>
                    </div>
                  )}
                  {formData.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formData.description}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Business Details</h3>
                <dl className="mt-4 space-y-4">
                  {formData.business_number && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Business Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formData.business_number}</dd>
                    </div>
                  )}
                  {formData.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formData.email}</dd>
                    </div>
                  )}
                  {formData.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formData.phone}</dd>
                    </div>
                  )}
                  {formData.website && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Website</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                          {formData.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  {formData.linkedin_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                          {formData.linkedin_url}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {formData.location && Object.keys(formData.location).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Location</h3>
                  <dl className="mt-4 space-y-4">
                    {formData.location.address && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formData.location.address}</dd>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {formData.location.city && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">City</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formData.location.city}</dd>
                        </div>
                      )}
                      {formData.location.state && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">State/Province</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formData.location.state}</dd>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {formData.location.postal_code && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Postal Code</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formData.location.postal_code}</dd>
                        </div>
                      )}
                      {formData.location.country && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Country</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formData.location.country}</dd>
                        </div>
                      )}
                    </div>
                  </dl>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-gray-900">Business Profile</h3>
                <dl className="mt-4 space-y-4">
                  {formData.industry_tags && formData.industry_tags.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Industries</dt>
                      <dd className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.industry_tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                  {formData.capability_tags && formData.capability_tags.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Capabilities</dt>
                      <dd className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.capability_tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                  {formData.region_tags && formData.region_tags.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Regions</dt>
                      <dd className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.region_tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
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

            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Verification Notice</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      After creating your company, you'll have the option to verify your business. 
                      Verification helps build trust with potential partners and unlocks additional features.
                    </p>
                  </div>
                </div>
              </div>
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

  // Update the profile step buttons to show Next instead of automatically submitting
  const renderStepButtons = () => {
    const isLastStep = currentStep === 'confirm'

    return (
      <div className="mt-8 flex justify-between items-center">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 'basics' || isLoading}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {isLastStep ? (
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 bg-green-600 hover:bg-green-500 focus-visible:outline-green-600"
            >
              {isLoading ? 'Creating...' : 'Create Company'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading || (currentStep === 'basics' && !formData.name)}
              className="rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600"
            >
              Next
            </button>
          )}
        </div>
      </div>
    )
  }

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

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-8">
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

          {/* Wrap form content in a div for non-confirm steps */}
          {currentStep !== 'confirm' ? (
            <div>
              {renderStepContent()}
              {renderStepButtons()}
            </div>
          ) : (
            // Only use form element for confirm step
            <form 
              onSubmit={handleCreateCompany}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                }
              }}
            >
              {renderStepContent()}
              <div className="mt-8 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 bg-green-600 hover:bg-green-500 focus-visible:outline-green-600"
                  >
                    {isLoading ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 
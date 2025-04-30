'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function CompanyForm() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    businessNumber: '',
    website: '',
    description: '',
    employeeCount: '',
    yearFounded: new Date().getFullYear().toString(),
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSkip = () => {
    router.push('/onboarding/role')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('No authenticated user found')

      // First check if user already has a company
      const { data: existingCompany, error: checkError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw checkError
      }

      if (existingCompany) {
        // User already has a company, proceed to next step
        router.push('/onboarding/role')
        return
      }

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([
          {
            name: formData.name,
            legal_name: formData.legalName,
            business_number: formData.businessNumber || null,
            website: formData.website || null,
            description: formData.description,
            employee_count: formData.employeeCount ? parseInt(formData.employeeCount) : null,
            year_founded: parseInt(formData.yearFounded),
            created_by: user.id,
            status: 'ACTIVE',
            verification_status: 'UNVERIFIED',
          },
        ])
        .select('id')
        .single()

      if (companyError) {
        console.error('Company creation error:', companyError)
        throw new Error(companyError.message || 'Failed to create company')
      }

      // Redirect to the next onboarding step
      router.push('/onboarding/role')
    } catch (err) {
      console.error('Form submission error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while saving company information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="space-y-4">
        <Input
          id="name"
          name="name"
          type="text"
          required
          label="Company Name"
          value={formData.name}
          onChange={handleChange}
          placeholder="CanDo Enterprises"
        />

        <Input
          id="legalName"
          name="legalName"
          type="text"
          required
          label="Legal Business Name"
          value={formData.legalName}
          onChange={handleChange}
          placeholder="CanDo Enterprises Inc."
        />

        <Input
          id="businessNumber"
          name="businessNumber"
          type="text"
          label="Business Registration Number"
          value={formData.businessNumber}
          onChange={handleChange}
          placeholder="Optional"
        />

        <Input
          id="website"
          name="website"
          type="url"
          label="Company Website"
          value={formData.website}
          onChange={handleChange}
          placeholder="https://example.com"
        />

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Company Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell us about your company..."
          />
        </div>

        <Input
          id="employeeCount"
          name="employeeCount"
          type="number"
          label="Number of Employees"
          value={formData.employeeCount}
          onChange={handleChange}
          placeholder="Optional"
          min="1"
        />

        <Input
          id="yearFounded"
          name="yearFounded"
          type="number"
          required
          label="Year Founded"
          value={formData.yearFounded}
          onChange={handleChange}
          min="1800"
          max={new Date().getFullYear()}
        />
      </div>

      <div className="flex justify-between pt-4">
        <div className="space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
          >
            Skip for now
          </Button>
        </div>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>

      <p className="mt-2 text-sm text-gray-500 text-center">
        You can always add or update your company information later from your profile settings.
      </p>
    </form>
  )
} 
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { CheckCircleIcon, ArrowRightIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { CompanyWithMeta } from '@/lib/types/company'

export default function WelcomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { companies, refreshCompanies, setCurrentCompany, currentCompany } = useCompany()
  const [company, setCompany] = useState<CompanyWithMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCompanyData = async () => {
      setIsLoading(true)
      const companyId = searchParams.get('companyId')
      if (!companyId) {
        setIsLoading(false)
        return
      }

      try {
        // Only refresh if we don't have the company data
        if (!companies.some(c => c.id === companyId)) {
          await refreshCompanies()
        }
        
        const foundCompany = companies.find(c => c.id === companyId)
        if (foundCompany) {
          setCompany(foundCompany)
          // Only set current company if it's different
          if (!currentCompany || currentCompany.id !== foundCompany.id) {
            await setCurrentCompany(foundCompany)
          }
        }
      } catch (error) {
        console.error('Error fetching company data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanyData()
  }, [searchParams, companies.length]) // Only depend on searchParams and companies.length

  const verificationSteps = [
    {
      title: 'Complete Your Profile',
      description: 'Add your company description, logo, and other details to help others understand your business.',
      href: company ? `/dashboard/companies/${company.id}/edit` : '#',
      status: 'current'
    },
    {
      title: 'Add Team Members',
      description: 'Invite your team members to collaborate and manage your company profile.',
      href: company ? `/dashboard/companies/${company.id}/team` : '#',
      status: 'upcoming'
    },
    {
      title: 'Verify Your Business',
      description: 'Submit documentation to verify your business and unlock additional features.',
      href: company ? `/dashboard/companies/${company.id}/verify` : '#',
      status: 'upcoming'
    }
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto" />
            <div className="h-8 w-2/3 bg-gray-200 rounded mx-auto" />
            <div className="h-4 w-1/2 bg-gray-200 rounded mx-auto" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!company) {
    router.push('/dashboard')
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            Welcome to {company.name}!
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Your company has been successfully created. Let's get you set up with everything you need.
          </p>
        </div>

        {/* Verification Notice */}
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Verify Your Business</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  To unlock all features and build trust with other users, please verify your business.
                  This process usually takes 1-2 business days.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/companies/${company.id}/verify`)}
                    className="rounded-md bg-blue-50 px-2 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-blue-50"
                  >
                    Start Verification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg divide-y">
          {verificationSteps.map((step, index) => (
            <div
              key={step.title}
              className="p-6 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-lg font-medium text-gray-900">{step.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{step.description}</p>
                  <div className="mt-4">
                    <a
                      href={step.href}
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      Get started
                      <ArrowRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/companies/${company.id}/edit`)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Complete Your Profile
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
} 
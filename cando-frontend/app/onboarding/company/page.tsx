import { Metadata } from 'next'
import CompanyForm from './CompanyForm'
import { Card } from '@/components/common/Card'

export const metadata: Metadata = {
  title: 'Company Information - CanDo Business',
  description: 'Set up your company profile'
}

export default function CompanyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Company Information</h1>
          <p className="mt-2 text-lg text-gray-600">
            Tell us about your business
          </p>
        </div>
        <CompanyForm />
      </Card>
    </div>
  )
} 
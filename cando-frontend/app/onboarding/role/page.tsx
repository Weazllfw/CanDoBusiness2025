import { Metadata } from 'next'
import RoleForm from './RoleForm'
import { Card } from '@/components/common/Card'

export const metadata: Metadata = {
  title: 'Select Your Role - CanDo Business',
  description: 'Choose your role in the company'
}

export default function RolePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Role</h1>
          <p className="mt-2 text-lg text-gray-600">
            What's your role in the company?
          </p>
        </div>
        <RoleForm />
      </Card>
    </div>
  )
} 
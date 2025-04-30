import { Metadata } from 'next'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Welcome to CanDo Business',
  description: 'Get started with your CanDo Business account'
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to CanDo Business!</h1>
          <p className="mt-2 text-lg text-gray-600">
            Let's get your account set up in just a few steps
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-primary p-4 bg-primary-50">
            <h2 className="text-lg font-medium text-gray-900">Here's what you'll need:</h2>
            <ul className="mt-2 list-disc list-inside text-gray-600 space-y-1">
              <li>Basic company information</li>
              <li>Business registration number (optional)</li>
              <li>Company logo (optional)</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900">The process will take about 5 minutes</h3>
            <p className="mt-1 text-sm text-gray-600">
              You can save your progress and come back later if needed
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/onboarding/company" passHref>
            <Button size="lg">
              Let's get started
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
} 
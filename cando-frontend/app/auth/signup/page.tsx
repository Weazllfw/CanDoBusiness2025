import { Metadata } from 'next'
import SignUpForm from './SignUpForm'
import { Card } from '@/components/common/Card'

export const metadata: Metadata = {
  title: 'Sign Up - CanDo Business',
  description: 'Create your CanDo Business account'
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a href="/auth/login" className="font-medium text-primary hover:text-primary-dark">
              sign in to your existing account
            </a>
          </p>
        </div>
        <SignUpForm />
      </Card>
    </div>
  )
} 
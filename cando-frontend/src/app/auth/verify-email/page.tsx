import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
          Check your email
        </h2>
        <p className="text-gray-600 mb-8">
          We've sent you a verification link. Please check your email and click the link to verify your account.
        </p>
        <Link
          href="/auth/login"
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          Return to login
        </Link>
      </div>
    </div>
  )
} 
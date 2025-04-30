'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function SignUpForm() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) throw signUpError

      // Redirect to onboarding
      router.push('/onboarding/welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      <div className="space-y-4">
        <Input
          id="fullName"
          name="fullName"
          type="text"
          required
          label="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="John Doe"
        />
        <Input
          id="email"
          name="email"
          type="email"
          required
          label="Email address"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
        />
        <Input
          id="password"
          name="password"
          type="password"
          required
          label="Password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          minLength={8}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="mt-2 text-center text-sm text-gray-600">
        By signing up, you agree to our{' '}
        <a href="/terms" className="font-medium text-primary hover:text-primary-dark">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="font-medium text-primary hover:text-primary-dark">
          Privacy Policy
        </a>
      </p>
    </form>
  )
} 
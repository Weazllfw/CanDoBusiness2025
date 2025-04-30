'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/common/Button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const ROLES = [
  {
    id: 'OWNER',
    title: 'Owner',
    description: 'I own or co-own the company',
  },
  {
    id: 'EXECUTIVE',
    title: 'Executive',
    description: 'I am an executive or senior manager',
  },
  {
    id: 'MANAGER',
    title: 'Manager',
    description: 'I manage a team or department',
  },
  {
    id: 'EMPLOYEE',
    title: 'Employee',
    description: 'I am an employee of the company',
  },
] as const

type Role = typeof ROLES[number]['id']

export default function RoleForm() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const handleSkip = () => {
    router.push('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedRole) return

    setLoading(true)
    setError(null)

    try {
      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('No authenticated user found')

      // Get the user's company if it exists
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', user.id)
        .single()

      // If there's no company and it's not just a "no rows" error, throw the error
      if (companyError && companyError.code !== 'PGRST116') {
        throw companyError
      }

      if (company) {
        // If user has a company, create the role association
        const { error: roleError } = await supabase.from('user_company_link').insert([
          {
            user_id: user.id,
            company_id: company.id,
            role: selectedRole,
            status: 'ACTIVE',
          },
        ])

        if (roleError) throw roleError
      }

      // Even if user skipped company creation, we'll store their preferred role
      // in user metadata for future use
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          preferred_role: selectedRole,
        },
      })

      if (updateError) throw updateError

      // Redirect to the dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Role submission error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while saving your role')
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
        {ROLES.map((role) => (
          <div
            key={role.id}
            className={`relative rounded-lg border p-4 cursor-pointer hover:border-primary transition-colors ${
              selectedRole === role.id ? 'border-primary bg-primary-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedRole(role.id)}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">{role.title}</h3>
                <p className="text-sm text-gray-500">{role.description}</p>
              </div>
              <div className="ml-3 flex h-5 items-center">
                <input
                  type="radio"
                  name="role"
                  value={role.id}
                  checked={selectedRole === role.id}
                  onChange={() => setSelectedRole(role.id)}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ))}
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
          disabled={loading || !selectedRole}
        >
          {loading ? 'Saving...' : 'Complete Setup'}
        </Button>
      </div>

      <p className="mt-2 text-sm text-gray-500 text-center">
        You can always update your role later from your profile settings.
      </p>
    </form>
  )
} 
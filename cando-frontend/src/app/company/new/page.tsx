'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import CompanyForm from '@/components/company/CompanyForm'
import type { Database } from '@/types/supabase'

export default function NewCompanyPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleCreate = async (data: {
    name: string
    description?: string
    website?: string
    location?: string
    industry?: string
  }) => {
    try {
      setIsLoading(true)
      
      // Get current user
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('Authentication required')

      // Debug logging
      console.log('Current user:', session.user)
      
      // Verify user exists in auth.users
      const { data: authUser, error: userCheckError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('id', session.user.id)
        .single()
      
      console.log('Auth user check:', { authUser, userCheckError })

      // Create company
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          ...data,
          owner_id: session.user.id,
        })
        .select()
        .single()

      if (error) throw error

      router.refresh()
      router.push(`/company/${company.id}`)
    } catch (error) {
      console.error('Error creating company:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Create New Company</h1>
      <CompanyForm onSubmit={handleCreate} isLoading={isLoading} />
    </div>
  )
} 
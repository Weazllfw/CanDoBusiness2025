'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import CompanyForm from '@/components/company/CompanyForm'
import type { Database } from '@/types/supabase'

interface CompanyPageProps {
  params: {
    id: string
  }
}

export default function CompanyPage({ params }: CompanyPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [company, setCompany] = useState<any>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function loadCompany() {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select()
          .eq('id', params.id)
          .single()

        if (error) throw error
        setCompany(data)
      } catch (error) {
        console.error('Error loading company:', error)
        router.push('/feed')
      }
    }

    loadCompany()
  }, [params.id, supabase, router])

  const handleUpdate = async (data: {
    name: string
    description?: string
    website?: string
    location?: string
    industry?: string
  }) => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', params.id)

      if (error) throw error

      router.refresh()
      router.push('/feed')
    } catch (error) {
      console.error('Error updating company:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Edit Company</h1>
      <CompanyForm
        initialData={company}
        onSubmit={handleUpdate}
        isLoading={isLoading}
      />
    </div>
  )
} 
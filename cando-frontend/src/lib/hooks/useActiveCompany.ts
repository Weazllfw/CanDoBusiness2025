import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

type Company = Database['public']['Functions']['get_user_companies']['Returns'][number]

export function useActiveCompany(userId: string, initialCompany?: Company) {
  const [activeCompany, setActiveCompany] = useState<Company | null>(initialCompany || null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function loadCompanies() {
      try {
        const { data, error } = await supabase
          .rpc('get_user_companies', { user_id_param: userId })

        if (error) throw error

        setCompanies(data || [])
        if (data?.length && !activeCompany) {
          // Try to load from localStorage first
          const savedCompanyId = localStorage.getItem(`activeCompany_${userId}`)
          const savedCompany = data.find(c => c.id === savedCompanyId)
          setActiveCompany(savedCompany || data[0])
        }
      } catch (error) {
        console.error('Error loading companies:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCompanies()
  }, [userId, supabase, activeCompany])

  const switchCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    if (company) {
      setActiveCompany(company)
      localStorage.setItem(`activeCompany_${userId}`, companyId)
    }
  }

  return {
    activeCompany,
    companies,
    isLoading,
    switchCompany
  }
} 
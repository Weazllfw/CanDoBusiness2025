'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../types/database.types'
import type { CompanyContextType, CompanyInsert, CompanyWithMeta } from '../types/company'
import { createCompany, getCompanies, setPrimaryCompany } from '../db/company'

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  isLoading: true,
  error: null,
  setCurrentCompany: async () => {},
  refreshCompanies: async () => {},
  createCompany: async () => { throw new Error('Not implemented') }
})

export function useCompany() {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

interface CompanyProviderProps {
  children: ReactNode
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [currentCompany, setCurrentCompanyState] = useState<CompanyWithMeta | null>(null)
  const [companies, setCompanies] = useState<CompanyWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const refreshCompanies = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error } = await getCompanies()
      
      if (error) throw error
      
      if (data) {
        setCompanies(data)
        
        // If there's no current company selected, select the primary one or the first one
        if (!currentCompany) {
          const primaryCompany = data.find(c => c.is_primary) || data[0]
          if (primaryCompany) {
            setCurrentCompanyState(primaryCompany)
          }
        } else {
          // If there is a current company, make sure it still exists in the updated list
          const existingCompany = data.find(c => c.id === currentCompany.id)
          if (!existingCompany) {
            const newCurrentCompany = data.find(c => c.is_primary) || data[0]
            if (newCurrentCompany) {
              setCurrentCompanyState(newCurrentCompany)
            } else {
              setCurrentCompanyState(null)
            }
          } else {
            // Update the current company with latest data
            setCurrentCompanyState(existingCompany)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch companies')
      console.error('Error refreshing companies:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetCurrentCompany = async (company: CompanyWithMeta) => {
    try {
      setIsLoading(true)
      setError(null)

      const { error } = await setPrimaryCompany(company.id)
      if (error) throw error

      setCurrentCompanyState(company)
      setCompanies(prev => 
        prev.map(c => ({
          ...c,
          is_primary: c.id === company.id
        }))
      )

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set current company')
      console.error('Error setting current company:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCompany = async (companyData: CompanyInsert) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await createCompany(companyData)
      if (error) throw error
      if (!data) throw new Error('No data returned from company creation')

      await refreshCompanies()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
      console.error('Error creating company:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentCompanyState(null)
        setCompanies([])
      } else if (event === 'SIGNED_IN') {
        refreshCompanies()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Initial fetch of companies
  useEffect(() => {
    refreshCompanies()
  }, [])

  const value = {
    currentCompany,
    companies,
    isLoading,
    error,
    setCurrentCompany: handleSetCurrentCompany,
    refreshCompanies,
    createCompany: handleCreateCompany
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
} 
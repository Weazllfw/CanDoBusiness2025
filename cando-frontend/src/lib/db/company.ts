import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../types/database.types'
import type { 
  CompanyInsert, 
  CompanyUpdate, 
  CompanyWithMeta, 
  CompanyRole,
  CompanyUserWithProfile,
  CompanyUserInsert,
  CompanyUserUpdate
} from '../types/company'
import { cache, Cache } from '../utils/cache'
import { rateLimiter, RateLimitError } from '../utils/rateLimiter'
import { 
  validateCompanyData, 
  validateCompanyUpdate, 
  validateCompanyUser,
  ValidationError 
} from '../utils/validation'

const supabase = createClientComponentClient<Database>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT = 100 // requests per minute

async function getCurrentUserId(): Promise<string> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) throw new Error('No authenticated user')
  return userId
}

export async function getCompanies() {
  try {
    const userId = await getCurrentUserId()
    const cacheKey = Cache.generateKey('companies', { userId })
    const cachedData = cache.get<CompanyWithMeta[]>(cacheKey)
    
    if (cachedData) {
      return { data: cachedData, error: null }
    }

    if (rateLimiter.isRateLimited(`getCompanies:${userId}`)) {
      throw new RateLimitError()
    }

    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_users!inner(role, is_primary)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const companies: CompanyWithMeta[] = data.map(company => ({
      ...company,
      is_primary: company.company_users[0].is_primary,
      role: company.company_users[0].role as CompanyRole
    }))

    cache.set(cacheKey, companies, CACHE_TTL)
    return { data: companies, error: null }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { 
        data: null, 
        error: error.message,
        resetTime: error.resetTime 
      }
    }
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to fetch companies' 
    }
  }
}

export async function createCompany(companyData: CompanyInsert) {
  try {
    const userId = await getCurrentUserId()

    if (rateLimiter.isRateLimited(`createCompany:${userId}`)) {
      throw new RateLimitError()
    }

    // Validate company data
    const validatedData = validateCompanyData(companyData)

    // Start a transaction
    const { data: company, error: createError } = await supabase
      .from('companies')
      .insert(validatedData)
      .select()
      .single()

    if (createError) throw createError
    if (!company) throw new Error('No company data returned')

    // Create company_user relationship
    const { error: relationError } = await supabase
      .from('company_users')
      .insert({
        company_id: company.id,
        user_id: userId,
        role: 'owner',
        is_primary: true
      })

    if (relationError) throw relationError

    // Clear companies cache
    const cacheKey = Cache.generateKey('companies', { userId })
    cache.delete(cacheKey)

    return { 
      data: { ...company, is_primary: true, role: 'owner' as CompanyRole }, 
      error: null 
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { 
        data: null, 
        error: `Validation error: ${error.message}`,
        validationErrors: error.errors
      }
    }
    if (error instanceof RateLimitError) {
      return { 
        data: null, 
        error: error.message,
        resetTime: error.resetTime 
      }
    }
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to create company' 
    }
  }
}

export async function updateCompany(id: string, updates: CompanyUpdate) {
  try {
    const { data: company, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        company_users!inner(role, is_primary)
      `)
      .single()

    if (error) throw error
    if (!company) throw new Error('No company data returned')

    const companyWithMeta: CompanyWithMeta = {
      ...company,
      is_primary: company.company_users[0].is_primary,
      role: company.company_users[0].role as CompanyRole
    }

    return { data: companyWithMeta, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to update company' 
    }
  }
}

export async function deleteCompany(id: string) {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { error: null }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to delete company' 
    }
  }
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export async function getCompanyUsers(
  companyId: string,
  pagination: PaginationParams = { page: 1, limit: 10 }
) {
  try {
    const userId = await getCurrentUserId()
    const { page, limit } = pagination
    const offset = (page - 1) * limit

    if (rateLimiter.isRateLimited(`getCompanyUsers:${userId}`)) {
      throw new RateLimitError()
    }

    const cacheKey = Cache.generateKey('companyUsers', { companyId, page, limit })
    const cachedData = cache.get<PaginatedResponse<CompanyUserWithProfile>>(cacheKey)
    
    if (cachedData) {
      return { data: cachedData, error: null }
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    if (countError) throw countError

    // Get paginated data
    const { data, error } = await supabase
      .from('company_users')
      .select(`
        *,
        user_profiles(
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const response: PaginatedResponse<CompanyUserWithProfile> = {
      data: data as CompanyUserWithProfile[],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit
    }

    cache.set(cacheKey, response, CACHE_TTL)
    return { data: response, error: null }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { 
        data: null, 
        error: error.message,
        resetTime: error.resetTime 
      }
    }
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to fetch company users' 
    }
  }
}

export async function addUserToCompany(companyId: string, userData: CompanyUserInsert) {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .insert({ ...userData, company_id: companyId })
      .select(`
        *,
        user_profiles(
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error

    return { 
      data: data as CompanyUserWithProfile, 
      error: null 
    }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to add user to company' 
    }
  }
}

export async function updateUserRole(
  companyId: string, 
  userId: string, 
  updates: CompanyUserUpdate
) {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .update(updates)
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .select(`
        *,
        user_profiles(
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error

    return { 
      data: data as CompanyUserWithProfile, 
      error: null 
    }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to update user role' 
    }
  }
}

export async function removeUserFromCompany(companyId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('company_users')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to remove user from company' 
    }
  }
}

export async function setPrimaryCompany(companyId: string) {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('No authenticated user')

    // Reset all companies to non-primary
    const { error: resetError } = await supabase
      .from('company_users')
      .update({ is_primary: false })
      .eq('user_id', userId)

    if (resetError) throw resetError

    // Set the selected company as primary
    const { error: updateError } = await supabase
      .from('company_users')
      .update({ is_primary: true })
      .eq('company_id', companyId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    return { error: null }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to set primary company' 
    }
  }
} 
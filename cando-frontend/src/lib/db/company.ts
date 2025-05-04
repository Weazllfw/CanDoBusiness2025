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
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('No authenticated user')
  return data.user.id
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

    // Fetch companies the user is associated with
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_users!inner(user_id, role, is_primary)
      `)
      .eq('company_users.user_id', userId) // Filter companies where the current user is a member
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Supabase fetch error:", error)
      throw new Error(`Failed to fetch companies from DB: ${error.message}`)
    }

    if (!data) {
        return { data: [], error: null } // Return empty array if no data
    }
    
    // Map the data correctly to CompanyWithMeta
    const companies: CompanyWithMeta[] = data.map(company => {
        // Find the specific company_user entry for the current user
        // Explicitly type `cu` based on the select query
        const currentUserMembership = company.company_users.find((cu: { user_id: string; role: string; is_primary: boolean }) => cu.user_id === userId);
        
        if (!currentUserMembership) {
            // This case should ideally not happen due to the .eq filter, 
            // but good for robustness or complex RLS scenarios.
            console.warn(`No membership found for user ${userId} in company ${company.id}, skipping map.`);
            return null; // Or handle as appropriate, maybe filter out later
        }

        // Explicitly map all fields from the base company record and the membership record
        // This ensures all CompanyWithMeta fields are present
        return {
            id: company.id,
            name: company.name,
            trading_name: company.trading_name,
            registration_number: company.registration_number,
            tax_number: company.tax_number,
            email: company.email,
            phone: company.phone,
            website: company.website,
            address: company.address,
            industry_tags: company.industry_tags || [], // Ensure array type
            capability_tags: company.capability_tags || [], // Ensure array type
            region_tags: company.region_tags || [], // Ensure array type
            verification_status: company.verification_status,
            verification_date: company.verification_date,
            subscription_tier: company.subscription_tier,
            subscription_status: company.subscription_status,
            employee_count_range: company.employee_count_range,
            founding_year: company.founding_year,
            created_at: company.created_at,
            updated_at: company.updated_at,
            // Fields from the join specifically for the current user
            is_primary: currentUserMembership.is_primary,
            role: currentUserMembership.role as CompanyRole // Cast role to the specific type
        }
    }).filter(c => c !== null) as CompanyWithMeta[]; // Filter out any nulls from mapping

    cache.set(cacheKey, companies, CACHE_TTL)
    return { data: companies, error: null }

  } catch (error) {
    console.error("Error in getCompanies:", error)
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

    // Call the create_company_with_owner function
    const { data: companyId, error: createError } = await supabase
      .rpc('create_company_with_owner', {
        company_name: validatedData.name,
        company_trading_name: validatedData.trading_name || null,
        company_registration_number: validatedData.registration_number || null,
        company_tax_number: validatedData.tax_number || null,
        company_email: validatedData.email || null,
        company_phone: validatedData.phone || null,
        company_website: validatedData.website || null,
        company_address: validatedData.address || {}
      })

    if (createError) throw createError
    if (!companyId) throw new Error('No company ID returned')

    // Fetch the created company
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (fetchError) throw fetchError
    if (!company) throw new Error('Created company not found')

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
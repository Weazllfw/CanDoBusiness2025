import type { Database } from './database.types'

// Base database types
export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']
export type CompanyUser = Database['public']['Tables']['company_users']['Row']
export type CompanyUserInsert = Database['public']['Tables']['company_users']['Insert']
export type CompanyUserUpdate = Database['public']['Tables']['company_users']['Update']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type CompanyVerificationRequest = Database['public']['Tables']['company_verification_requests']['Row']

// Role type
export const COMPANY_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type CompanyRole = typeof COMPANY_ROLES[number]

// Verification status type
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

// Location type
export interface CompanyLocation {
  latitude?: number
  longitude?: number
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
}

// Extended company type for form data
export interface CompanyFormData extends Omit<CompanyInsert, 'location' | 'address'> {
  industry_tags?: string[]
  capability_tags?: string[]
  region_tags?: string[]
  location?: CompanyLocation
  address?: Record<string, any>
  business_number?: string | null
  linkedin_url?: string | null
  description?: string | null
  logo_url?: string | null
}

// Extended types with metadata
export interface CompanyWithMeta extends Company {
  verification_status: VerificationStatus
  is_primary?: boolean
  industry_tags: string[]
  capability_tags: string[]
  region_tags: string[]
  verification_date?: string
  subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
  subscription_status?: 'active' | 'inactive' | 'cancelled'
  employee_count_range?: string
  founding_year?: number
  logo_url?: string | null
  description?: string | null
  role: CompanyRole
}

export interface CompanyUserWithProfile extends CompanyUser {
  user_profiles: Pick<UserProfile, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

// Helper type guards
export function isValidCompanyRole(role: string): role is CompanyRole {
  return COMPANY_ROLES.includes(role as CompanyRole)
}

export function hasRequiredPermission(userRole: CompanyRole, requiredRole: CompanyRole): boolean {
  const roleHierarchy: Record<CompanyRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
    viewer: 0
  }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export interface CompanyContextType {
  currentCompany: CompanyWithMeta | null
  companies: CompanyWithMeta[]
  isLoading: boolean
  error: string | null
  setCurrentCompany: (company: CompanyWithMeta) => Promise<void>
  refreshCompanies: () => Promise<void>
  createCompany: (company: CompanyFormData) => Promise<CompanyWithMeta>
} 
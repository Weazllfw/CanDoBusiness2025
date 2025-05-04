import type { Database } from './database.types'

// Base database types
export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']
export type CompanyUser = Database['public']['Tables']['company_users']['Row']
export type CompanyUserInsert = Database['public']['Tables']['company_users']['Insert']
export type CompanyUserUpdate = Database['public']['Tables']['company_users']['Update']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

// Role type
export const COMPANY_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type CompanyRole = typeof COMPANY_ROLES[number]

// Extended types with metadata
export interface CompanyWithMeta extends Omit<Company, 'trading_name'> {
  is_primary: boolean
  role: CompanyRole
  trading_name?: string | null
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
  createCompany: (company: CompanyInsert) => Promise<CompanyWithMeta>
} 
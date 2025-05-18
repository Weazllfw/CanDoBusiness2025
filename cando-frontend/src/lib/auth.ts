import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from '@/types/supabase'

export type AuthUser = {
  id: string
  email?: string
  user_metadata: {
    name?: string
  }
}

// Create a cached Supabase client for server components
export const createServerSupabaseClient = cache(() => {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
})

// Get the current session user
export async function getUser(): Promise<AuthUser | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      console.error('Auth error:', error)
      return null
    }

    return session.user as AuthUser
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Get user's companies with error handling
export async function getUserCompanies(userId: string) {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .rpc('get_user_companies', { user_id_param: userId })
    
    if (error) {
      console.error('Error fetching user companies:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching user companies:', error)
    return []
  }
} 
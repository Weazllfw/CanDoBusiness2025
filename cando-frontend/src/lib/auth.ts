import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type Database } from './types/database.types'

export type AuthError = {
  message: string
  status?: number
}

export async function signIn(email: string, password: string) {
  const supabase = createClientComponentClient<Database>()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: { message: error.message, status: error.status } }
    }

    return { data, error: null }
  } catch (err) {
    return {
      error: {
        message: 'An unexpected error occurred during sign in.',
        status: 500,
      },
    }
  }
}

export async function signUp(email: string, password: string) {
  const supabase = createClientComponentClient<Database>()
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return { error: { message: error.message, status: error.status } }
    }

    return { data, error: null }
  } catch (err) {
    return {
      error: {
        message: 'An unexpected error occurred during sign up.',
        status: 500,
      },
    }
  }
}

export async function signOut() {
  const supabase = createClientComponentClient<Database>()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { error: { message: error.message, status: error.status } }
    }
    return { error: null }
  } catch (err) {
    return {
      error: {
        message: 'An unexpected error occurred during sign out.',
        status: 500,
      },
    }
  }
}

export async function getSession() {
  const supabase = createClientComponentClient<Database>()
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      return { session: null, error: { message: error.message, status: error.status } }
    }
    return { session, error: null }
  } catch (err) {
    return {
      session: null,
      error: {
        message: 'An unexpected error occurred while getting session.',
        status: 500,
      },
    }
  }
} 
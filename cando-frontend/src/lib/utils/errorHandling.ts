import { PostgrestError } from '@supabase/supabase-js'

export class SupabaseError extends Error {
  constructor(
    message: string,
    public originalError: PostgrestError | Error,
    public code?: string
  ) {
    super(message)
    this.name = 'SupabaseError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class MessageError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'MessageError'
  }
}

export const MESSAGE_ERROR_CODES = {
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_CONTENT: 'INVALID_CONTENT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  COMPANY_NOT_FOUND: 'COMPANY_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  LATE_MODIFICATION: 'LATE_MODIFICATION',
} as const

export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onError,
  }: {
    retries?: number
    delay?: number
    backoff?: number
    onError?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  let lastError: Error | null = null
  let currentDelay = delay

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (onError) {
        onError(lastError, attempt)
      }

      if (attempt === retries) {
        break
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay))
      currentDelay *= backoff
    }
  }

  throw lastError || new Error('Operation failed after retries')
}

export function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('network') ||
    error.message.includes('connection') ||
    error.message.includes('timeout')
  )
}

export function handleSupabaseError(error: PostgrestError): never {
  const message = getErrorMessage(error)
  throw new SupabaseError(message, error, error.code)
}

function getErrorMessage(error: PostgrestError): string {
  switch (error.code) {
    case '23505':
      return 'This record already exists.'
    case '23503':
      return 'This operation would break data relationships.'
    case '42P01':
      return 'The requested resource was not found.'
    case '42501':
      return 'You do not have permission to perform this action.'
    default:
      return error.message || 'An unexpected error occurred.'
  }
}

export function createErrorBoundary<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  return operation().catch(error => {
    console.error('Operation failed:', error)
    return fallback
  })
}

export function handleMessageError(error: Error): MessageError {
  if (error instanceof MessageError) {
    return error
  }

  if (error instanceof SupabaseError) {
    switch (error.code) {
      case '23514': // Check constraint violation
        return new MessageError(
          'Invalid message content or recipients',
          MESSAGE_ERROR_CODES.INVALID_CONTENT
        )
      case '42501': // Permission denied
        return new MessageError(
          'You do not have permission to perform this action',
          MESSAGE_ERROR_CODES.PERMISSION_DENIED
        )
      case 'P0001': // Raised exception (rate limit)
        if (error.message.includes('Rate limit')) {
          return new MessageError(
            'Please wait before sending more messages',
            MESSAGE_ERROR_CODES.RATE_LIMIT,
            true
          )
        }
        break
      default:
        if (isNetworkError(error)) {
          return new MessageError(
            'Network error occurred. Please try again',
            MESSAGE_ERROR_CODES.NETWORK_ERROR,
            true
          )
        }
    }
  }

  return new MessageError(
    'An unexpected error occurred while processing your message',
    'UNKNOWN'
  )
} 
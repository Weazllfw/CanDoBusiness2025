type RateLimitEntry = {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private readonly defaultLimit = 100 // requests
  private readonly defaultWindow = 60 * 1000 // 1 minute

  isRateLimited(key: string, limit: number = this.defaultLimit, window: number = this.defaultWindow): boolean {
    const now = Date.now()
    const entry = this.limits.get(key)

    // If no entry exists or window has expired, create new entry
    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + window
      })
      return false
    }

    // Increment count and check if limit exceeded
    entry.count++
    if (entry.count > limit) {
      return true
    }

    return false
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key)
    if (!entry || Date.now() > entry.resetTime) {
      return this.defaultLimit
    }
    return Math.max(0, this.defaultLimit - entry.count)
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key)
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.defaultWindow
    }
    return entry.resetTime
  }

  clear(): void {
    this.limits.clear()
  }

  // Helper to generate rate limit keys
  static generateKey(action: string, userId: string): string {
    return `${action}:${userId}`
  }
}

export const rateLimiter = new RateLimiter()

// Rate limit error
export class RateLimitError extends Error {
  constructor(
    message: string = 'Too many requests',
    public resetTime: number = Date.now() + 60 * 1000
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
} 
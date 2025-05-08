'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const router = useRouter()

  useEffect(() => {
    // Go back to the previous page
    router.back()
    
    // Dispatch a custom event to open the messages modal
    const event = new CustomEvent('openMessages')
    window.dispatchEvent(event)
  }, [router])

  return null
} 
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/common/Button'

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member'], {
    required_error: 'Please select a role',
  }),
})

type InvitationFormData = z.infer<typeof invitationSchema>

interface TeamInvitationFormProps {
  companyId: string
  onInvitationSent?: () => void
}

export function TeamInvitationForm({ companyId, onInvitationSent }: TeamInvitationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
  })

  const onSubmit = async (data: InvitationFormData) => {
    setIsSubmitting(true)
    try {
      // TODO: Implement the actual invitation API call here
      const response = await fetch('/api/companies/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send invitation')
      }

      toast.success('Invitation sent successfully')
      reset()
      onInvitationSent?.()
    } catch (error) {
      toast.error('Failed to send invitation. Please try again.')
      console.error('Error sending invitation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <div className="mt-1">
          <input
            type="email"
            id="email"
            {...register('email')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="colleague@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <div className="mt-1">
          <select
            id="role"
            {...register('role')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a role</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        isLoading={isSubmitting}
        className="w-full"
      >
        Send Invitation
      </Button>
    </form>
  )
} 
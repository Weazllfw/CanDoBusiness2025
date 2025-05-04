'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { TeamInvitationForm } from '@/components/common/TeamInvitation/TeamInvitationForm'

export default function TeamManagementPage() {
  const params = useParams()
  const companyId = params.id as string
  const [pendingInvitations, setPendingInvitations] = useState([])

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/invitations`)
      if (response.ok) {
        const data = await response.json()
        setPendingInvitations(data)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  useEffect(() => {
    fetchPendingInvitations()
  }, [companyId])

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Invite team members to collaborate on your company profile and manage their roles.
            </p>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Invite Team Members</h2>
              <div className="mt-4 max-w-xl">
                <TeamInvitationForm
                  companyId={companyId}
                  onInvitationSent={fetchPendingInvitations}
                />
              </div>
            </div>
          </div>

          {pendingInvitations.length > 0 && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900">Pending Invitations</h2>
                <div className="mt-4">
                  <ul role="list" className="divide-y divide-gray-200">
                    {pendingInvitations.map((invitation: any) => (
                      <li key={invitation.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                            <p className="text-sm text-gray-500">Role: {invitation.role}</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/companies/invitations/${invitation.id}`, {
                                  method: 'DELETE',
                                })
                                if (response.ok) {
                                  fetchPendingInvitations()
                                }
                              } catch (error) {
                                console.error('Error canceling invitation:', error)
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-500"
                          >
                            Cancel Invitation
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 
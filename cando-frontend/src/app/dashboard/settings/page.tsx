'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/types/database.types'
import type { CompanyWithMeta } from '@/lib/types/company'
import { 
  PlusIcon, 
  BuildingOfficeIcon, 
  PencilIcon, 
  TrashIcon,
  ShieldCheckIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { deleteCompany } from '@/lib/db/company'
import { cn } from '@/lib/utils'
import { VerificationRequestForm } from '@/components/common/CompanyVerification/VerificationRequestForm'
import { ToastContainer } from '@/components/common/Toast/ToastContainer'

interface FormData {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface DeleteConfirmationModalProps {
  company: CompanyWithMeta;
  onConfirm: () => void;
  onCancel: () => void;
}

interface VerificationModalProps {
  company: CompanyWithMeta;
  onClose: () => void;
}

interface VerificationStatusInfo {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  text: string;
  className: string;
}

function DeleteConfirmationModal({ company, onConfirm, onCancel }: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900">Delete Company</h3>
        <p className="mt-2 text-sm text-gray-500">
          Are you sure you want to delete {company.name}? This action cannot be undone.
          {company.is_primary && (
            <span className="block mt-2 text-red-600 font-medium">
              Warning: This is your primary company. Deleting it will affect your account settings.
            </span>
          )}
        </p>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function VerificationModal({ company, onClose }: VerificationModalProps) {
  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Verify {company.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <VerificationRequestForm
          companyId={company.id}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

const getVerificationStatus = (company: CompanyWithMeta): VerificationStatusInfo | null => {
  if (company.verification_status === 'verified') {
    return {
      icon: ShieldCheckIcon,
      text: 'Verified Business',
      className: 'text-green-700',
    };
  }
  if (company.verification_status === 'pending') {
    return {
      icon: ClockIcon,
      text: 'Verification Pending',
      className: 'text-yellow-700',
    };
  }
  return null;
};

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithMeta | null>(null)
  const [companyToVerify, setCompanyToVerify] = useState<CompanyWithMeta | null>(null)
  const router = useRouter()
  const { companies, isLoading: companiesLoading, refreshCompanies } = useCompany()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateNewCompany = () => {
    router.push('/dashboard/companies/new')
  }

  const handleEditCompany = (companyId: string) => {
    router.push(`/dashboard/companies/${companyId}`)
  }

  const handleDeleteCompany = async (company: CompanyWithMeta) => {
    setCompanyToDelete(company)
  }

  const handleConfirmDelete = async () => {
    if (!companyToDelete) return

    try {
      setIsLoading(true)
      const { error } = await deleteCompany(companyToDelete.id)
      
      if (error) throw new Error(error)
      
      await refreshCompanies()
      setMessage({ type: 'success', text: 'Company deleted successfully' })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to delete company' 
      })
    } finally {
      setIsLoading(false)
      setCompanyToDelete(null)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const supabase = createClientComponentClient<Database>()

    try {
      const { error } = await supabase.auth.updateUser({ email: formData.email })
      
      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Email update confirmation has been sent to your new email address.',
      })
      setFormData(prev => ({ ...prev, email: '' }))
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update email',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match',
      })
      return
    }

    setIsLoading(true)
    setMessage(null)

    const supabase = createClientComponentClient<Database>()

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: formData.newPassword 
      })
      
      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Password updated successfully',
      })
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update password',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCompany = (company: CompanyWithMeta) => {
    setCompanyToVerify(company)
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 divide-y divide-gray-900/10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Account Settings
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Update your email and password
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="space-y-6">
                {message && (
                  <div
                    className={`rounded-md p-4 ${
                      message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                    role="alert"
                  >
                    <p
                      className={`text-sm ${
                        message.type === 'success' ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {message.text}
                    </p>
                  </div>
                )}

                {/* Email Update Form */}
                <form onSubmit={handleUpdateEmail}>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      New Email Address
                    </label>
                    <div className="mt-2">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                    >
                      {isLoading ? 'Updating...' : 'Update Email'}
                    </button>
                  </div>
                </form>

                {/* Password Update Form */}
                <form onSubmit={handleUpdatePassword} className="mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      New Password
                    </label>
                    <div className="mt-2">
                      <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Confirm New Password
                    </label>
                    <div className="mt-2">
                      <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                    >
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Company Management Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Company Management
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Manage your company profiles and settings.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="space-y-6">
                {message && (
                  <div
                    className={cn(
                      'rounded-md p-4',
                      message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
                    )}
                  >
                    <p
                      className={cn(
                        'text-sm',
                        message.type === 'success' ? 'text-green-800' : 'text-red-800'
                      )}
                    >
                      {message.text}
                    </p>
                  </div>
                )}

                {companiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-100 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-6">
                    <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No companies</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by creating a new company
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleCreateNewCompany}
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Create Company
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sm:flex sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold leading-6 text-gray-900">
                          Your Companies
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          A list of all your companies and their verification status.
                        </p>
                      </div>
                      <div className="mt-4 sm:ml-16 sm:mt-0">
                        <button
                          type="button"
                          onClick={handleCreateNewCompany}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                          Add Company
                        </button>
                      </div>
                    </div>

                    <ul role="list" className="divide-y divide-gray-100">
                      {companies.map((company) => {
                        const status = getVerificationStatus(company);
                        return (
                          <li key={company.id} className="flex items-center justify-between gap-x-6 py-5">
                            <div className="flex min-w-0 gap-x-4">
                              <div className="min-w-0 flex-auto">
                                <p className="text-sm font-semibold leading-6 text-gray-900">
                                  {company.name}
                                  {company.is_primary && (
                                    <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                      Primary
                                    </span>
                                  )}
                                </p>
                                {status && (
                                  <div className="mt-1 flex items-center gap-x-1.5">
                                    <status.icon className={cn("h-4 w-4", status.className)} />
                                    <p className={cn("text-xs", status.className)}>
                                      {status.text}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-none items-center gap-x-4">
                              {!status && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifyCompany(company)}
                                  className="hidden rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:block"
                                >
                                  Verify
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditCompany(company.id)}
                                className="rounded-md bg-white p-2 text-gray-400 hover:text-gray-500"
                              >
                                <span className="sr-only">Edit</span>
                                <PencilIcon className="h-5 w-5" aria-hidden="true" />
                              </button>
                              {!company.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCompany(company)}
                                  className="rounded-md bg-white p-2 text-gray-400 hover:text-gray-500"
                                >
                                  <span className="sr-only">Delete</span>
                                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {companyToDelete && (
        <DeleteConfirmationModal
          company={companyToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setCompanyToDelete(null)}
        />
      )}
      {companyToVerify && (
        <VerificationModal
          company={companyToVerify}
          onClose={() => setCompanyToVerify(null)}
        />
      )}
      <ToastContainer />
    </DashboardLayout>
  )
} 
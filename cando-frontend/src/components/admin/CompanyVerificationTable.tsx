'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { AdminCompanyDetails } from '@/types/admin' // Updated import

// Local interface removed, using AdminCompanyDetails from @/types/admin now

const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];

export default function CompanyVerificationTable() {
  const supabase = createClientComponentClient<Database>()
  const [companies, setCompanies] = useState<AdminCompanyDetails[]>([]) // Use AdminCompanyDetails
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [currentAdminNotes, setCurrentAdminNotes] = useState('')
  const [currentVerificationStatus, setCurrentVerificationStatus] = useState('')

  const fetchCompaniesForAdmin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_all_companies_with_owner_info')
      if (rpcError) throw rpcError
      setCompanies(data as AdminCompanyDetails[] || []) // Use AdminCompanyDetails
    } catch (e: any) {
      console.error('Error fetching companies for admin:', e)
      setError(e.message || 'Failed to fetch companies.')
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompaniesForAdmin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // supabase dependency removed as createClientComponentClient is stable

  const handleEdit = (company: AdminCompanyDetails) => { // Use AdminCompanyDetails
    setEditingCompanyId(company.company_id);
    setCurrentAdminNotes(company.admin_notes || '');
    setCurrentVerificationStatus(company.verification_status);
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setCurrentAdminNotes('');
    setCurrentVerificationStatus('');
  };

  const handleSave = async (companyId: string) => {
    if (!companyId) return;
    try {
      const { data: updatedCompany, error: updateError } = await supabase.rpc('admin_update_company_verification', {
        p_company_id: companyId,
        p_new_status: currentVerificationStatus,
        p_new_admin_notes: currentAdminNotes,
      });

      if (updateError) throw updateError;

      // Update the local state with the new company details
      setCompanies(prevCompanies => 
        prevCompanies.map(c => c.company_id === companyId ? { ...c, verification_status: updatedCompany.verification_status, admin_notes: updatedCompany.admin_notes } : c)
      );
      handleCancelEdit(); // Exit editing mode
      // Optionally, show a success notification
    } catch (e: any) {
      console.error('Error updating company verification:', e);
      setError(e.message || 'Failed to update company.');
      // Optionally, show an error notification
    }
  };

  if (isLoading) {
    return <p className="text-gray-600">Loading companies for verification...</p>
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Companies Awaiting Verification</h3>
      {companies.length === 0 ? (
        <p className="text-gray-500">No companies found or all are processed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Notes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.company_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{company.company_name}</div>
                    <div className="text-xs text-gray-500">{company.company_website || 'No website'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{company.profile_name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{company.owner_email}</div>
                  </td>
                  
                  {editingCompanyId === company.company_id ? (
                    <>
                      <td className="px-6 py-4">
                        <select 
                          value={currentVerificationStatus}
                          onChange={(e) => setCurrentVerificationStatus(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        >
                          {VERIFICATION_STATUSES.map(status => (
                            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <textarea 
                          value={currentAdminNotes}
                          onChange={(e) => setCurrentAdminNotes(e.target.value)}
                          rows={2}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Notes..."
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleSave(company.company_id)} className="text-primary-600 hover:text-primary-900 mr-3">Save</button>
                        <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.verification_status === 'verified' ? 'bg-green-100 text-green-800' : company.verification_status === 'pending' ? 'bg-blue-100 text-blue-800' : company.verification_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {company.verification_status.charAt(0).toUpperCase() + company.verification_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={company.admin_notes || ''}>{company.admin_notes || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleEdit(company)} className="text-primary-600 hover:text-primary-900">Edit</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 
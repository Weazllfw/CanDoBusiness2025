'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
// Attempt to use the centrally defined AdminCompanyDetails
// If this causes issues, ensure the definition in @/types/admin.ts is complete
// and includes all fields from CompanyDbRow as well as admin-specific fields.
import type { AdminCompanyDetails as ImportedAdminCompanyDetails } from '@/types/admin' 

import {
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  EyeIcon 
} from '@heroicons/react/24/outline'

// Local fallback AdminCompanyDetails interface definition
// This should ideally match or extend a base CompanyDbRow from supabase types
// and align with the actual structure returned by admin_get_all_companies_with_owner_info RPC
export interface AdminCompanyDetails {
  id: string; // Primary key, mapped from company_id
  name: string; // Company name, mapped from company_name
  owner_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  company_description?: string | null;
  company_website?: string | null;
  avatar_url?: string | null;
  verification_status?: string | null;
  admin_notes?: string | null;
  street_address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  major_metropolitan_area?: string | null;
  other_metropolitan_area_specify?: string | null; 
  contact_person_name?: string | null;
  contact_person_email?: string | null;
  contact_person_phone?: string | null;
  services?: string[] | null;
  self_attestation_completed?: boolean | null;
  business_number?: string | null;
  public_presence_links?: string[] | null;
  // Admin specific fields from join / RPC structure
  owner_email?: string | null;
  profile_name?: string | null;
  // Tier 2 fields (ensure these are included in the type used)
  tier2_document_type?: string | null;
  tier2_document_filename?: string | null;
  tier2_document_storage_path?: string | null;
  // Raw fields from RPC before mapping (if needed, but prefer mapped ones)
  company_id?: string; 
  company_name?: string;
}

const VERIFICATION_STATUS_OPTIONS = [
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'TIER1_PENDING', label: 'Tier 1 Pending' },
  { value: 'TIER1_VERIFIED', label: 'Tier 1 Verified' },
  { value: 'TIER1_REJECTED', label: 'Tier 1 Rejected' },
  { value: 'TIER2_PENDING', label: 'Tier 2 Pending' },
  { value: 'TIER2_FULLY_VERIFIED', label: 'Tier 2 Fully Verified' },
  { value: 'TIER2_REJECTED', label: 'Tier 2 Rejected' },
];

export default function CompanyVerificationTable() {
  const supabase = createClientComponentClient<Database>()
  // Use the local AdminCompanyDetails which is more comprehensive for now
  const [companies, setCompanies] = useState<AdminCompanyDetails[]>([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    verification_status: string;
    admin_notes: string;
  }>({ verification_status: '', admin_notes: '' });

  const fetchCompaniesForAdmin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_all_companies_with_owner_info')
      if (rpcError) throw rpcError
      
      const transformedData = (data as any[])?.map(item => ({
        ...item, // Spread all properties from the RPC result
        id: item.company_id, // Map company_id to id
        name: item.company_name, // Map company_name to name
        // Ensure all other fields expected by AdminCompanyDetails are present or mapped
      })) as AdminCompanyDetails[];
      setCompanies(transformedData || [])
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
  }, [])

  const handleDownloadDocument = async (filePath: string | null | undefined, filename: string | null | undefined) => {
    if (!filePath || !filename) {
      setDownloadError('File path or name is missing.');
      return;
    }
    setDownloadError(null);
    try {
      const { data, error: downloadErr } = await supabase.storage
        .from('tier2-verification-documents')
        .download(filePath);
      if (downloadErr) throw downloadErr;
      if (data) {
        const blob = new Blob([data], { type: data.type });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (e: any) {
      console.error('Error downloading Tier 2 document:', e);
      setDownloadError(e.message || 'Failed to download document.');
    }
  };

  const handleEdit = (company: AdminCompanyDetails) => {
    setEditingCompanyId(company.id); 
    setEditFormData({
      verification_status: company.verification_status || '',
      admin_notes: company.admin_notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setEditFormData({ verification_status: '', admin_notes: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (companyId: string) => {
    if (!companyId) return;
    try {
      const { data: updatedCompanyRow, error: updateError } = await supabase.rpc('admin_update_company_verification', {
        p_company_id: companyId,
        p_new_status: editFormData.verification_status,
        p_new_admin_notes: editFormData.admin_notes,
      });

      if (updateError) throw updateError;
      
      if (updatedCompanyRow) {
          setCompanies(prevCompanies =>
            prevCompanies.map(c =>
              c.id === companyId
                ? { 
                    ...c, 
                    verification_status: (updatedCompanyRow as any).verification_status, 
                    admin_notes: (updatedCompanyRow as any).admin_notes,
                    ...( (updatedCompanyRow as any).verification_status === 'TIER2_FULLY_VERIFIED' || 
                        (updatedCompanyRow as any).verification_status === 'TIER2_REJECTED' 
                        ? { 
                            tier2_document_type: null,
                            tier2_document_filename: null,
                            tier2_document_storage_path: null
                          }
                        : {}
                      )
                  }
                : c
            )
        );
      }
      handleCancelEdit();
    } catch (e: any) {
      console.error('Error updating company verification:', e);
      setError(e.message || 'Failed to update company.');
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
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Company Applications</h3>
      {downloadError && <p className="text-red-500 mb-4">Download Error: {downloadError}</p>}
      {companies.length === 0 ? (
        <p className="text-gray-500">No companies found or all are processed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {['Company', 'Owner', 'Business #', 'Attested', 'Public Links', 'Tier 2 Docs', 'Status', 'Admin Notes', 'Actions'].map(header => (
                  <th key={header} scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {companies.map((company) => (
                <tr key={company.id} className={editingCompanyId === company.id ? 'bg-yellow-50' : ''}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                    <div>{company.name}</div>
                    {company.company_website && (
                      <a href={company.company_website.startsWith('http') ? company.company_website : `https://${company.company_website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-800">
                        {company.company_website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    <div>{company.profile_name || 'N/A'}</div>
                    {company.owner_email && <a href={`mailto:${company.owner_email}`} className="text-xs text-primary-600 hover:text-primary-800">{company.owner_email}</a>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {company.business_number || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {company.self_attestation_completed ? 
                      <CheckCircleIcon className="h-6 w-6 text-green-500" title="Attested" /> : 
                      <XCircleIcon className="h-6 w-6 text-red-500" title="Not Attested" />}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-xs">
                    {company.public_presence_links && company.public_presence_links.length > 0 ? (
                      <ul className="list-none space-y-1">
                        {company.public_presence_links.map((link: string, index: number) => (
                          <li key={index} className="truncate">
                            <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">
                              {link.replace(/^https?:\/\//, '')}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {company.verification_status === 'TIER2_PENDING' && company.tier2_document_filename ? (
                      <div>
                        <p className="font-medium text-gray-700">{company.tier2_document_type}</p>
                        <p className="text-xs text-gray-600 truncate" title={company.tier2_document_filename}>{company.tier2_document_filename}</p>
                        <button
                          onClick={() => handleDownloadDocument(company.tier2_document_storage_path, company.tier2_document_filename)}
                          className="mt-1 inline-flex items-center text-xs text-primary-600 hover:text-primary-800"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4 mr-1" /> Download
                        </button>
                      </div>
                    ) : company.verification_status === 'TIER2_FULLY_VERIFIED' ? (
                        <span className="text-xs text-green-600">Doc Reviewed</span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  
                  {editingCompanyId === company.id ? (
                    <>
                      <td className="px-4 py-4 text-sm">
                        <select
                          name="verification_status"
                          value={editFormData.verification_status}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2"
                        >
                          {VERIFICATION_STATUS_OPTIONS.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <textarea
                          name="admin_notes"
                          value={editFormData.admin_notes}
                          onChange={handleInputChange}
                          rows={3}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="Add verification notes..."
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                        <button
                          onClick={() => handleSave(company.id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-2"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" /> Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" /> Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${company.verification_status === 'TIER1_VERIFIED' || company.verification_status === 'TIER2_FULLY_VERIFIED' ? 'bg-green-100 text-green-800' : 
                            company.verification_status === 'TIER1_PENDING' || company.verification_status === 'TIER2_PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            company.verification_status === 'TIER1_REJECTED' || company.verification_status === 'TIER2_REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                          `}>
                          {VERIFICATION_STATUS_OPTIONS.find(opt => opt.value === company.verification_status)?.label || company.verification_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={company.admin_notes || ''}>
                        {company.admin_notes || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                        <button
                          onClick={() => handleEdit(company)}
                          className="text-primary-600 hover:text-primary-700 inline-flex items-center"
                        >
                          <PencilSquareIcon className="h-5 w-5 mr-1" /> Edit Status
                        </button>
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
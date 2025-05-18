'use client'

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const tier2VerificationSchema = z.object({
  company_id: z.string().uuid(),
  document_type: z.enum(['government_id', 'proof_of_address'], {
    required_error: 'You must select a document type.',
  }),
  document_file: z
    .custom<FileList>(val => val instanceof FileList && val.length > 0, 'Please select a document to upload.')
    .refine(files => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `File size should be less than ${MAX_FILE_SIZE_MB}MB.`)
    .refine(
      files => ALLOWED_FILE_TYPES.includes(files?.[0]?.type),
      'Invalid file type. Allowed types: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT.'
    ),
});

type Tier2VerificationFormData = z.infer<typeof tier2VerificationSchema>;

interface CompanyForTier2Verification {
  id: string;
  name: string;
  verification_status: string | null;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'government_id', label: 'Government-issued Photo ID of Business Owner' },
  { value: 'proof_of_address', label: 'Proof of Business Address (e.g., utility bill, lease)' },
];

export default function ApplyForTier2VerificationPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const supabase = createClientComponentClient<Database>();

  const [company, setCompany] = useState<CompanyForTier2Verification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null); // To get user ID for checking ownership if needed

  const form = useForm<Tier2VerificationFormData>({
    resolver: zodResolver(tier2VerificationSchema),
    defaultValues: {
      company_id: companyId,
      document_type: undefined, // Or a default value like 'government_id'
      document_file: undefined,
    },
  });

  const fetchInitialData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id, name, verification_status, owner_id')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      setSubmissionError('Failed to load company data.');
      setCompany(null);
    } else if (companyData) {
      if (companyData.owner_id !== authUser?.id) {
        setSubmissionError('You are not authorized to manage this company.');
        setCompany(null);
        setIsLoading(false);
        // router.push('/dashboard'); // Or an appropriate page
        return;
      }
      setCompany(companyData as CompanyForTier2Verification);
      form.reset({ company_id: companyData.id, document_type: undefined, document_file: undefined });

      if (companyData.verification_status !== 'TIER1_VERIFIED') {
        alert(`This company (${companyData.name}) must be Tier 1 Verified to apply for Tier 2. Current status: ${companyData.verification_status || 'Unknown'}`);
        router.push(`/dashboard/companies`); // Or company detail page
      }
    }
    setIsLoading(false);
  }, [companyId, supabase, form, router]);


  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);


  const onSubmit = async (formData: Tier2VerificationFormData) => {
    if (!company || !user) {
      setSubmissionError('Company data or user session is missing. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (company.verification_status !== 'TIER1_VERIFIED') {
        setSubmissionError('Company is not eligible for Tier 2 verification.');
        return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const file = formData.document_file[0];
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`; // Sanitize and prefix
    // The RLS policy expects the company_id as the first part of the path if using (storage.foldername(name))[1]::uuid
    // However, for simplicity with public/ folder convention used in company logo, let's use a flat structure for now inside a company folder.
    // If issues arise, the storage path and RLS might need adjustment.
    // For Tier 2, the bucket is private, so 'public/' prefix is not semantically correct.
    // Path should be: {company_id}/{timestamped_filename}
    const filePath = `${company.id}/${fileName}`;

    try {
      // 1. Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tier2-verification-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Do not overwrite if file with same path exists (timestamp prefix helps)
        });

      if (uploadError) {
        console.error('Error uploading Tier 2 document:', uploadError);
        throw new Error(`Storage Error: ${uploadError.message}`);
      }

      if (!uploadData?.path) {
        throw new Error('File uploaded but no path returned from storage.');
      }
      
      // 2. Call the RPC function with document details
      const { error: rpcError } = await supabase.rpc('request_company_tier2_verification', {
        p_company_id: company.id,
        p_tier2_document_type: formData.document_type,
        p_tier2_document_filename: file.name, // Store original filename
        p_tier2_document_storage_path: uploadData.path, // Store the actual path from storage response
      });

      if (rpcError) {
        console.error('Error submitting Tier 2 verification via RPC:', rpcError);
        // Attempt to delete the orphaned file if RPC fails
        await supabase.storage.from('tier2-verification-documents').remove([uploadData.path]);
        throw new Error(`RPC Error: ${rpcError.message}`);
      }

      alert('Tier 2 verification request submitted successfully! You will be notified once reviewed.');
      router.push(`/dashboard/companies`); 

    } catch (err: any) {
      console.error('Tier 2 Submission Error:', err);
      setSubmissionError(err.message || 'An unexpected error occurred during Tier 2 submission.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading company details...</div>;
  }

  if (!company) {
    return <div className="container mx-auto px-4 py-8 text-red-600">{submissionError || 'Company not found or not authorized.'}</div>;
  }
  
  if (company.verification_status !== 'TIER1_VERIFIED') {
     return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                <h1 className="text-2xl font-semibold mb-4">Apply for Tier 2 Verification: {company.name}</h1>
                <p className="text-lg text-yellow-700 bg-yellow-100 p-4 rounded-md">
                    This company must be Tier 1 Verified before applying for Tier 2.
                    Current status: <strong>{company.verification_status || 'Unknown'}</strong>.
                </p>
                <div className="mt-6">
                    <Link href={`/dashboard/companies`} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        Back to My Companies
                    </Link>
                </div>
            </div>
        </div>
     );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-6">Apply for Tier 2 Verification: {company.name}</h1>
        
        <div className="prose prose-sm max-w-none bg-blue-50 p-4 rounded-md mb-6">
            <h3 className="text-base font-semibold">🔵 Tier 2: Fully Verified Requirements</h3>
            <p>To achieve Tier 2 verification, please provide the following:</p>
            <ul>
                <li>Everything from Tier 1 (already completed).</li>
                <li><strong>Plus ONE</strong> of the following documents:</li>
                <ul>
                    <li>Government-issued photo ID of the business owner.</li>
                    <li>Proof of business address (e.g., utility bill, lease agreement).</li>
                </ul>
            </ul>
            <h4 className="text-sm font-semibold mt-2">🚨 Important Data Handling Note:</h4>
            <p>
                The document you upload will be reviewed by our team and then <strong>deleted immediately</strong> after a verification decision (approved or rejected) is made. 
                We do not store these sensitive documents long-term.
            </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {submissionError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{submissionError}</span>
              </div>
            )}

            <div>
              <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
              <Controller
                name="document_type"
                control={form.control}
                render={({ field }) => (
                  <select
                    {...field}
                    id="document_type"
                    className="block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                  >
                    <option value="" disabled>Select a document type</option>
                    {DOCUMENT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              />
              {form.formState.errors.document_type && <p className="mt-1 text-sm text-red-500">{form.formState.errors.document_type.message}</p>}
            </div>

            <div>
              <label htmlFor="document_file" className="block text-sm font-medium text-gray-700 mb-1">Upload Document *</label>
              <input
                type="file"
                id="document_file"
                {...form.register('document_file')}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                accept={ALLOWED_FILE_TYPES.join(',')}
              />
              {form.formState.errors.document_file && <p className="mt-1 text-sm text-red-500">{form.formState.errors.document_file.message}</p>}
              <p className="mt-1 text-xs text-gray-500">Max file size: {MAX_FILE_SIZE_MB}MB. Allowed types: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT.</p>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
                <Link href={`/dashboard/companies`} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={isSubmitting || !form.formState.isValid}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Submitting for Tier 2...' : 'Submit for Tier 2 Verification'}
                </button>
            </div>
          </form>
      </div>
    </div>
  );
} 
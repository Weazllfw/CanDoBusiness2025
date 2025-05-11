/// <reference types="@react-three/fiber" />

'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import CreatableSelect from 'react-select/creatable';
import { type MultiValue } from 'react-select';
// import { toast } from 'sonner'; // Assuming you might use a toast library for notifications

// TODO: Potentially reuse selectStyles from CompanyForm.tsx or define globally
const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: '#D1D5DB',
      borderRadius: '0.375rem',
      minHeight: '38px',
    }),
    valueContainer: (provided: any) => ({ ...provided, padding: '1px 8px' }),
    input: (provided: any) => ({ ...provided, margin: '0px', paddingTop: '0px', paddingBottom: '0px' }),
    placeholder: (provided: any) => ({ ...provided, color: '#6B7280' }),
  };

const tier1VerificationSchema = z.object({
  company_id: z.string().uuid(), // To ensure we are updating the correct company
  self_attestation_completed: z.boolean().refine(value => value === true, {
    message: 'You must attest to the accuracy of the information.',
  }),
  business_number: z.string().min(1, 'Business number is required.'),
  public_presence_links: z.array(z.string().url('Please enter valid URLs for public presence links.')).optional(),
});

type Tier1VerificationFormData = z.infer<typeof tier1VerificationSchema>;

interface CompanyForVerification {
  id: string;
  name: string;
  verification_status: string | null;
  self_attestation_completed: boolean | null;
  business_number: string | null;
  public_presence_links: string[] | null;
}

export default function ApplyForVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const supabase = createClientComponentClient<Database>();

  const [company, setCompany] = useState<CompanyForVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Tier1VerificationFormData>({
    resolver: zodResolver(tier1VerificationSchema),
    defaultValues: {
      company_id: companyId,
      self_attestation_completed: false,
      business_number: '',
      public_presence_links: [],
    },
  });

  useEffect(() => {
    if (!companyId) return;

    const fetchCompany = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, verification_status, self_attestation_completed, business_number, public_presence_links')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('Error fetching company:', error);
        setSubmissionError('Failed to load company data.');
        setCompany(null);
      } else if (data) {
        setCompany(data as CompanyForVerification); // Added type assertion
        form.reset({
          company_id: data.id,
          self_attestation_completed: !!data.self_attestation_completed,
          business_number: data.business_number || '',
          public_presence_links: data.public_presence_links || [],
        });
        // Redirect if company is not eligible for Tier 1 application
        if (data.verification_status && !['UNVERIFIED', 'TIER1_REJECTED'].includes(data.verification_status)) {
            // toast.info(`This company (${data.name}) is not currently eligible for a new Tier 1 verification application.`);
            alert(`This company (${data.name}) is not currently eligible for a new Tier 1 verification application. Status: ${data.verification_status}`);
            router.push(`/dashboard/companies`); // Or company detail page
        }
      }
      setIsLoading(false);
    };
    fetchCompany();
  }, [companyId, supabase, form, router]);

  const onSubmit = async (formData: Tier1VerificationFormData) => {
    if (!company) {
      setSubmissionError('Company data not loaded.');
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Call the RPC function instead of a direct update
      const { error } = await supabase.rpc('request_company_tier1_verification', {
        p_company_id: company.id,
        p_business_number: formData.business_number,
        p_public_presence_links: formData.public_presence_links,
        p_self_attestation_completed: formData.self_attestation_completed,
      });

      if (error) {
        console.error('Error submitting verification via RPC:', error);
        setSubmissionError(`Failed to submit verification: ${error.message}`);
        // toast.error(`Failed to submit verification: ${error.message}`);
      } else {
        // toast.success('Tier 1 verification request submitted successfully!');
        alert('Tier 1 verification request submitted successfully!');
        router.push(`/dashboard/companies`); // Or company detail page
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setSubmissionError(err.message || 'An unexpected error occurred.');
      // toast.error(err.message || 'An unexpected error occurred.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading company details...</div>;
  }

  if (!company) {
    return <div className="container mx-auto px-4 py-8 text-red-600">{submissionError || 'Company not found.'}</div>;
  }
  
  // Basic check, should be refined with actual status check from useEffect
  const isEligible = company.verification_status === 'UNVERIFIED' || company.verification_status === 'TIER1_REJECTED';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-6">Apply for Tier 1 Verification: {company.name}</h1>
        
        {isEligible ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {submissionError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{submissionError}</span>
              </div>
            )}

            <div>
              <label htmlFor="business_number" className="block text-sm font-medium text-gray-700 mb-1">Corporate / Business Number *</label>
              <input
                type="text"
                id="business_number"
                {...form.register('business_number')}
                className="block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md"
              />
              {form.formState.errors.business_number && <p className="mt-1 text-sm text-red-500">{form.formState.errors.business_number.message}</p>}
              <p className="mt-1 text-xs text-gray-500">Enter your Federal Corporation Number or Provincial Business Number (BN).</p>
            </div>

            <div>
                <label htmlFor="public_presence_links" className="block text-sm font-medium text-gray-700 mb-1">Public Presence Links (Optional)</label>
                <Controller
                    name="public_presence_links"
                    control={form.control}
                    render={({ field }) => (
                        <CreatableSelect
                            {...field}
                            isMulti
                            options={[]}
                            styles={selectStyles} 
                            className="w-full sm:text-sm"
                            classNamePrefix="select"
                            placeholder="Enter links (e.g., LinkedIn, Website) and press Enter..."
                            value={field.value?.map(val => ({ value: val, label: val })) || []}
                            onChange={(selectedOptions: MultiValue<{ value: string; label: string }>) => 
                                field.onChange(selectedOptions ? selectedOptions.map((option: { value: string; label: string }) => option.value) : [])
                            }
                            formatCreateLabel={(inputValue: string) => `Add link: "${inputValue}"...`}
                            instanceId="public-presence-links-verification-select"
                        />
                    )}
                />
                {/* Handling array field errors */}
                {Array.isArray(form.formState.errors.public_presence_links) && 
                    form.formState.errors.public_presence_links.map((error, index) => 
                        error && <p key={index} className="mt-1 text-sm text-red-500">{error.message}</p>
                )}
                {form.formState.errors.public_presence_links && !Array.isArray(form.formState.errors.public_presence_links) && (
                     <p className="mt-1 text-sm text-red-500">{(form.formState.errors.public_presence_links as any).message || 'Invalid link format.'}</p>
                )}
                 <p className="mt-1 text-xs text-gray-500">Provide links to your company website, LinkedIn profile, or other public business pages. Each link must be a valid URL.</p>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="self_attestation_completed"
                  type="checkbox"
                  {...form.register('self_attestation_completed')}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="self_attestation_completed" className="font-medium text-gray-700">Self-Attestation *</label>
                <p className="text-gray-500">I certify I am authorized to represent this business and all submitted information is true.</p>
              </div>
            </div>
            {form.formState.errors.self_attestation_completed && <p className="mt-1 text-sm text-red-500">{form.formState.errors.self_attestation_completed.message}</p>}

            <div className="flex justify-end space-x-3">
                <Link href={`/company/${companyId}/edit`} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={isSubmitting || !form.formState.isValid}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit for Tier 1 Verification'}
                </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-yellow-700 bg-yellow-100 p-4 rounded-md">
              This company ({company.name}) is not currently eligible to apply for Tier 1 verification. Its current status is: <strong>{company.verification_status || 'Unknown'}</strong>.
            </p>
            <div className="mt-6">
                <Link href={`/dashboard/companies`} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Back to My Companies
                </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
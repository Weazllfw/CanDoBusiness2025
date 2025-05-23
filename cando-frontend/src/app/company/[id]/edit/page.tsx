'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useParams } from 'next/navigation'
import CompanyForm, { type CompanyFormData } from '@/components/company/CompanyForm'
import type { Database } from '@/types/supabase'
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

type CompanyDbRow = Database['public']['Tables']['companies']['Row'];

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient<Database>();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchedCompanyData, setFetchedCompanyData] = useState<CompanyDbRow | null>(null);
  const [formInitialData, setFormInitialData] = useState<Partial<CompanyFormData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const companyIdFromParams = params?.id as string;

  const fetchCompanyData = useCallback(async (idToFetch: string) => {
    if (!idToFetch) {
        setError("Company ID is missing for fetch.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('id, name, description, industry, website, avatar_url, owner_id, verification_status')
        .eq('id', idToFetch)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch company data: ${fetchError.message}`);
      }
      if (!data) {
        throw new Error('Company not found.');
      }
      
      setFetchedCompanyData(data as CompanyDbRow);

      const initialDataForForm: Partial<CompanyFormData> = {
        name: data.name,
        description: data.description || '',
        website: data.website || '',
        industry: data.industry || '',
        avatar_url: data.avatar_url || null,
      };
      setFormInitialData(initialDataForForm);

    } catch (e: any) {
      console.error('Error fetching company:', e);
      setError(e.message);
      setFetchedCompanyData(null);
      setFormInitialData(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (companyIdFromParams) {
      fetchCompanyData(companyIdFromParams);
    } else {
      setError("No company ID provided in the URL.");
      setIsLoading(false);
    }
  }, [companyIdFromParams, fetchCompanyData]);

  const handleUpdate = async (formData: CompanyFormData, newLogoFile?: File | null) => {
    if (!companyIdFromParams) {
      toast.error("Company ID is missing. Cannot update.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        toast.error('You must be logged in to edit a company.');
        router.push('/auth/login');
        return;
      }

      if (fetchedCompanyData?.owner_id && session.user.id !== fetchedCompanyData.owner_id) {
          toast.error("You are not authorized to edit this company.");
          setIsLoading(false);
          return;
      }
      
      let newAvatarUrl = fetchedCompanyData?.avatar_url || null;

      if (newLogoFile) {
        const fileExt = newLogoFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${companyIdFromParams}/${fileName}`;
        
        toast.loading('Uploading new logo...', { id: 'logo-upload' });
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, newLogoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          toast.error(`Failed to upload new logo: ${uploadError.message}`, { id: 'logo-upload' });
          throw uploadError;
        }
        toast.success('New logo uploaded!', { id: 'logo-upload' });

        const { data: publicUrlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);
        
        newAvatarUrl = publicUrlData.publicUrl ? `${publicUrlData.publicUrl}?t=${new Date().getTime()}` : null;
        
        if (!newAvatarUrl) {
            const fallbackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos/${filePath}`;
            newAvatarUrl = `${fallbackUrl}?t=${new Date().getTime()}`;
            console.warn('Could not get public URL directly, constructed fallback:', newAvatarUrl);
            if (!uploadData) {
                 toast.error('Logo uploaded, but could not determine its URL. Please refresh.');
            }
        }
      } else if (formData.avatar_url === null && fetchedCompanyData?.avatar_url) {
      }

      const companyUpdateData: Partial<CompanyDbRow> = {
        name: formData.name,
        description: formData.description,
        website: formData.website,
        industry: formData.industry,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      toast.loading('Updating company...', { id: 'company-update' });
      const { error: updateError } = await supabase
        .from('companies')
        .update(companyUpdateData)
        .eq('id', companyIdFromParams);

      if (updateError) {
        toast.error(`Failed to update company: ${updateError.message}`, { id: 'company-update' });
        throw updateError;
      }
      
      toast.success('Company updated successfully!', { id: 'company-update' });
      router.push(`/company/${companyIdFromParams}`);
      router.refresh();

    } catch (e: any) {
      console.error('Error updating company:', e);
      const errorMessage = e.message || 'An unexpected error occurred while updating company.';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !formInitialData) {
    return <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8"><p>Loading company details...</p></div>;
  }
  
  if (error && !formInitialData) {
      return <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8"><p className="text-red-500">Error: {error}</p></div>;
  }

  if (!formInitialData) {
    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <p>Company not found or unable to load details.</p>
            <Link href="/dashboard/companies" className="text-primary-600 hover:underline mt-4 block">Return to My Companies</Link>
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Edit Company Profile</h1>
      
      {fetchedCompanyData && companyIdFromParams && (fetchedCompanyData.verification_status === 'UNVERIFIED' || fetchedCompanyData.verification_status === 'TIER1_REJECTED') && (
        <div className="mb-6 p-4 border border-blue-300 bg-blue-50 rounded-md">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">Company Verification</h2>
          <p className="text-sm text-blue-600 mb-3">
            This company is currently <strong>{fetchedCompanyData.verification_status?.toLowerCase().replace('_', ' ')}</strong>. 
            Complete the verification process to enhance trust and unlock more features.
          </p>
          <Link 
            href={`/company/${companyIdFromParams}/apply-for-verification`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Apply for Tier 1 Verification
          </Link>
        </div>
      )}

      {fetchedCompanyData && companyIdFromParams && fetchedCompanyData.verification_status === 'TIER1_VERIFIED' && (
        <div className="mb-6 p-4 border border-green-300 bg-green-50 rounded-md">
          <h2 className="text-lg font-semibold text-green-700 mb-2">🌟 Tier 1 Verified!</h2>
          <p className="text-sm text-green-600 mb-3">
            Congratulations! This company is Tier 1 Verified. 
            Apply for Tier 2 Verification for the highest level of trust and a &quot;Fully Verified Business&quot; badge.
          </p>
          <Link 
            href={`/company/${companyIdFromParams}/apply-for-tier2-verification`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Apply for Tier 2 Verification
          </Link>
        </div>
      )}

      <CompanyForm 
        onSubmit={handleUpdate} 
        initialData={formInitialData}
        isLoading={isLoading} 
        submissionError={error}
      />
    </div>
  );
} 
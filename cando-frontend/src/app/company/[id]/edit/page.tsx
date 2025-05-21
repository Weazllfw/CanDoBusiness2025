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

  const [isLoading, setIsLoading] = useState(false);
  const [fetchedCompanyData, setFetchedCompanyData] = useState<CompanyDbRow | null>(null);
  const [formInitialData, setFormInitialData] = useState<(Partial<CompanyFormData> & { owner_id?: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

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
        .select('*')
        .eq('id', idToFetch)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch company data: ${fetchError.message}`);
      }
      if (!data) {
        throw new Error('Company not found.');
      }
      
      setFetchedCompanyData(data);
      setCompanyId(data.id);

      const companyFormData: Partial<CompanyFormData> & { owner_id?: string | null } = {
        name: data.name,
        description: data.description || '',
        website: data.website || '',
        industry: data.industry || '',
        avatar_url: data.avatar_url || null,
        street_address: data.street_address || '',
        city: data.city || '',
        province: (data.province as CompanyFormData['province']) || '',
        postal_code: data.postal_code || '',
        major_metropolitan_area: data.major_metropolitan_area || '',
        other_metropolitan_area_specify: data.other_metropolitan_area_specify || '',
        contact_person_name: data.contact_person_name || '',
        contact_person_email: data.contact_person_email || '',
        contact_person_phone: data.contact_person_phone || '',
        services: data.services || [],
        owner_id: data.owner_id,
        banner_url: data.banner_url || null,
        year_founded: data.year_founded || null,
        business_type: data.business_type || '',
        employee_count: data.employee_count || '',
        revenue_range: data.revenue_range || '',
        social_media_links: (data.social_media_links as any) || [],
        certifications: data.certifications || [],
        tags: data.tags || [],
        self_attestation_completed: data.self_attestation_completed || false,
        business_number: data.business_number || '',
        public_presence_links: data.public_presence_links || [],
      };
      setFormInitialData(companyFormData);

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
      setFetchedCompanyData(null);
      setFormInitialData(null);
    }
  }, [companyIdFromParams, fetchCompanyData]);

  const handleUpdate = async (formData: CompanyFormData, newLogoFile?: File | null) => {
    if (!companyIdFromParams) {
      setError("Company ID is missing, cannot update.");
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
          throw new Error("You are not authorized to edit this company.");
      }
      
      let newAvatarUrl = fetchedCompanyData?.avatar_url || null;

      if (newLogoFile) {
        const fileExt = newLogoFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${companyIdFromParams}/${fileName}`;
        
        toast.loading('Uploading logo...', { id: 'logo-upload' });
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, newLogoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          toast.error(`Failed to upload new logo: ${uploadError.message}`, { id: 'logo-upload' });
          throw new Error(`Failed to upload new logo: ${uploadError.message}`);
        }
        toast.success('Logo uploaded!', { id: 'logo-upload' });

        const { data: publicUrlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);
        
        if (!publicUrlData || !publicUrlData.publicUrl) {
          console.warn('Logo uploaded, but could not retrieve its public URL immediately. This might be due to RLS or eventual consistency.');
          newAvatarUrl = publicUrlData.publicUrl ? `${publicUrlData.publicUrl}?t=${new Date().getTime()}` : null;
          if (!newAvatarUrl && uploadData?.path) {
            newAvatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos/${uploadData.path}?t=${new Date().getTime()}`;
          } else if (!newAvatarUrl) {
            toast.error('Could not determine new logo URL after upload.');
          }
        } else {
             newAvatarUrl = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`;
        }

      } else if (formData.avatar_url === null && fetchedCompanyData?.avatar_url) {
        newAvatarUrl = null; 
      }

      const companyUpdateData = {
        name: formData.name,
        description: formData.description,
        website: formData.website,
        industry: formData.industry,
        avatar_url: newAvatarUrl,
        street_address: formData.street_address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        major_metropolitan_area: formData.major_metropolitan_area,
        other_metropolitan_area_specify: formData.other_metropolitan_area_specify,
        contact_person_name: formData.contact_person_name,
        contact_person_email: formData.contact_person_email,
        contact_person_phone: formData.contact_person_phone,
        services: formData.services,
        owner_id: fetchedCompanyData?.owner_id,
        banner_url: formData.banner_url,
        year_founded: formData.year_founded,
        business_type: formData.business_type,
        employee_count: formData.employee_count,
        revenue_range: formData.revenue_range,
        social_media_links: formData.social_media_links,
        certifications: formData.certifications,
        tags: formData.tags,
        self_attestation_completed: formData.self_attestation_completed,
        business_number: formData.business_number,
        public_presence_links: formData.public_presence_links,
        updated_at: new Date().toISOString(),
      };

      delete (companyUpdateData as any).id; 

      toast.loading('Updating company...', { id: 'company-update' });
      const { error: updateError } = await supabase
        .from('companies')
        .update(companyUpdateData)
        .eq('id', companyIdFromParams);

      if (updateError) {
        toast.error(`Failed to update company: ${updateError.message}`, { id: 'company-update' });
        throw new Error(`Failed to update company: ${updateError.message}`);
      }
      
      toast.success('Company updated successfully!', { id: 'company-update' });
      router.push(`/company/${companyIdFromParams}`);

    } catch (e: any) {
      console.error('Error updating company:', e);
      const errorMessage = e.message || 'An unexpected error occurred while updating company.';
      setError(errorMessage);
      toast.error(errorMessage);
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
    return <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8"><p>Loading...</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Edit Company Profile</h1>
      
      {fetchedCompanyData && companyId && (fetchedCompanyData.verification_status === 'UNVERIFIED' || fetchedCompanyData.verification_status === 'TIER1_REJECTED') && (
        <div className="mb-6 p-4 border border-blue-300 bg-blue-50 rounded-md">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">Company Verification</h2>
          <p className="text-sm text-blue-600 mb-3">
            This company is currently <strong>{fetchedCompanyData.verification_status?.toLowerCase().replace('_', ' ')}</strong>. 
            Complete the verification process to enhance trust and unlock more features.
          </p>
          <Link 
            href={`/company/${companyId}/apply-for-verification`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Apply for Tier 1 Verification
          </Link>
        </div>
      )}

      {fetchedCompanyData && companyId && fetchedCompanyData.verification_status === 'TIER1_VERIFIED' && (
        <div className="mb-6 p-4 border border-green-300 bg-green-50 rounded-md">
          <h2 className="text-lg font-semibold text-green-700 mb-2">🌟 Tier 1 Verified!</h2>
          <p className="text-sm text-green-600 mb-3">
            Congratulations! This company is Tier 1 Verified. 
            Apply for Tier 2 Verification for the highest level of trust and a "Fully Verified Business" badge.
          </p>
          <Link 
            href={`/company/${companyId}/apply-for-tier2-verification`}
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
        companyId={companyId || undefined} 
        submissionError={error}
      />
    </div>
  );
} 
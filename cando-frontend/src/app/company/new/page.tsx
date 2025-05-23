'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient, type Session } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import CompanyForm, { type CompanyFormData } from '@/components/company/CompanyForm'
import type { Database } from '@/types/supabase'
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

export default function NewCompanyPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        toast.error('You must be logged in to create a company.');
        router.push('/login');
        return;
      }
      setSession(data.session);
      // console.log('[NewCompanyPage] Current User ID (auth.uid()):', data.session.user.id);
    };
    getSession();
  }, [supabase, router]);

  const handleCreate = async (formData: CompanyFormData, logoFile?: File | null) => {
    if (!session?.user) {
      toast.error('User session not found. Please log in again.');
      return;
    }
    // console.log('Submitting form data:', formData);
    // console.log('Logo file:', logoFile);

    try {
      const companyInsertData = {
        ...formData,
        owner_id: session.user.id,
        // Ensure all DB required fields are present and correctly mapped if names differ
        // Redundant explicit assignments if formData already has these exact names:
        // name: formData.name, (already spread)
        // description: formData.description, (already spread)
        // industry: formData.industry, (already spread)
        // website: formData.website, (already spread)
        // city: formData.city, (already spread)
        // postal_code: formData.postal_code, (already spread)
        // year_founded: formData.year_founded ? parseInt(String(formData.year_founded), 10) : undefined, (already spread, coercion is in schema)
        // employee_count: formData.employee_count, (already spread)
        // business_type: formData.business_type, (already spread)
        // services: formData.services, (already spread)
        
        // Corrected mappings for fields that were mismatched or missing:
        // REMOVED lines for province, street_address, contact_person_email, contact_person_phone
        // as they are no longer in the simplified CompanyFormData for MVP

        // self_attestation_completed, business_number, public_presence_links are now in formData due to schema change
        // avatar_url and banner_url are also in formData

        // Removed: country: formData.country, (not in CompanyFormData)
        // Removed: address_line2: formData.address_line2, (not in CompanyFormData)
      };

      // Remove any fields from formData that are not actual DB columns if spread too liberally
      // For example, if CompanyFormData had temporary UI-only fields.
      // However, current CompanyFormData seems to map well to DB columns now.

      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert(companyInsertData)
        .select()
        .single();

      if (error) throw error;
      if (!newCompany) throw new Error('Company creation failed, no data returned.');

      toast.success('Company profile created! Uploading logo...');

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${newCompany.id}/${fileName}`;

        // console.log('[NewCompanyPage] Uploading logo. Company ID:', newCompany.id, 'File path:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: true, 
          });

        if (uploadError) {
          toast.error(`Logo upload failed: ${uploadError.message}. Company created without logo.`);
        } else {
          // Update company with logo_url
          const publicUrl = supabase.storage
            .from('company-logos')
            .getPublicUrl(filePath).data.publicUrl;
          const { error: updateError } = await supabase
            .from('companies')
            .update({ avatar_url: publicUrl })
            .eq('id', newCompany.id);
          if (updateError) {
            toast.error(`Failed to update company with logo URL: ${updateError.message}`);
          }
        }
      }
      router.push(`/company/${newCompany.id}`);
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(`Failed to create company: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Create New Company Profile</h1>
      <p className="text-sm text-gray-600 mb-8">Fill out the details below to establish your company&apos;s presence on CanDoBusiness.</p>
      <CompanyForm 
        onSubmit={handleCreate} 
      />
    </div>
  )
} 
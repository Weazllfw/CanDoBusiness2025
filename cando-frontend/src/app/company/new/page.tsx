'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import CompanyForm, { type CompanyFormData } from '@/components/company/CompanyForm'
import type { Database } from '@/types/supabase'
import { v4 as uuidv4 } from 'uuid';

export default function NewCompanyPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleCreate = async (formData: CompanyFormData, newLogoFile?: File | null) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        // Consider redirecting to login or showing a more user-friendly error
        throw new Error('Authentication required. Please log in.')
      }
      console.log('[NewCompanyPage] Current User ID (auth.uid()):', session.user.id);
      const userId = session.user.id

      // 1. Prepare company data for insertion
      const { 
        avatar_url,
        // Fields from form that need remapping to DB column names
        province,
        major_metropolitan_area,
        other_metropolitan_area_specify,
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        self_attestation_completed,
        business_number,
        public_presence_links,
        // year_founded is now directly in restOfFormData and matches DB
        ...restOfFormData // Contains name, description, website, industry, services, year_founded, business_type, employee_count, revenue_range, banner_url, social_media_links, certifications, tags etc.
      } = formData; 

      const companyInsertData = {
        ...restOfFormData, // Spread fields that match DB column names (e.g., services, name, industry)
        owner_id: userId,
        
        // Map fields that differ from DB column names or for clarity
        province: province, // Corrected: DB column is 'province'
        major_metropolitan_area: major_metropolitan_area,
        other_metropolitan_area_specify: other_metropolitan_area_specify,
        contact_person_name: contact_person_name,
        contact_person_email: contact_person_email,
        contact_person_phone: contact_person_phone,
        
        // Map Tier 1 verification fields to their DB column names
        self_attestation_completed: self_attestation_completed, // DB column is 'self_attestation_completed'
        business_number: business_number, // Corrected: DB column is 'business_number'
        public_presence_links: public_presence_links, // Corrected: DB column is 'public_presence_links'
        
        // avatar_url is intentionally omitted here, will be updated after logo upload if provided
        // location field is deprecated and removed from CompanyForm
      };

      // 2. Create the company record
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert(companyInsertData) // Use the data without avatar_url
        .select('id') // Only need id for filePath and routing, avatar_url is set later
        .single();

      if (createError) {
        console.error('Error creating company:', createError);
        throw new Error(`Failed to create company: ${createError.message}`);
      }
      if (!newCompany) {
        throw new Error('Failed to create company or retrieve its ID.');
      }

      let finalAvatarUrl = null;

      // 3. If a new logo file is provided, upload it
      if (newLogoFile && newCompany.id) {
        const fileExt = newLogoFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`; // Generate a unique file name
        const filePath = `${newCompany.id}/${fileName}`;

        console.log('[NewCompanyPage] Uploading logo. Company ID:', newCompany.id, 'File path:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, newLogoFile, {
            cacheControl: '3600',
            upsert: true, // Use upsert to allow replacing if a file with the same name exists (e.g., re-upload)
          });

        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          // Decide if this is a critical error. The company is created.
          // Maybe log it and proceed, or show a partial success message.
          // For now, we'll throw, but in a real app, you might want to inform the user
          // that the company was created but the logo upload failed.
          throw new Error(`Company created, but failed to upload logo: ${uploadError.message}`);
        }

        // 4. Get the public URL of the uploaded logo
        const { data: publicUrlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error('Could not get public URL for logo');
            // Similar to upload error, handle this. Maybe the company is fine, but no logo URL.
            throw new Error('Logo uploaded, but could not retrieve its public URL.');
        }
        finalAvatarUrl = publicUrlData.publicUrl;

        // 5. Update the company record with the avatar_url
        const { error: updateError } = await supabase
          .from('companies')
          .update({ avatar_url: finalAvatarUrl })
          .eq('id', newCompany.id);

        if (updateError) {
          console.error('Error updating company with avatar_url:', updateError);
          // Company and logo exist, but linking failed. Critical enough to throw?
          // Or inform user of partial success.
          throw new Error(`Company and logo created, but failed to link logo: ${updateError.message}`);
        }
      }

      router.refresh() // Refresh server components
      router.push(`/company/${newCompany.id}`) // Navigate to the new company page
    } catch (error: any) {
      console.error('Detailed error in handleCreate:', error);
      setError(error.message || 'An unexpected error occurred during company creation.');
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Create New Company</h1>
      <CompanyForm 
        onSubmit={handleCreate} 
        isLoading={isLoading} 
        submissionError={error}
      />
    </div>
  )
} 
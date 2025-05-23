'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'

const MAX_COMPANY_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000; // Or adjust for MVP, e.g., 250

// Simplified MVP Zod schema
const companySchema = z.object({
  name: z.string().min(1, "Company name is required.").max(MAX_COMPANY_NAME_LENGTH, `Company name cannot exceed ${MAX_COMPANY_NAME_LENGTH} characters.`),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`).optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')), // Simple text input for MVP
  website: z.string().url("Invalid URL format. Make sure to include http:// or https://").optional().or(z.literal('')),
  avatar_url: z.string().nullable().optional(), // For storing the URL, file handled separately
});

export type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData>; // Simplified initialData
  onSubmit: (data: CompanyFormData, newLogoFile?: File | null) => Promise<void>;
  isLoading?: boolean;
  submissionError?: string | null;
}

export default function CompanyForm({ initialData, onSubmit, isLoading, submissionError }: CompanyFormProps) {
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.avatar_url || null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      website: initialData?.website || '',
      industry: initialData?.industry || '',
      avatar_url: initialData?.avatar_url || null,
    },
  });
  const { reset } = form;

  const descriptionValue = form.watch('description');
  const nameValue = form.watch('name');

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        description: initialData.description || '',
        website: initialData.website || '',
        industry: initialData.industry || '',
        avatar_url: initialData.avatar_url || null,
      });
      if (initialData.avatar_url) {
        setLogoPreview(initialData.avatar_url);
      } else {
        setLogoPreview(null);
      }
    } else {
      reset({
        name: '',
        description: '',
        website: '',
        industry: '',
        avatar_url: null,
      });
      setLogoPreview(null);
    }
  }, [initialData, reset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('avatar_url', null, { shouldValidate: false, shouldDirty: true }); 
    } else {
      setSelectedLogoFile(null);
      setLogoPreview(initialData?.avatar_url || null);
      form.setValue('avatar_url', initialData?.avatar_url || null, { shouldValidate: false, shouldDirty: true }); 
    }
  };

  const handleSubmit = async (data: CompanyFormData) => {
    await onSubmit(data, selectedLogoFile);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
      {submissionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Submission Error: </strong>
          <span className="block sm:inline">{submissionError}</span>
        </div>
      )}
      
      <div className="space-y-6 pt-8 sm:pt-10 sm:space-y-5">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Basic details about the company for MVP.</p>
        </div>
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Company Name * </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="name" {...form.register('name')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {nameValue?.length || 0} / {MAX_COMPANY_NAME_LENGTH}
              </p>
              {form.formState.errors.name && <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Description </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <textarea id="description" {...form.register('description')} rows={3} className="max-w-lg shadow-sm block w-full focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {descriptionValue?.length || 0} / {MAX_DESCRIPTION_LENGTH}
              </p>
              {form.formState.errors.description && <p className="mt-1 text-sm text-red-500">{form.formState.errors.description.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Website </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input 
                type="url" 
                id="website" 
                {...form.register('website')} 
                className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" 
                placeholder="https://example.com"
                onBlur={(e) => {
                  let value = e.target.value;
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    value = `https://${value}`;
                  }
                  form.setValue('website', value, { shouldValidate: true, shouldDirty: true });
                }}
              />
              {form.formState.errors.website && <p className="mt-1 text-sm text-red-500">{form.formState.errors.website.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Industry </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="industry" {...form.register('industry')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" placeholder="e.g., Software, Manufacturing, Retail" />
              {form.formState.errors.industry && <p className="mt-1 text-sm text-red-500">{form.formState.errors.industry.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700"> Company Logo </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span className="h-20 w-20 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Logo Preview" width={80} height={80} className="object-contain" />
                  ) : (
                    <span className="text-xs text-gray-500">No Logo</span>
                  )}
                </span>
                <input type="file" id="logo" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif, image/webp" className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || form.formState.isSubmitting}
            className="w-full md:w-auto flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isLoading || form.formState.isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Company')}
          </button>
        </div>
      </div>
    </form>
  );
} 
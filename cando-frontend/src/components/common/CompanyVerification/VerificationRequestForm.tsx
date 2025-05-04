'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/lib/hooks/useToast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';

const verificationSchema = z.object({
  businessLegalName: z.string().min(1, 'Business legal name is required'),
  businessNumber: z.string().min(1, 'Business number is required'),
  submitterFullName: z.string().min(1, 'Full name is required'),
  submitterEmail: z.string().email('Invalid email address'),
  companyWebsite: z.string().url('Invalid website URL').optional().or(z.literal('')),
  companyLinkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  companyPhone: z.string().optional(),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

interface VerificationRequestFormProps {
  companyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VerificationRequestForm({ companyId, onSuccess, onCancel }: VerificationRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const supabase = createClientComponentClient<Database>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  });

  const onSubmit = async (data: VerificationFormData) => {
    try {
      setIsSubmitting(true);

      const { data: result, error } = await supabase.rpc('submit_company_verification_request', {
        p_company_id: companyId,
        p_business_legal_name: data.businessLegalName,
        p_business_number: data.businessNumber,
        p_submitter_full_name: data.submitterFullName,
        p_submitter_email: data.submitterEmail,
        p_company_website: data.companyWebsite || null,
        p_company_linkedin: data.companyLinkedin || null,
        p_company_phone: data.companyPhone || null,
      });

      if (error) throw error;

      showToast({
        title: 'Verification Request Submitted',
        description: 'Your verification request has been submitted successfully. We will review it shortly.',
        type: 'success',
      });

      onSuccess?.();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to submit verification request',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="businessLegalName" className="block text-sm font-medium text-gray-700">
            Business Legal Name *
          </label>
          <input
            type="text"
            id="businessLegalName"
            {...register('businessLegalName')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter your business's legal name"
          />
          {errors.businessLegalName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessLegalName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
            Business Number *
          </label>
          <input
            type="text"
            id="businessNumber"
            {...register('businessNumber')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter your business number"
          />
          {errors.businessNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.businessNumber.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="submitterFullName" className="block text-sm font-medium text-gray-700">
            Your Full Name *
          </label>
          <input
            type="text"
            id="submitterFullName"
            {...register('submitterFullName')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter your full name"
          />
          {errors.submitterFullName && (
            <p className="mt-1 text-sm text-red-600">{errors.submitterFullName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="submitterEmail" className="block text-sm font-medium text-gray-700">
            Your Email *
          </label>
          <input
            type="email"
            id="submitterEmail"
            {...register('submitterEmail')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter your email address"
          />
          {errors.submitterEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.submitterEmail.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700">
            Company Website
          </label>
          <input
            type="url"
            id="companyWebsite"
            {...register('companyWebsite')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="https://example.com"
          />
          {errors.companyWebsite && (
            <p className="mt-1 text-sm text-red-600">{errors.companyWebsite.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyLinkedin" className="block text-sm font-medium text-gray-700">
            Company LinkedIn
          </label>
          <input
            type="url"
            id="companyLinkedin"
            {...register('companyLinkedin')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="https://linkedin.com/company/example"
          />
          {errors.companyLinkedin && (
            <p className="mt-1 text-sm text-red-600">{errors.companyLinkedin.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
            Company Phone
          </label>
          <input
            type="tel"
            id="companyPhone"
            {...register('companyPhone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="+1 (555) 123-4567"
          />
          {errors.companyPhone && (
            <p className="mt-1 text-sm text-red-600">{errors.companyPhone.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Verification Request'}
        </button>
      </div>
    </form>
  );
} 
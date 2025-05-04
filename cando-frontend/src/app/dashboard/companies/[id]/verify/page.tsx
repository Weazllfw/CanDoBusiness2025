'use client';

import { useParams, useRouter } from 'next/navigation';
import { VerificationRequestForm } from '@/components/common/CompanyVerification/VerificationRequestForm';
import { ToastContainer } from '@/components/common/Toast/ToastContainer';

export default function CompanyVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const handleSuccess = () => {
    router.push(`/dashboard/companies/${companyId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Verify Your Company
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Complete this form to verify your company. This helps build trust with other users and gives your company
            additional benefits.
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <VerificationRequestForm
              companyId={companyId}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
} 
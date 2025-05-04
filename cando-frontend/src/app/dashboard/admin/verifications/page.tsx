'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/common/Toast/ToastContainer';
import {
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface VerificationRequest {
  id: string;
  company_id: string;
  business_legal_name: string;
  business_number: string;
  submitter_full_name: string;
  submitter_email: string;
  company_website?: string;
  company_linkedin?: string;
  company_phone?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  company: {
    name: string;
  };
}

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient<Database>();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user?.user_metadata?.is_admin) {
        showToast({
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
          type: 'error',
        });
        return;
      }

      const { data, error } = await supabase
        .from('company_verification_requests')
        .select(`
          *,
          company:companies(name)
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        showToast({
          title: 'Error',
          description: 'Failed to fetch verification requests',
          type: 'error',
        });
        return;
      }

      setRequests(data as VerificationRequest[]);
      setIsLoading(false);
    };

    fetchRequests();
  }, [supabase, showToast]);

  const handleVerificationAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase.rpc('process_verification_request', {
        p_request_id: requestId,
        p_status: status,
      });

      if (error) throw error;

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? { ...request, status } : request
        )
      );

      showToast({
        title: 'Success',
        description: `Verification request ${status}`,
        type: 'success',
      });
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || `Failed to ${status} verification request`,
        type: 'error',
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Company Verification Requests
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Review and process company verification requests.
          </p>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request.id}>
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        {request.company.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Legal Name: {request.business_legal_name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleVerificationAction(request.id, 'approved')}
                            className="inline-flex items-center rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-100"
                          >
                            <CheckCircleIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerificationAction(request.id, 'rejected')}
                            className="inline-flex items-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
                          >
                            <XCircleIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold ${
                            request.status === 'approved'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {request.status === 'approved' ? (
                            <ShieldCheckIcon className="mr-1.5 h-5 w-5" />
                          ) : (
                            <XCircleIcon className="mr-1.5 h-5 w-5" />
                          )}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Business Details</h4>
                      <dl className="mt-2 text-sm text-gray-900">
                        <div>
                          <dt className="inline text-gray-500">Business Number:</dt>
                          <dd className="inline ml-1">{request.business_number}</dd>
                        </div>
                        {request.company_website && (
                          <div>
                            <dt className="inline text-gray-500">Website:</dt>
                            <dd className="inline ml-1">
                              <a
                                href={request.company_website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-500"
                              >
                                {request.company_website}
                              </a>
                            </dd>
                          </div>
                        )}
                        {request.company_linkedin && (
                          <div>
                            <dt className="inline text-gray-500">LinkedIn:</dt>
                            <dd className="inline ml-1">
                              <a
                                href={request.company_linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-500"
                              >
                                {request.company_linkedin}
                              </a>
                            </dd>
                          </div>
                        )}
                        {request.company_phone && (
                          <div>
                            <dt className="inline text-gray-500">Phone:</dt>
                            <dd className="inline ml-1">{request.company_phone}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Submitter Details</h4>
                      <dl className="mt-2 text-sm text-gray-900">
                        <div>
                          <dt className="inline text-gray-500">Name:</dt>
                          <dd className="inline ml-1">{request.submitter_full_name}</dd>
                        </div>
                        <div>
                          <dt className="inline text-gray-500">Email:</dt>
                          <dd className="inline ml-1">{request.submitter_email}</dd>
                        </div>
                        <div>
                          <dt className="inline text-gray-500">Submitted:</dt>
                          <dd className="inline ml-1">
                            {new Date(request.submitted_at).toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
} 
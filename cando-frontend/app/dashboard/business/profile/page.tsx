'use client';

import { useState } from 'react';
import { BuildingOfficeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

export default function BusinessProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [hasCompany, setHasCompany] = useState(true); // This would come from your auth/company context

  const verificationSteps = [
    { name: 'Business Details', status: 'complete' },
    { name: 'Document Upload', status: 'complete' },
    { name: 'Verification Review', status: 'current' },
    { name: 'Final Approval', status: 'upcoming' },
  ];

  if (!hasCompany) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <div className="text-center">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No Business Profile</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your business profile.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setHasCompany(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create Business Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Business Profile
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Verification Status */}
      <div className="mt-8 border-b border-gray-200 pb-8">
        <h3 className="text-lg font-medium text-gray-900">Verification Status</h3>
        <div className="mt-4">
          <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
              {verificationSteps.map((step, stepIdx) => (
                <li key={step.name} className={stepIdx !== verificationSteps.length - 1 ? 'pb-8 relative' : 'relative'}>
                  {stepIdx !== verificationSteps.length - 1 && (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  )}
                  <div className="group relative flex items-center">
                    <span className="flex h-9 items-center">
                      {step.status === 'complete' ? (
                        <CheckCircleSolidIcon className="h-8 w-8 text-blue-600" />
                      ) : step.status === 'current' ? (
                        <div className="relative h-8 w-8 rounded-full border-2 border-blue-600">
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                          </span>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full border-2 border-gray-300" />
                      )}
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{step.name}</span>
                      {step.status === 'complete' && (
                        <span className="text-sm text-gray-500">Completed</span>
                      )}
                      {step.status === 'current' && (
                        <span className="text-sm text-blue-600">In Progress</span>
                      )}
                      {step.status === 'upcoming' && (
                        <span className="text-sm text-gray-500">Not Started</span>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Business Information */}
      <div className="mt-8 border-b border-gray-200 pb-8">
        <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              id="companyName"
              disabled={!isEditing}
              defaultValue="Acme Corporation"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
              Business Number
            </label>
            <input
              type="text"
              name="businessNumber"
              id="businessNumber"
              disabled={!isEditing}
              defaultValue="123456789"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="foundedDate" className="block text-sm font-medium text-gray-700">
              Founded Date
            </label>
            <input
              type="date"
              name="foundedDate"
              id="foundedDate"
              disabled={!isEditing}
              defaultValue="2020-01-01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Business Address
            </label>
            <input
              type="text"
              name="address"
              id="address"
              disabled={!isEditing}
              defaultValue="123 Business Street, Suite 100"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Business Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              disabled={!isEditing}
              defaultValue="Leading provider of innovative business solutions..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
              Primary Contact
            </label>
            <input
              type="text"
              name="contactName"
              id="contactName"
              disabled={!isEditing}
              defaultValue="Jane Smith"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
              Business Phone
            </label>
            <input
              type="tel"
              name="contactPhone"
              id="contactPhone"
              disabled={!isEditing}
              defaultValue="+1 (555) 987-6543"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
              Business Email
            </label>
            <input
              type="email"
              name="contactEmail"
              id="contactEmail"
              disabled={!isEditing}
              defaultValue="contact@acmecorp.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 
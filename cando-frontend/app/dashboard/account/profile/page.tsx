'use client';

import { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Account Profile
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

      <div className="mt-8 space-y-8">
        {/* Profile Photo Section */}
        <div className="border-b border-gray-200 pb-8">
          <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <UserCircleIcon className="h-20 w-20 text-gray-400" />
            </div>
            {isEditing && (
              <button
                type="button"
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Change Photo
              </button>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="border-b border-gray-200 pb-8">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                disabled={!isEditing}
                defaultValue="John"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                disabled={!isEditing}
                defaultValue="Doe"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                disabled={!isEditing}
                defaultValue="john.doe@example.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                disabled={!isEditing}
                defaultValue="+1 (555) 123-4567"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="notifications"
                  name="notifications"
                  type="checkbox"
                  disabled={!isEditing}
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="notifications" className="font-medium text-gray-700">
                  Email Notifications
                </label>
                <p className="text-gray-500">Receive updates about your account and business activities.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="marketing"
                  name="marketing"
                  type="checkbox"
                  disabled={!isEditing}
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="marketing" className="font-medium text-gray-700">
                  Marketing Communications
                </label>
                <p className="text-gray-500">Receive news, tips, and product updates.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
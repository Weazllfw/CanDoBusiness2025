'use client';

import { useState } from 'react';
import { KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function SecurityPage() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  return (
    <div className="mx-auto max-w-3xl py-6">
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        Security Settings
      </h2>

      {/* Password Section */}
      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Password</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update your password regularly to keep your account secure.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Change Password
          </button>
        </div>

        {isChangingPassword && (
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                id="currentPassword"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                id="newPassword"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsChangingPassword(false)}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Update Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add an extra layer of security to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIs2FAEnabled(!is2FAEnabled)}
            className={`${
              is2FAEnabled
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm`}
          >
            {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        <div className="mt-6">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">
                  {is2FAEnabled ? 'Two-factor authentication is enabled' : 'Enhance your account security'}
                </h4>
                <p className="mt-2 text-sm text-gray-500">
                  {is2FAEnabled
                    ? 'Your account is protected with an additional layer of security.'
                    : 'We recommend enabling two-factor authentication for increased security.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Log */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900">Security Activity</h3>
        <p className="mt-1 text-sm text-gray-500">
          Recent security events for your account.
        </p>
        <div className="mt-6 overflow-hidden rounded-md border border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {[
              {
                event: 'Password changed',
                date: '2024-03-15 10:30 AM',
                ip: '192.168.1.1',
              },
              {
                event: 'New login',
                date: '2024-03-14 3:45 PM',
                ip: '192.168.1.1',
              },
              {
                event: 'Failed login attempt',
                date: '2024-03-13 8:15 AM',
                ip: '192.168.1.2',
              },
            ].map((activity, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-white px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{activity.event}</p>
                    <p className="text-sm text-gray-500">{activity.date}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{activity.ip}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 
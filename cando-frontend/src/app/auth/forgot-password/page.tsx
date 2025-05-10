'use client';

import { useState, FormEvent } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import type { Database } from '@/types/supabase';

export default function ForgotPasswordPage() {
  const supabase = createClientComponentClient<Database>();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      console.error('Error sending password reset email:', resetError.message);
      setError(
        `Failed to send reset email: ${resetError.message}. Please try again.`
      );
    } else {
      setMessage(
        'If an account exists for this email, a password reset link has been sent. Please check your inbox (and Inbucket if running locally).',
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary-600 cursor-pointer">
            CanDo Business Network
          </h2>
        </Link>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handlePasswordReset}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {message && (
              <div className="p-3 bg-green-50 border-l-4 border-green-400">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Password Reset Email'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Remember your password?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/auth/login">
                <div className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                  Sign in
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams for error from server
import Link from 'next/link';
import type { Database } from '@/types/supabase';

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Supabase password recovery link might append an error as a query param
    // e.g. ?error=unauthorized_client&error_code=401&error_description=Error+getting+user
    const callbackError = searchParams.get('error_description');
    if (callbackError) {
      setError(decodeURIComponent(callbackError));
    }

    // The access_token is in the URL hash, not query params
    // Supabase JS client handles this automatically when it initializes
    // by listening to onAuthStateChange with 'PASSWORD_RECOVERY' event.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // This event means Supabase has successfully processed the recovery token from the URL hash.
          // The user is now in a state where they can update their password.
          // No specific action needed here other than allowing the form to be submitted.
          setMessage('You can now set your new password.');
        }
        // No need to handle USER_UPDATED here explicitly for password, 
        // as we will redirect on successful password change.
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth, searchParams]);

  const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error('Error updating password:', updateError.message);
      setError(`Failed to update password: ${updateError.message}. Please try again, or request a new reset link if this one has expired.`);
    } else {
      setMessage('Password updated successfully! You will be redirected to login shortly.');
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    }
    setLoading(false);
  };

  // Avoid rendering the form until client-side hydration is complete to access URL hash
  if (!isMounted) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <p className='text-center text-gray-600'>Loading...</p>
        </div>
    ); 
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary-600 cursor-pointer">
            CanDo Business Network
          </h2>
        </Link>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set your new password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handlePasswordUpdate}>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
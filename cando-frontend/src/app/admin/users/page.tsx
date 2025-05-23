'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';
import type { User as AuthUser } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';

// Placeholder for admin emails - replace with a robust role check
// const ADMIN_EMAILS = ['rmarshall@itmarshall.net', 'anotheradmin@example.com']; // To be replaced by RPC check

interface AdminUserView {
  user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAndFetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      router.push('/auth/login');
      setIsLoading(false);
      return;
    }
    setCurrentUser(session.user);

    try {
      // First, check if the user is an admin
      const { data: isAdminUser, error: adminCheckError } = await supabase.rpc('is_current_user_admin');

      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError);
        setIsAdmin(false);
        setError('Failed to verify admin status. Please try again.');
        router.push('/feed'); 
        setIsLoading(false);
        return;
      }

      if (!isAdminUser) {
        setIsAdmin(false);
        router.push('/feed');
        setIsLoading(false);
        return;
      }
      
      setIsAdmin(true); // User is admin, proceed to fetch users list

      // Now, fetch the users list since the user is confirmed admin
      const { data: usersData, error: rpcError } = await supabase.rpc('admin_get_all_users');
      if (rpcError) {
        console.error('RPC Error admin_get_all_users:', rpcError);
        if (rpcError.message.includes("function public.admin_get_all_users() does not exist")) {
            setError("Admin user list function not found. Ensure DB migrations are up to date & types regenerated.");
        } else {
            setError(rpcError.message || 'Failed to load users.');
        }
        setUsers([]);
      } else {
        setUsers((usersData as AdminUserView[]) || []);
      }

    } catch (e: any) { // Catch any other unexpected errors during the process
      console.error('Unexpected error in checkAdminAndFetchUsers:', e);
      setIsAdmin(false); // Ensure isAdmin is false if anything unexpected happens
      setError(e.message || 'An unexpected error occurred.');
      // Optionally, redirect to a general error page or home page
      // router.push('/feed'); 
    }

    setIsLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, [checkAdminAndFetchUsers]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading user management...</div>;
  }

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-8 text-center">Access Denied.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">User Management</h1>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      {users.length === 0 && !error && !isLoading && (
        <p className="text-gray-500">No users found or unable to load users.</p>
      )}
      {users.length > 0 && (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar_url ? (
                          <Image className="h-10 w-10 rounded-full object-cover" src={user.avatar_url} alt={user.name || 'User avatar'} width={40} height={40} />
                        ) : (
                          <span className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">ID: {user.user_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/users/${user.user_id}`} className="text-indigo-600 hover:text-indigo-900">
                      View Profile
                    </Link>
                    {/* Future actions: Edit, Suspend, etc. */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

// Assuming the RPC get_followed_companies returns an array of this type
// This should match the actual return type of your RPC.
// You might need to regenerate Supabase types if this RPC is new or its return type changed.
// UPDATED to reflect assumed RPC output based on linter error
interface FollowedCompany {
  // company_id: string; // This is part of the composite key in user_company_follows but the RPC returns it as company_id
  // user_id: string; // user_id of the follower (current user) - This is from the old RPC, new one might call it follow_id or just be implicit.
  // The new RPC (20250612000006) returns:
  follow_id: string; // Assuming this is the primary key of the user_company_follows table record
  company_id: string; // The ID of the company being followed
  company_name: string | null; 
  company_avatar_url: string | null; 
  company_industry: string | null; 
  company_verification_status: string | null; // Added, might be useful
  followed_at: string; // Renamed from created_at for clarity, matches RPC output
}

export default function FollowedCompaniesPage() {
  const supabase = createClientComponentClient<Database>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [followedCompanies, setFollowedCompanies] = useState<FollowedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) console.error('Error fetching current user:', userError);
    setCurrentUser(user);
    return user;
  }, [supabase]);

  const fetchFollowedCompanies = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_followed_companies', { p_user_id: userId });
      if (rpcError) throw rpcError;
      // UPDATED: Assuming the RPC now returns the fields in the updated FollowedCompany interface
      // The cast to `unknown` first and then to `FollowedCompany[]` is a way to tell TypeScript
      // that we are confident about the shape of the data returned by the RPC, 
      // especially if the auto-generated types are not yet perfectly matching.
      setFollowedCompanies((data as unknown as FollowedCompany[]) || []);
    } catch (err: any) {
      console.error('Error fetching followed companies:', err);
      setError(err.message || 'Failed to load followed companies.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCurrentUser().then(user => {
      if (user) {
        fetchFollowedCompanies(user.id);
      }
    });
  }, [fetchCurrentUser, fetchFollowedCompanies]);

  const handleUnfollow = async (companyId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in.');
      return;
    }
    try {
      const { error: unfollowError } = await supabase.rpc('unfollow_company', { p_company_id: companyId });
      if (unfollowError) throw unfollowError;
      toast.success('Successfully unfollowed company.');
      // Refresh the list
      setFollowedCompanies(prev => prev.filter(c => c.company_id !== companyId));
    } catch (err: any) {
      console.error('Error unfollowing company:', err);
      toast.error(err.message || 'Failed to unfollow company.');
    }
  };

  if (loading && !currentUser) {
    return <div className="container mx-auto p-4 text-center">Loading user...</div>;
  }
  if (!currentUser && !loading) {
      return <div className="container mx-auto p-4 text-center">Please log in to see companies you follow.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Followed Companies</h1>
      
      {loading && <div className="text-center">Loading companies...</div>}
      {error && <div className="text-center text-red-500">Error: {error}</div>}

      {!loading && !error && (
        <div className="space-y-4">
          {followedCompanies.length === 0 ? (
            <p className="text-gray-600">You are not following any companies yet.</p>
          ) : (
            followedCompanies.map(company => (
              <div key={company.follow_id} className="flex items-center justify-between p-4 bg-white shadow rounded-lg">
                <Link href={`/company/${company.company_id}`} className="flex items-center space-x-4 hover:bg-gray-50 p-2 rounded-md flex-grow">
                  <div className="w-14 h-14 rounded-md bg-gray-200 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {company.company_avatar_url ? (
                      <Image src={company.company_avatar_url} alt={company.company_name || 'Company Logo'} width={56} height={56} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xl text-gray-500">{company.company_name ? company.company_name.charAt(0).toUpperCase() : 'C'}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">{company.company_name || `Company ID: ${company.company_id}`}</h2>
                    {company.company_industry && <p className="text-sm text-gray-500">{company.company_industry}</p>}
                    <p className="text-xs text-gray-400">Followed on: {new Date(company.followed_at).toLocaleDateString()}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleUnfollow(company.company_id)}
                  className="ml-4 px-3 py-1.5 border border-red-500 text-red-500 rounded-md hover:bg-red-50 text-sm font-medium transition-colors"
                >
                  Unfollow
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 
'use client'

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import SuggestionCard, { type Suggestion } from './SuggestionCard';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface CompaniesYouMayKnowProps {}

// Define the expected structure from the RPC for type safety
type CymkSuggestion = Database['public']['Functions']['get_cymk_suggestions']['Returns'][number];

const CompaniesYouMayKnow: React.FC<CompaniesYouMayKnowProps> = () => {
  const supabase = createClientComponentClient<Database>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [followedCompanyIds, setFollowedCompanyIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [supabase]);

  // Helper to fetch follow status for all suggested companies
  const fetchFollowStatusForSuggestions = useCallback(async (userId: string, companyIds: string[]) => {
    if (!userId || companyIds.length === 0) return new Set<string>();
    const followed = new Set<string>();
    // Batch check follow status for each company
    await Promise.all(companyIds.map(async (companyId) => {
      const { data, error } = await supabase.rpc('get_company_follow_status', { p_company_id: companyId });
      if (!error && data === true) {
        followed.add(companyId);
      }
    }));
    return followed;
  }, [supabase]);

  const fetchSuggestions = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_cymk_suggestions', {
        p_requesting_user_id: userId,
        p_limit: 3,
      });

      if (rpcError) throw rpcError;
      const rpcData: CymkSuggestion[] = data || [];
      const formattedSuggestions: Suggestion[] = rpcData.map((s: CymkSuggestion) => ({
        id: s.suggested_company_id,
        name: s.company_name || 'CanDo Company',
        avatar_url: s.company_avatar_url,
        reason: s.reason,
        industry: s.company_industry,
        type: 'company',
      }));
      setSuggestions(formattedSuggestions);
      // Fetch follow status for these companies
      const companyIds = formattedSuggestions.map(s => s.id);
      const followed = await fetchFollowStatusForSuggestions(userId, companyIds);
      setFollowedCompanyIds(followed);
    } catch (e: any) {
      console.error('[CYMK] Error fetching CYMK suggestions:', e);
      setError(e.message || 'Failed to fetch suggestions.');
      setSuggestions([]);
      setFollowedCompanyIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchFollowStatusForSuggestions]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchSuggestions(currentUser.id);
    } else {
      if (!currentUser && isLoading) setIsLoading(false);
    }
  }, [currentUser, fetchSuggestions, isLoading]);

  const handleFollow = useCallback(async (companyId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const { error } = await supabase.rpc('follow_company', { p_company_id: companyId });
      if (error) throw error;
      setFollowedCompanyIds(prev => new Set(prev).add(companyId));
      return true;
    } catch (error) {
      console.error('Error following company:', error);
      return false;
    }
  }, [currentUser, supabase]);

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Companies you may know</h2>
        <p className="text-sm text-gray-500">Loading suggestions...</p>
      </div>
    );
  }

  if (suggestions.length === 0 && !error) {
    return null; 
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Companies you may know</h2>
      </div>
      <div className="p-4">
        {error && <p className="text-sm text-red-500 mb-3">Error: {error}</p>}
        {suggestions.length > 0 ? (
          <div className="space-y-1">
            {suggestions.map((suggestion) => (
              <SuggestionCard 
                key={suggestion.id} 
                suggestion={suggestion} 
                onFollow={handleFollow} 
                currentUser={currentUser}
                followed={followedCompanyIds.has(suggestion.id)}
              />
            ))}
          </div>
        ) : (
          !error && <p className="text-sm text-gray-500">No company suggestions available right now.</p>
        )}
        <div className="mt-6">
          <Link href="/network/companies" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all suggestions →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompaniesYouMayKnow; 
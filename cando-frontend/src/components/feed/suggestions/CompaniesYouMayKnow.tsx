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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
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
      
      const rpcData = data as any[] || [];

      const formattedSuggestions: Suggestion[] = rpcData.map((s: any) => ({
        id: s.suggested_company_id,
        name: s.company_name || 'CanDo Company',
        avatar_url: s.company_avatar_url,
        reason: s.reason,
        industry: s.company_industry,
        type: 'company',
      }));
      setSuggestions(formattedSuggestions);
    } catch (e: any) {
      console.error('[CYMK] Error fetching CYMK suggestions:', e);
      setError(e.message || 'Failed to fetch suggestions.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchSuggestions(currentUser.id);
    } else {
      if (!currentUser && suggestions.length === 0) setIsLoading(false);
    }
  }, [currentUser, fetchSuggestions, suggestions.length]);

  const handleFollow = async (companyId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true; 
  };

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
              <SuggestionCard key={suggestion.id} suggestion={suggestion} onFollow={handleFollow} />
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
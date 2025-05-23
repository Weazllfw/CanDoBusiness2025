'use client'

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import SuggestionCard, { type Suggestion } from './SuggestionCard';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface PeopleYouMayKnowProps {}

// Define the expected structure from the RPC for type safety
type PymkSuggestion = Database['public']['Functions']['get_pymk_suggestions']['Returns'][number];

const PeopleYouMayKnow: React.FC<PeopleYouMayKnowProps> = () => {
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
      const { data, error: rpcError } = await supabase.rpc('get_pymk_suggestions', {
        p_requesting_user_id: userId,
        p_limit: 3,
      });

      if (rpcError) throw rpcError;

      const formattedSuggestions: Suggestion[] = (data || []).map((s: PymkSuggestion) => ({
        id: s.suggested_user_id,
        name: s.user_name || 'CanDo User',
        avatar_url: s.user_avatar_url,
        reason: s.reason,
        type: 'person',
        // role: s.user_role, // If RPC returns role
        // industry: s.user_industry, // If RPC returns industry for person
      }));
      setSuggestions(formattedSuggestions);
    } catch (e: any) {
      console.error('[PYMK] Error fetching PYMK suggestions:', e);
      setError(e.message || 'Failed to fetch suggestions.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchSuggestions(currentUser.id);
    } else if (!currentUser) {
      if (isLoading) setIsLoading(false); 
    }
  }, [currentUser, fetchSuggestions, isLoading]);

  const handleConnectionStatusChange = useCallback((receivedNewStatus: string, receivedTargetId: string) => {
    console.log(`[PYMK] Connection status for ${receivedTargetId} changed to ${receivedNewStatus}. Suppressing list refresh for now.`);
    // if (currentUser?.id) {
      // WORKAROUND: Temporarily disable fetching suggestions to stop potential infinite loop.
      // This means the PYMK list won't auto-update on status change from here.
      // fetchSuggestions(currentUser.id);
    // }
  }, []);
  
  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">People you may know</h2>
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
        <h2 className="text-lg font-semibold text-gray-900">People you may know</h2>
      </div>
      <div className="p-4">
        {error && <p className="text-sm text-red-500 mb-3">Error: {error}</p>}
        {suggestions.length > 0 ? (
          <div className="space-y-1">
            {suggestions.map((suggestion) => (
              <SuggestionCard 
                key={suggestion.id} 
                suggestion={suggestion} 
                currentUser={currentUser}
                onConnectionStatusChange={handleConnectionStatusChange}
              />
            ))}
          </div>
        ) : (
          !error && <p className="text-sm text-gray-500">No suggestions available right now.</p>
        )}
        <div className="mt-6">
          <Link href="/network" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all suggestions →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PeopleYouMayKnow; 
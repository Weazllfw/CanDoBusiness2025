'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';
import type { User as AuthUser } from '@supabase/supabase-js'; // Renamed to avoid conflict with Profile type
import Link from 'next/link';
import Image from 'next/image';
import UserConnectButton from '@/components/connections/UserConnectButton';

// Type for the data returned by get_user_network RPC
interface ConnectedUser {
  connection_id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  connected_since: string; // TIMESTAMPTZ
}

// Type for the minimal profile data of the user whose connections are being viewed
interface TargetUserProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  is_network_public: boolean | null;
}

export default function UserConnectionsPage() {
  const supabase = createClientComponentClient<Database>();
  const params = useParams();
  const router = useRouter();
  const targetUserId = params.id as string;

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [targetUser, setTargetUser] = useState<TargetUserProfile | null>(null);
  const [connections, setConnections] = useState<ConnectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canViewConnections, setCanViewConnections] = useState(false);

  const fetchPageData = useCallback(async () => {
    if (!targetUserId) {
      setError('User ID not provided in URL.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Fetch current user
      const { data: { user: authUserData }, error: authUserError } = await supabase.auth.getUser();
      if (authUserError) {
        console.error('Error fetching current user:', authUserError);
        // Non-critical for viewing public profiles, but good to know
      }
      setCurrentUser(authUserData);

      // Fetch target user's basic profile to get name and privacy setting
      const { data: targetUserData, error: targetUserError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, is_network_public')
        .eq('id', targetUserId)
        .single();

      if (targetUserError) {
        throw new Error(targetUserError.code === 'PGRST116' ? 'Profile not found.' : `Error fetching profile: ${targetUserError.message}`);
      }
      setTargetUser(targetUserData as TargetUserProfile);

      // Determine if connections can be viewed
      const isOwner = authUserData?.id === targetUserId;
      // Add admin check here if you have an admin role system reflected in RLS/frontend
      const isAdmin = false; // Placeholder for actual admin check logic
      const networkIsPublic = targetUserData?.is_network_public === true;
      
      if (networkIsPublic || isOwner || isAdmin) {
        setCanViewConnections(true);
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_network', {
          p_target_user_id: targetUserId,
        });
        if (rpcError) throw rpcError;
        setConnections((rpcData as ConnectedUser[]) || []);
      } else {
        setCanViewConnections(false);
        setConnections([]);
      }

    } catch (err: any) {
      console.error('Error loading user connections page:', err);
      setError(err.message || 'Failed to load page data.');
      setTargetUser(null); // Clear target user on error too
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, targetUserId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleConnectionUpdate = () => {
    // Refetch connections if a connect/disconnect action happens on this page
    fetchPageData(); 
  }

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading connections...</div>;
  }

  if (error && !targetUser) { // If error and no target user info, probably a critical error like profile not found
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }
  
  if (!targetUser) { // Should be caught by error state, but as a fallback
     return <div className="container mx-auto p-4 text-center">User profile not found.</div>;
  }

  const pageTitle = currentUser?.id === targetUserId ? "Your Network" : `${targetUser.name || 'User'}\'s Network`;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href={`/users/${targetUserId}`} className="text-primary-600 hover:underline flex items-center mb-2">
          {targetUser.avatar_url && (
            <Image src={targetUser.avatar_url} alt={targetUser.name || 'User'} width={32} height={32} className="w-8 h-8 rounded-full mr-2" />
          )}
          &larr; Back to {targetUser.name || 'User'}&apos;s Profile
        </Link>
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
      </div>

      {!canViewConnections ? (
        <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700">
          <p>This user&apos;s network is private.</p>
        </div>
      ) : connections.length === 0 ? (
        <p className="text-gray-600">{currentUser?.id === targetUserId ? "You haven&apos;t made any connections yet." : `${targetUser.name || 'This user'} hasn&apos;t made any connections yet.`}</p>      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <li key={connection.connection_id} className="p-4 bg-white shadow rounded-lg flex flex-col items-center text-center">
              <Link href={`/users/${connection.user_id}`} className="group mb-2">
                {connection.avatar_url ? (
                  <Image 
                    src={connection.avatar_url} 
                    alt={connection.name || 'User avatar'} 
                    width={80} 
                    height={80} 
                    className="w-20 h-20 rounded-full object-cover mb-2 group-hover:ring-2 group-hover:ring-primary-500 transition-all duration-150"
                  />
                ) : (
                  <span className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-2xl mb-2 group-hover:ring-2 group-hover:ring-primary-500 transition-all duration-150">
                    {connection.name ? connection.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
                <p className="text-lg font-semibold text-primary-700 group-hover:underline">
                  {connection.name || 'Unnamed User'}
                </p>
              </Link>
              <p className="text-xs text-gray-500 mb-3">Connected since: {new Date(connection.connected_since).toLocaleDateString()}</p>
              {currentUser && currentUser.id !== connection.user_id && (
                <UserConnectButton 
                    targetUserId={connection.user_id} 
                    currentUser={currentUser} 
                    onStatusChange={handleConnectionUpdate}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import UserConnectButton from '@/components/connections/UserConnectButton'; // Re-use for actions on pending if applicable, or simplified buttons
import toast from 'react-hot-toast';
// import { ShieldCheckIcon } from '@heroicons/react/24/solid'; // No longer used if is_verified is removed from display

// New type for connected user from the simplified get_user_network RPC
interface ConnectedUser {
  connection_id: string; // UUID
  user_id: string;       // UUID
  name: string | null;
  avatar_url: string | null;
  connected_since: string; // TIMESTAMPTZ
}

// Removed UserTrustLevel export
// export type UserTrustLevel = Database['public']['Enums']['user_trust_level_enum'];

// Type for connected user from get_user_network RPC - REMOVED as RPC does not exist
// type ConnectedUser = Database['public']['Functions']['get_user_network']['Returns'][number];

// Types for requests from their respective RPCs
type PendingRequest = Database['public']['Functions']['get_pending_user_connection_requests']['Returns'][number];
type SentRequest = Database['public']['Functions']['get_sent_user_connection_requests']['Returns'][number];

export default function NetworkPeoplePage() {
  const supabase = createClientComponentClient<Database>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [connections, setConnections] = useState<ConnectedUser[]>([]); // Updated type
  const [pendingIncoming, setPendingIncoming] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connections' | 'incoming' | 'sent'>('connections');

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) console.error('Error fetching current user:', userError);
    setCurrentUser(user);
    return user;
  }, [supabase]);

  const fetchNetworkData = useCallback(async (user: User) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch My Connections - REINSTATED RPC call with simplified structure
      const { data: connsData, error: connsError } = await supabase
        .rpc('get_user_network', { p_target_user_id: user.id });
      if (connsError) throw connsError;
      setConnections((connsData as ConnectedUser[]) || []); // Updated type casting

      // Fetch Pending Incoming Requests
      const { data: incomingData, error: incomingError } = await supabase
        .rpc('get_pending_user_connection_requests');
      if (incomingError) throw incomingError;
      setPendingIncoming(incomingData || []);

      // Fetch Sent Requests
      const { data: sentData, error: sentError } = await supabase
        .rpc('get_sent_user_connection_requests');
      if (sentError) throw sentError;
      setSentRequests(sentData || []);

    } catch (err: any) {
      console.error('Error fetching network data:', err);
      setError(err.message || 'Failed to load network data.');
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCurrentUser().then(user => {
      if (user) {
        fetchNetworkData(user);
      }
    });
  }, [fetchCurrentUser, fetchNetworkData]);

  // Callback for UserConnectButton to refresh data upon status change
  const handleConnectionStatusChange = (newStatus: string, targetId: string) => {
    if (currentUser) {
        toast.success(`Connection status with user ${targetId} changed to ${newStatus}. Refreshing list.`);
        fetchNetworkData(currentUser);
    }
  };

  const renderConnectionsList = () => (
    <ul className="space-y-4">
      {connections.length === 0 && <p>You have no connections yet.</p>} {/* Updated placeholder text slightly */}
      {connections.map(conn => (
        <li key={conn.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow">
          <Link href={`/users/${conn.user_id}`} className="flex items-center space-x-3 hover:underline">
            <Image src={conn.avatar_url || '/default-avatar.png'} alt={conn.name || 'User'} width={48} height={48} className="rounded-full object-cover" />
            <div>
                <div className="flex items-center space-x-1">
                    <span className="font-semibold">{conn.name || 'User'}</span>
                    {/* Removed trust level and verification display */}
                </div>
                <p className="text-xs text-gray-500">Connected since: {new Date(conn.connected_since).toLocaleDateString()}</p>
            </div>
          </Link>
          {currentUser && (
            <UserConnectButton targetUserId={conn.user_id} currentUser={currentUser} onStatusChange={handleConnectionStatusChange}/>
          )}
        </li>
      ))}
    </ul>
  );

  const renderPendingIncomingList = () => (
    <ul className="space-y-4">
      {pendingIncoming.length === 0 && <p>No incoming connection requests.</p>}
      {pendingIncoming.map(req => (
        <li key={req.request_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow">
          <Link href={`/users/${req.requester_id}`} className="flex items-center space-x-3 hover:underline">
            <Image src={req.requester_avatar_url || '/default-avatar.png'} alt={req.requester_name || 'User'} width={48} height={48} className="rounded-full object-cover" />
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-semibold">{req.requester_name || 'User'}</span>
                {/* Add verification and trust level display if get_pending_user_connection_requests returns them */}
                {/* For example: req.requester_is_verified && <ShieldCheckIcon ... /> */}
                {/* For example: req.requester_trust_level && <span ...> ... </span> */}
              </div>
            </div>
          </Link>
          {currentUser && (
            <UserConnectButton targetUserId={req.requester_id} currentUser={currentUser} onStatusChange={handleConnectionStatusChange} />
          )}
        </li>
      ))}
    </ul>
  );

  const renderSentRequestsList = () => (
    <ul className="space-y-4">
      {sentRequests.length === 0 && <p>You have no pending sent requests.</p>}
      {sentRequests.map(req => (
        <li key={req.request_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow">
          <Link href={`/users/${req.addressee_id}`} className="flex items-center space-x-3 hover:underline">
            <Image src={req.addressee_avatar_url || '/default-avatar.png'} alt={req.addressee_name || 'User'} width={48} height={48} className="rounded-full object-cover" />
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-semibold">{req.addressee_name || 'User'}</span>
                {/* Add verification and trust level display if get_sent_user_connection_requests returns them */}
              </div>
            </div>
          </Link>
          {currentUser && (
            <UserConnectButton targetUserId={req.addressee_id} currentUser={currentUser} onStatusChange={handleConnectionStatusChange} />
          )}
        </li>
      ))}
    </ul>
  );
  
  if (loading && !currentUser) {
    return <div className="container mx-auto p-4 text-center">Loading user...</div>;
  }
  if (!currentUser && !loading) {
      return <div className="container mx-auto p-4 text-center">Please log in to see your network.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Network</h1>
      
      <div className="tabs mb-6">
        <button 
          className={`tab tab-lifted ${activeTab === 'connections' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('connections')}
        >
          My Connections ({connections.length})
        </button>
        <button 
          className={`tab tab-lifted ${activeTab === 'incoming' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('incoming')}
        >
          Incoming Requests ({pendingIncoming.length})
        </button>
        <button 
          className={`tab tab-lifted ${activeTab === 'sent' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('sent')}
        >
          Sent Requests ({sentRequests.length})
        </button>
      </div>

      {loading && <div className="text-center">Loading network details...</div>}
      {error && <div className="text-center text-red-500">Error: {error}</div>}

      {!loading && !error && (
        <div className="bg-white shadow rounded-lg p-6">
          {activeTab === 'connections' && renderConnectionsList()}
          {activeTab === 'incoming' && renderPendingIncomingList()}
          {activeTab === 'sent' && renderSentRequestsList()}
        </div>
      )}
    </div>
  );
} 
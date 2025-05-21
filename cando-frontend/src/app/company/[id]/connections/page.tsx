'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import CompanyConnectButton from '@/components/connections/CompanyConnectButton';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

type CompanyConnectionRow = Database['public']['Tables']['company_connections']['Row'];
type CompanyProfile = Database['public']['Views']['companies_view']['Row'];

// Enriched request type that includes profile information
interface EnrichedCompanyRequest extends CompanyConnectionRow {
  // Depending on whether it's incoming or sent, the 'other' company is either requester or addressee
  other_company_profile: Pick<CompanyProfile, 'id' | 'name' | 'avatar_url'> | null;
}

// For current connections from get_company_network_details
interface CurrentCompanyConnection {
  id: string; // target_company_id
  name: string;
  avatar_url?: string | null;
  industry?: string | null;
  // We don't need connection_status here as we will filter for ACCEPTED before display
}

type CompanyNetworkDetailRow = Database['public']['Functions']['get_company_network_details']['Returns'][number] | any;


export default function CompanyConnectionsManagementPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'sent' | 'current'>('incoming');

  const [incomingRequests, setIncomingRequests] = useState<EnrichedCompanyRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<EnrichedCompanyRequest[]>([]);
  const [currentConnections, setCurrentConnections] = useState<CurrentCompanyConnection[]>([]);

  const fetchCurrentUserAndAdminStatus = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error('You must be logged in.');
      router.push('/auth/login');
      return;
    }
    setCurrentUser(user);

    if (!companyId) {
      setError('Company ID is missing.');
      setIsLoading(false);
      return;
    }

    try {
      const { data: isAdmin, error } = await (supabase.rpc as any)('check_if_user_is_company_admin', {
        p_target_company_id: companyId as string,
        p_user_id_to_check: user.id,
      });
      if (error) throw error;
      if (!isAdmin) {
        setError('You do not have permission to manage this company\'s connections.');
        setIsAdmin(false);
        setIsLoading(false);
        // Consider redirecting: router.push('/dashboard');
        return;
      }
      setIsAdmin(true);
    } catch (err: any) {
      console.error('Error checking admin status:', err);
      setError(err.message || 'Error verifying permissions.');
      setIsAdmin(false);
      setIsLoading(false);
    }
  }, [supabase, router, companyId]);

  const enrichRequestsWithCompanyProfiles = async (
    requests: CompanyConnectionRow[],
    otherCompanyIdField: 'requester_company_id' | 'addressee_company_id'
  ): Promise<EnrichedCompanyRequest[]> => {
    if (!requests || requests.length === 0) return [];
    const companyIds = requests.map(req => req[otherCompanyIdField]).filter(id => id !== null) as string[];
    if (companyIds.length === 0) return requests.map(r => ({ ...r, other_company_profile: null }));

    const { data: profilesData, error: profilesError } = await supabase
      .from('companies_view')
      .select('id, name, avatar_url')
      .in('id', companyIds);
    
    if (profilesError) {
      console.error('Error fetching company profiles for requests:', profilesError);
      return requests.map(r => ({ ...r, other_company_profile: null }));
    }

    const profilesMap = new Map(profilesData?.map(p => [p.id, p as Pick<CompanyProfile, 'id' | 'name' | 'avatar_url'>]));
    return requests.map(req => ({
      ...req,
      other_company_profile: req[otherCompanyIdField] ? profilesMap.get(req[otherCompanyIdField]!) || null : null
    }));
  };


  const fetchDataForTab = useCallback(async () => {
    if (!isAdmin || !currentUser) return; // Ensure admin and user are confirmed
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === 'incoming') {
        const { data, error: rpcError } = await supabase.rpc('get_pending_company_connection_requests', {
          p_for_company_id: companyId,
        });
        if (rpcError) throw rpcError;
        const enriched = await enrichRequestsWithCompanyProfiles(data || [], 'requester_company_id');
        setIncomingRequests(enriched);
      } else if (activeTab === 'sent') {
        const { data, error: rpcError } = await supabase.rpc('get_sent_company_connection_requests', {
          p_from_company_id: companyId,
        });
        if (rpcError) throw rpcError;
        const enriched = await enrichRequestsWithCompanyProfiles(data || [], 'addressee_company_id');
        setSentRequests(enriched);
      } else if (activeTab === 'current') {
        const { data, error: rpcError } = await supabase.rpc('get_company_network_details', {
           p_acting_company_id: companyId 
        } as any ); // Using 'as any' due to potential stale types for params
        if (rpcError) throw rpcError;
        
        const rpcData = data as CompanyNetworkDetailRow[] || [];
        const acceptedConnections = rpcData.filter(c => c.connection_status_with_acting_company === 'ACCEPTED');
        const mappedConnections: CurrentCompanyConnection[] = acceptedConnections.map(c => ({
            id: c.target_company_id,
            name: c.target_company_name || 'Unnamed Company',
            avatar_url: c.target_company_avatar_url,
            industry: c.target_company_industry,
        }));
        setCurrentConnections(mappedConnections);
      }
    } catch (err: any) {
      console.error(`Error fetching data for tab ${activeTab}:`, err);
      setError(err.message || `Failed to load ${activeTab} data.`);
      if (activeTab === 'incoming') setIncomingRequests([]);
      if (activeTab === 'sent') setSentRequests([]);
      if (activeTab === 'current') setCurrentConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, companyId, isAdmin, currentUser, activeTab]);

  useEffect(() => {
    fetchCurrentUserAndAdminStatus();
  }, [fetchCurrentUserAndAdminStatus]);

  useEffect(() => {
    if (isAdmin) { // Only fetch tab data if admin check passed
      fetchDataForTab();
    }
  }, [isAdmin, activeTab, fetchDataForTab]);

  const handleConnectionUpdate = () => {
    toast.success('Connection updated. Refreshing list...');
    fetchDataForTab(); // Refetch data for the current tab
  };

  const renderList = (
    items: Array<EnrichedCompanyRequest | CurrentCompanyConnection>, 
    type: 'incoming' | 'sent' | 'current'
  ) => {
    if (isLoading) return <p className="text-gray-500">Loading...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;
    if (items.length === 0) return <p className="text-gray-500">No items to display.</p>;

    return (
      <ul className="space-y-4">
        {items.map((item) => {
          let otherCompanyProfile: Pick<CompanyProfile, 'id' | 'name' | 'avatar_url'> | null = null;
          let targetCompanyIdForButton: string = '';

          if (type === 'incoming' || type === 'sent') {
            const req = item as EnrichedCompanyRequest;
            otherCompanyProfile = req.other_company_profile;
            targetCompanyIdForButton = (type === 'incoming' ? req.requester_company_id : req.addressee_company_id) || '';
          } else { // current
            const conn = item as CurrentCompanyConnection;
            otherCompanyProfile = { id: conn.id, name: conn.name, avatar_url: conn.avatar_url || null };
            targetCompanyIdForButton = conn.id;
          }
          
          if (!targetCompanyIdForButton) return null; // Should not happen if data is correct

          return (
            <li key={(item as any).id} className="flex items-center justify-between p-4 bg-white shadow rounded-lg">
              <Link href={`/company/${targetCompanyIdForButton}`} className="flex items-center space-x-3 group min-w-0">
                {otherCompanyProfile?.avatar_url ? (
                  <Image src={otherCompanyProfile.avatar_url} alt={otherCompanyProfile.name || 'Company'} width={48} height={48} className="rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <BuildingOffice2Icon className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-gray-800 group-hover:text-primary-600 truncate block">
                    {otherCompanyProfile?.name || 'Unnamed Company'}
                  </span>
                  {/* Can add request notes or other info here if available */}
                </div>
              </Link>
              {currentUser && companyId && (
                <CompanyConnectButton
                  currentUser={currentUser}
                  actingCompanyId={companyId} // This company is always the acting one on this page
                  targetCompanyId={targetCompanyIdForButton}
                  onStatusChange={handleConnectionUpdate}
                />
              )}
            </li>
          );
        })}
      </ul>
    );
  };
  
  if (isLoading && isAdmin === null) { // Initial loading for admin check
      return <div className="container mx-auto p-6 text-center"><p>Loading permissions...</p></div>;
  }

  if (isAdmin === false && !isLoading) { // Admin check failed
     return (
        <div className="container mx-auto p-6 text-center">
            <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
            <p className="text-red-500 mb-6">{error || 'You do not have permission to manage this company\'s connections.'}</p>
            <Link href={`/company/${companyId}`} className="text-primary-600 hover:underline">
                Back to Company Profile
            </Link>
             <span className="mx-2">|</span>
            <Link href="/dashboard" className="text-primary-600 hover:underline">
                Go to Dashboard
            </Link>
        </div>
    );
  }
  
  if (!companyId || !currentUser) { // Should be caught by initial checks but good fallback
      return <div className="container mx-auto p-6 text-center"><p>Loading user and company data...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage Company Connections</h1>
        <p className="text-sm text-gray-500">
          Managing connections for company ID: <Link href={`/company/${companyId}`} className="text-primary-600 hover:underline font-medium">{companyId}</Link>
        </p>
      </div>

      <div className="tabs mb-6 flex flex-wrap">
        <button
          className={`tab tab-lifted tab-lg sm:tab-md mr-1 mb-1 px-4 py-2 font-medium text-sm sm:text-base rounded-t-md focus:outline-none transition-colors duration-150 ease-in-out 
            ${activeTab === 'incoming' ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          onClick={() => setActiveTab('incoming')}
        >
          Incoming Requests ({incomingRequests.length})
        </button>
        <button
          className={`tab tab-lifted tab-lg sm:tab-md mr-1 mb-1 px-4 py-2 font-medium text-sm sm:text-base rounded-t-md focus:outline-none transition-colors duration-150 ease-in-out 
            ${activeTab === 'sent' ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent Requests ({sentRequests.length})
        </button>
        <button
          className={`tab tab-lifted tab-lg sm:tab-md mb-1 px-4 py-2 font-medium text-sm sm:text-base rounded-t-md focus:outline-none transition-colors duration-150 ease-in-out 
            ${activeTab === 'current' ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          onClick={() => setActiveTab('current')}
        >
          Current Connections ({currentConnections.length})
        </button>
      </div>

      <div className="bg-gray-50 p-4 sm:p-6 rounded-b-md shadow">
        {activeTab === 'incoming' && renderList(incomingRequests, 'incoming')}
        {activeTab === 'sent' && renderList(sentRequests, 'sent')}
        {activeTab === 'current' && renderList(currentConnections, 'current')}
      </div>
    </div>
  );
} 
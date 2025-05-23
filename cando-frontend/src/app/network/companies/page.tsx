'use client'

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import CompanyConnectButton from '@/components/connections/CompanyConnectButton';
import toast from 'react-hot-toast';

// Updated interface based on get_company_connections RPC
interface ConnectedCompany {
  connected_company_id: string; 
  name: string | null;
  avatar_url: string | null; 
  industry: string | null; 
  connected_at: string;
}

// Type for the raw data from get_company_network_details RPC
// Fallback to a more generic type if supabase.ts is not updated, but keep the specific one for reference
type CompanyNetworkDetailRow = 
  Database['public']['Functions']['get_company_network_details']['Returns'][number] 
  | { 
      target_company_id: string; 
      target_company_name: string | null; 
      target_company_avatar_url: string | null; 
      target_company_industry: string | null; 
      connection_status_with_acting_company: string | null; 
      // Add other fields returned by the RPC if needed
    };

export default function CompanyNetworkPage() {
  const supabase = createClientComponentClient<Database>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [actingCompanyId, setActingCompanyId] = useState<string | null>(null);
  const [connectedCompanies, setConnectedCompanies] = useState<ConnectedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: companyUserData, error: companyUserError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active_profile', true)
          .single();

        if (companyUserError || !companyUserData) {
          console.warn('Could not fetch active company for user:', companyUserError?.message);
          const { data: anyCompanyData, error: anyCompanyError } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();
          
          if (anyCompanyError || !anyCompanyData) {
            setError('You are not associated with a company or no active company found. Please ensure you have an active company selected in your profile or dashboard.');
            setActingCompanyId(null);
            setIsLoading(false); // Stop loading as we can't proceed
            return;
          }
          setActingCompanyId(anyCompanyData.company_id);
        } else {
          setActingCompanyId(companyUserData.company_id);
        }
      } else {
        setError('You must be logged in to view company connections.');
        setIsLoading(false);
      }
    };
    fetchUserAndCompany();
  }, [supabase]);

  const fetchConnectedCompanies = useCallback(async (currentActingCompanyId: string) => {
    if (!currentActingCompanyId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Use get_company_connections RPC
      const { data, error: rpcError } = await supabase.rpc('get_company_connections', {
        p_company_id: currentActingCompanyId,
      });

      if (rpcError) throw rpcError;
      
      const rpcCallResult = data || [];
      
      const mappedData: ConnectedCompany[] = rpcCallResult.map(c => ({
        connected_company_id: c.connected_company_id,
        name: c.name || 'Unnamed Company',
        avatar_url: c.avatar_url,
        industry: c.industry,
        connected_at: c.connected_at
      }));

      setConnectedCompanies(mappedData);
    } catch (e: any) {
      console.error('Error fetching connected companies:', e);
      setError(e.message || 'Failed to fetch company connections.');
      setConnectedCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (actingCompanyId) {
      fetchConnectedCompanies(actingCompanyId);
    } else if (currentUser && !actingCompanyId && !error && !isLoading) { // Ensure isLoading is also checked
      //setError('No active company found to display connections for.'); // This message is now set earlier
    }
  }, [actingCompanyId, currentUser, fetchConnectedCompanies, error, isLoading]);

  const handleConnectionStatusChange = (newStatus: string, targetCompanyId: string) => {
    toast.success(`Connection with company ${targetCompanyId} updated to ${newStatus}. Refreshing list.`);
    if (actingCompanyId) {
      fetchConnectedCompanies(actingCompanyId);
    }
  };

  if (!currentUser && !isLoading) {
     return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">{error || 'Please log in to view company connections.'}</p>
        <Link href="/auth/login" className="text-primary-600 hover:underline mt-4 inline-block">
          Login
        </Link>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Loading company network...</p>
      </div>
    );
  }

  if (error && !actingCompanyId) { // If there was an error determining the acting company
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">{error}</p>
        {/* Optional: Link to create/select company */}
      </div>
    );
  }
  
  if (!actingCompanyId && !isLoading) {
     return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">No active company profile found. Please select or create a company to see its network.</p>
        {/* TODO: Add link to company selection or creation page */}
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Company Network</h1>
      
      {error && actingCompanyId && ( // Error fetching connections for a specific company
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {connectedCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectedCompanies.map((company) => (
            <div key={company.connected_company_id} className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition-shadow flex flex-col justify-between">
              <div> {/* Content wrapper */}
                <Link href={`/company/${company.connected_company_id}`} className="group">
                  <div className="flex items-center mb-3">
                    {company.avatar_url ? (
                      <Image
                        src={company.avatar_url}
                        alt={company.name || 'Company'}
                        width={48}
                        height={48}
                        className="rounded-full mr-4 object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                        <BuildingOffice2Icon className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 truncate" title={company.name || 'Company'}>
                        {company.name || 'Company'}
                      </h2>
                      {company.industry && (
                        <p className="text-sm text-gray-600 truncate">{company.industry}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>

              {/* Actions: View Profile and Connect Button */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Link 
                  href={`/company/${company.connected_company_id}`} 
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap">
                  View Profile
                </Link>
                {currentUser && actingCompanyId && actingCompanyId !== company.connected_company_id && (
                  <CompanyConnectButton 
                    currentUser={currentUser} 
                    actingCompanyId={actingCompanyId}
                    targetCompanyId={company.connected_company_id} 
                    onStatusChange={handleConnectionStatusChange}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="text-gray-600">This company has no connections yet.</p>
      )}
    </div>
  );
} 
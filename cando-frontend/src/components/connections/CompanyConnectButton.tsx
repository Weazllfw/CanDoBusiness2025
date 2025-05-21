'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Define the expected structure of a row from the company_connections table
type CompanyConnectionRow = Database['public']['Tables']['company_connections']['Row'];

// Define connection statuses for companies
// These should align with your company_connection_status enum and RPC return values
type CompanyConnectionStatus =
  | 'NONE'
  | 'PENDING_SENT'
  | 'PENDING_RECEIVED'
  | 'ACCEPTED'
  | 'DECLINED_SENT'      // Request sent by acting company was declined by target
  | 'DECLINED_RECEIVED'  // Request received from target company was declined by acting company
  | 'BLOCKED'            // Connection is blocked (can be mutual or one-way based on your logic)
  | 'LOADING'
  | 'ERROR'
  | 'CANNOT_CONNECT'; // e.g. if user is not admin of acting company

interface CompanyConnectButtonProps {
  actingCompanyId: string | null; // Changed to allow null
  targetCompanyId: string;
  currentUser: User | null; // To verify admin privileges for actingCompanyId
  onStatusChange?: (newStatus: CompanyConnectionStatus, targetCompanyId: string) => void;
}

const CompanyConnectButton: React.FC<CompanyConnectButtonProps> = ({
  actingCompanyId,
  targetCompanyId,
  currentUser,
  onStatusChange,
}) => {
  const supabase = createClientComponentClient<Database>();
  const [status, setStatus] = useState<CompanyConnectionStatus>('LOADING');
  const [requestDetails, setRequestDetails] = useState<CompanyConnectionRow | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check if the current user is an admin of the acting company
  const checkAdminStatus = useCallback(async () => {
    if (!currentUser || !actingCompanyId) {
      setIsAdmin(false);
      setStatus('CANNOT_CONNECT');
      return false;
    }
    try {
      const { data, error } = await supabase.rpc('is_company_admin', {
        p_user_id: currentUser.id,
        p_company_id: actingCompanyId,
      });
      if (error) {
        // If RPC not found, types might be outdated. This error is hard to catch without string matching.
        if (error.message.includes('function internal.is_company_admin does not exist')) {
          toast.error('Admin check function not found. Supabase types may need regeneration.');
        } else {
          toast.error('Error checking admin status.');
        }
        throw error;
      }
      
      if (data === true) {
        setIsAdmin(true);
        return true;
      } else {
        setIsAdmin(false);
        setStatus('CANNOT_CONNECT');
        // toast.error("You don't have permission to manage this company's connections."); // Can be noisy if button shown widely
        if (onStatusChange) onStatusChange('CANNOT_CONNECT', targetCompanyId);
        return false;
      }
    } catch (err) {
      console.error('Error checking company admin status:', err);
      setIsAdmin(false);
      setStatus('ERROR');
      if (onStatusChange) onStatusChange('ERROR', targetCompanyId);
      return false;
    }
  }, [supabase, currentUser, actingCompanyId, targetCompanyId, onStatusChange]);


  const fetchConnectionStatus = useCallback(async () => {
    if (!currentUser || !actingCompanyId || !targetCompanyId || actingCompanyId === targetCompanyId || isAdmin === false) {
      setStatus(actingCompanyId === targetCompanyId || isAdmin === false || !actingCompanyId ? 'CANNOT_CONNECT' : 'NONE');
      return;
    }
    setStatus('LOADING');
    try {
      const { data, error } = await supabase.rpc('get_company_connection_status_with', {
        p_acting_company_id: actingCompanyId,
        p_other_company_id: targetCompanyId,
      });
      if (error) throw error;

      // Ensure the return type from RPC matches CompanyConnectionStatus
      const currentStatus = (data as CompanyConnectionStatus | null) || 'NONE';
      setStatus(currentStatus);
      if (onStatusChange) onStatusChange(currentStatus, targetCompanyId);

      if (currentStatus === 'PENDING_RECEIVED') {
        const { data: pendingRequests, error: reqError } = await supabase
          .rpc('get_pending_company_connection_requests', { p_for_company_id: actingCompanyId }) as { data: CompanyConnectionRow[] | null, error: any };
        
        if (reqError) {
          console.error('Error fetching pending company requests:', reqError);
        } else if (pendingRequests) {
          const specificRequest = pendingRequests.find(
            (req: CompanyConnectionRow) => req.requester_company_id === targetCompanyId && req.addressee_company_id === actingCompanyId
          );
          if (specificRequest) {
            setRequestDetails(specificRequest);
          }
        }
      } else {
        setRequestDetails(null);
      }
    } catch (err) {
      console.error('Error fetching company connection status:', err);
      setStatus('ERROR');
      if (onStatusChange) onStatusChange('ERROR', targetCompanyId);
    }
  }, [supabase, actingCompanyId, targetCompanyId, currentUser, onStatusChange, isAdmin]);

  useEffect(() => {
    async function init() {
        if (currentUser && actingCompanyId && targetCompanyId) {
            const isAdminResult = await checkAdminStatus();
            if (isAdminResult) {
                fetchConnectionStatus();
            }
        } else if (!currentUser) {
            setStatus('CANNOT_CONNECT'); // No user, can't connect
        }
    }
    init();
  }, [checkAdminStatus, fetchConnectionStatus, currentUser, actingCompanyId, targetCompanyId]);


  const handleSendRequest = async () => {
    if (!currentUser || !actingCompanyId || !isAdmin) return;
    setStatus('LOADING');
    try {
      const { error } = await supabase.rpc('send_company_connection_request', {
        p_acting_company_id: actingCompanyId,
        p_target_company_id: targetCompanyId,
      });
      if (error) throw error;
      toast.success('Connection request sent to company!');
      setStatus('PENDING_SENT');
      if (onStatusChange) onStatusChange('PENDING_SENT', targetCompanyId);
    } catch (err: any) {
      console.error('Error sending company connection request:', err);
      toast.error(err.message || 'Failed to send request.');
      fetchConnectionStatus();
    }
  };

  const handleRespondRequest = async (response: 'ACCEPTED' | 'DECLINED') => {
    if (!currentUser || !requestDetails?.id || !actingCompanyId || !isAdmin) return;
    setStatus('LOADING');
    try {
      const { error } = await supabase.rpc('respond_company_connection_request', {
        p_request_id: requestDetails.id,
        p_response: response, 
        // p_acting_company_id is NOT a parameter for this RPC
      });
      if (error) throw error;
      toast.success(response === 'ACCEPTED' ? 'Company connection accepted!' : 'Company connection declined.');
      // Status will be updated by a re-fetch or based on RPC return value if available
      fetchConnectionStatus(); // Re-fetch to get the accurate new status (e.g. ACCEPTED, DECLINED_BY_US)
    } catch (err: any) {
      console.error('Error responding to company request:', err);
      toast.error(err.message || 'Failed to respond to request.');
      fetchConnectionStatus();
    }
  };

  const handleRemoveConnection = async () => {
    if (!currentUser || !actingCompanyId || !isAdmin) return;
    setStatus('LOADING');
    try {
      if (status === 'PENDING_SENT') {
         // p_from_company_id is the correct param for get_sent_company_connection_requests
         const { data: sentRequests, error: fetchError } = await supabase
           .rpc('get_sent_company_connection_requests', { p_from_company_id: actingCompanyId }) as {data: CompanyConnectionRow[] | null, error: any};

         if (fetchError || !sentRequests) {
            toast.error('Could not verify sent request to cancel. Please refresh.');
            throw fetchError || new Error('Could not fetch sent company requests');
         }
         const requestToCancel = sentRequests.find(req => req.addressee_company_id === targetCompanyId);

         if (!requestToCancel || !requestToCancel.id) {
            toast.error('Sent request not found. It might have been responded to. Refreshing.');
            fetchConnectionStatus();
            return;
         }
         const { error: deleteError } = await supabase
            .from('company_connections')
            .delete()
            .match({ id: requestToCancel.id, requester_company_id: actingCompanyId });

        if (deleteError) throw deleteError;
        toast.success('Company connection request cancelled.');
        setStatus('NONE');
        if (onStatusChange) onStatusChange('NONE', targetCompanyId);
        return;

      } else if (status === 'ACCEPTED') {
          const { error } = await supabase.rpc('remove_company_connection', {
            p_acting_company_id: actingCompanyId,
            p_other_company_id: targetCompanyId,
          });
          if (error) throw error;
          toast.success('Company connection removed.');
          setStatus('NONE');
          if (onStatusChange) onStatusChange('NONE', targetCompanyId);
      } else {
        console.warn("Cannot cancel/remove connection in current state from here: " + status);
        toast.error("Action not applicable to current connection state.")
        return;
      }
    } catch (err: any) {
      console.error('Error updating company connection:', err);
      toast.error(err.message || 'Failed to update connection.');
      fetchConnectionStatus();
    }
  };

  if (!actingCompanyId) {
    return null;
  }
  if (isAdmin === false && currentUser) { 
      return <button className="btn btn-sm btn-disabled" disabled>Not Company Admin</button>;
  }
  if (!currentUser || actingCompanyId === targetCompanyId ) {
    if (actingCompanyId === targetCompanyId) {
         return <button className="btn btn-sm btn-disabled" disabled>Cannot connect to self</button>;
    }
    return null; 
  }
  
  if (status === 'LOADING' || isAdmin === null) {
    return <button className="btn btn-sm btn-disabled" disabled>Loading...</button>;
  }

  if (status === 'ERROR') {
    return <button className="btn btn-sm btn-error" onClick={fetchConnectionStatus}>Error. Retry?</button>;
  }
   if (status === 'CANNOT_CONNECT' ) {
     return <button className="btn btn-sm btn-disabled" disabled>Cannot Connect</button>;
   }


  switch (status) {
    case 'NONE':
      return <button className="btn btn-sm btn-primary" onClick={handleSendRequest}>Connect with Company</button>;
    case 'PENDING_SENT':
      return (
        <div className="tooltip" data-tip="Your company sent a connection request">
          <button className="btn btn-sm btn-outline" onClick={handleRemoveConnection}>Request Sent (Cancel)</button>
        </div>
      );
    case 'PENDING_RECEIVED':
      return (
        <div className="flex space-x-2">
          <button className="btn btn-sm btn-success" onClick={() => handleRespondRequest('ACCEPTED')}>Accept</button>
          <button className="btn btn-sm btn-warning" onClick={() => handleRespondRequest('DECLINED')}>Decline</button>
        </div>
      );
    case 'ACCEPTED':
      return <button className="btn btn-sm btn-info" onClick={handleRemoveConnection}>Connected (Disconnect)</button>;
    case 'DECLINED_SENT':
      return <button className="btn btn-sm btn-disabled" disabled>Request Declined by Them</button>;
    case 'DECLINED_RECEIVED':
      return <button className="btn btn-sm btn-disabled" disabled>Declined by You</button>;
    case 'BLOCKED':
      return <button className="btn btn-sm btn-disabled" disabled>Connection Blocked</button>;
    default:
      // This function attempts to assert that `status` is `never` at this point.
      // If the switch doesn't cover all CompanyConnectionStatus (excluding LOADING, ERROR, CANNOT_CONNECT handled above)
      // it would be a type error here.
      const exhaustiveCheck: never = status;
      return <button className="btn btn-sm btn-disabled" disabled>Status: {exhaustiveCheck}</button>;
  }
};

export default CompanyConnectButton; 
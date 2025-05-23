'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Define the expected structure of a row from the user_connections table
// This should align with your actual table definition in supabase.ts after type generation
type UserConnectionRow = Database['public']['Tables']['user_connections']['Row'];

type ConnectionStatus = 
  | 'NONE' 
  | 'PENDING_SENT' 
  | 'PENDING_RECEIVED' 
  | 'ACCEPTED' 
  | 'DECLINED_BY_THEM' 
  | 'DECLINED_BY_ME' 
  | 'BLOCKED' 
  | 'LOADING' 
  | 'ERROR';

interface UserConnectButtonProps {
  targetUserId: string;
  currentUser: User | null;
  onStatusChange?: (newStatus: ConnectionStatus, targetUserId: string) => void;
}

const UserConnectButton: React.FC<UserConnectButtonProps> = ({ targetUserId, currentUser, onStatusChange }) => {
  const supabase = createClientComponentClient<Database>();
  const [status, setStatus] = useState<ConnectionStatus>('LOADING');
  const [requestDetails, setRequestDetails] = useState<UserConnectionRow | null>(null);
  const lastReportedStatusRef = useRef<ConnectionStatus | null>(null);

  const fetchConnectionStatus = useCallback(async () => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) {
      const initialErrorStatus = currentUser?.id === targetUserId ? 'ERROR' : 'NONE';
      setStatus(initialErrorStatus);
      if (onStatusChange && lastReportedStatusRef.current !== initialErrorStatus) {
        onStatusChange(initialErrorStatus, targetUserId);
        lastReportedStatusRef.current = initialErrorStatus;
      }
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('get_user_connection_status_with', { p_other_user_id: targetUserId });
      if (error) throw error;

      const newFetchedStatus = (data as ConnectionStatus | null) || 'NONE';
      setStatus(newFetchedStatus);

      if (onStatusChange && lastReportedStatusRef.current !== newFetchedStatus) {
        onStatusChange(newFetchedStatus, targetUserId);
        lastReportedStatusRef.current = newFetchedStatus;
      }
      
      if (newFetchedStatus === 'PENDING_RECEIVED') {
        const { data: pendingRequests, error: reqError } = await supabase
          .rpc('get_pending_user_connection_requests') as { data: UserConnectionRow[] | null, error: any };
        
        if (reqError) {
          console.error('Error fetching pending requests:', reqError);
        } else if (pendingRequests) {
          const specificRequest = pendingRequests.find((req: UserConnectionRow) => req.requester_id === targetUserId);
          if (specificRequest) {
            setRequestDetails(specificRequest);
          }
        }
      }

    } catch (err) {
      console.error('Error fetching connection status:', err);
      const errorStatus = 'ERROR';
      setStatus(errorStatus);
      if (onStatusChange && lastReportedStatusRef.current !== errorStatus) {
        onStatusChange(errorStatus, targetUserId);
        lastReportedStatusRef.current = errorStatus;
      }
    }
  }, [supabase, targetUserId, currentUser, onStatusChange]);

  useEffect(() => {
    if (currentUser && targetUserId) {
      fetchConnectionStatus();
    }
  }, [fetchConnectionStatus, currentUser, targetUserId]);

  const handleSendRequest = async () => {
    if (!currentUser) return;
    setStatus('LOADING');
    try {
      const { error } = await supabase.rpc('send_user_connection_request', { p_addressee_id: targetUserId });
      if (error) throw error;
      toast.success('Connection request sent!');
      const newStatus = 'PENDING_SENT';
      setStatus(newStatus);
      if (onStatusChange && lastReportedStatusRef.current !== newStatus) {
        onStatusChange(newStatus, targetUserId);
        lastReportedStatusRef.current = newStatus;
      }
    } catch (err: any) {
      console.error('Error sending connection request:', err);
      toast.error(err.message || 'Failed to send request.');
      if (currentUser && targetUserId) fetchConnectionStatus();
    }
  };

  const handleRespondRequest = async (response: 'accept' | 'decline') => {
    if (!currentUser || !requestDetails?.id) return;
    setStatus('LOADING');
    try {
      const { error } = await supabase.rpc('respond_user_connection_request', { p_request_id: requestDetails.id, p_response: response });
      if (error) throw error;
      toast.success(response === 'accept' ? 'Connection accepted!' : 'Connection declined.');
      const newStatus = response === 'accept' ? 'ACCEPTED' : 'DECLINED_BY_ME';
      setStatus(newStatus);
      if (onStatusChange && lastReportedStatusRef.current !== newStatus) {
        onStatusChange(newStatus, targetUserId);
        lastReportedStatusRef.current = newStatus;
      }
      setRequestDetails(null); 
    } catch (err: any) {
      console.error('Error responding to request:', err);
      toast.error(err.message || 'Failed to respond to request.');
      if (currentUser && targetUserId) fetchConnectionStatus(); 
    }
  };

  const handleRemoveConnection = async () => {
    if (!currentUser) return;
    setStatus('LOADING');
    try {
      let newStatus: ConnectionStatus = 'NONE';
      if (status === 'PENDING_SENT') {
        const {data: sentRequests, error: fetchError} = await supabase
            .rpc('get_sent_user_connection_requests') as { data: UserConnectionRow[] | null, error: any };

        if(fetchError || !sentRequests) throw fetchError || new Error("Could not fetch sent requests to cancel");
        const requestToCancel = sentRequests.find((req: UserConnectionRow) => req.addressee_id === targetUserId);
        if(!requestToCancel) throw new Error("Sent request not found to cancel");

        const { error } = await supabase.from('user_connections').delete().match({ id: requestToCancel.id, requester_id: currentUser.id });
        if (error) throw error;
        toast.success('Request cancelled.');
      } else {
        const { error } = await supabase.rpc('remove_user_connection', { p_other_user_id: targetUserId });
        if (error) throw error;
        toast.success('Connection removed.');
      }
      setStatus(newStatus);
      if (onStatusChange && lastReportedStatusRef.current !== newStatus) {
        onStatusChange(newStatus, targetUserId);
        lastReportedStatusRef.current = newStatus;
      }
    } catch (err: any) {
      console.error('Error removing connection/cancelling request:', err);
      toast.error(err.message || 'Failed to update connection.');
      if (currentUser && targetUserId) fetchConnectionStatus(); 
    }
  };

  if (!currentUser || currentUser.id === targetUserId) {
    return null; 
  }

  if (status === 'LOADING' && lastReportedStatusRef.current === null) {
    return <button className="btn btn-sm btn-disabled" disabled>Loading...</button>;
  }

  if (status === 'LOADING' && lastReportedStatusRef.current !== null) {
    return <button className="btn btn-sm btn-disabled" disabled>Processing...</button>;
  }

  if (status === 'ERROR') {
    return <button className="btn btn-sm btn-error" onClick={fetchConnectionStatus}>Error. Retry?</button>;
  }

  switch (status) {
    case 'NONE':
      return <button className="btn btn-sm btn-primary" onClick={handleSendRequest}>Connect</button>;
    case 'PENDING_SENT':
      return (
        <div className="tooltip" data-tip="You sent a connection request">
          <button className="btn btn-sm btn-outline" onClick={handleRemoveConnection}>Request Sent (Cancel)</button>
        </div>
      );
    case 'PENDING_RECEIVED':
      return (
        <div className="flex space-x-2">
          <button className="btn btn-sm btn-success" onClick={() => handleRespondRequest('accept')}>Accept</button>
          <button className="btn btn-sm btn-warning" onClick={() => handleRespondRequest('decline')}>Decline</button>
        </div>
      );
    case 'ACCEPTED':
      return <button className="btn btn-sm btn-info" onClick={handleRemoveConnection}>Connected (Disconnect)</button>;
    case 'DECLINED_BY_THEM':
      return <button className="btn btn-sm btn-disabled" disabled>Request Declined</button>;
    case 'DECLINED_BY_ME':
      return <button className="btn btn-sm btn-disabled" disabled>You Declined</button>;
    case 'BLOCKED':
      return <button className="btn btn-sm btn-disabled" disabled>Connection Blocked</button>;
    default:
      console.warn('[UserConnectButton] Unhandled status in switch:', status);
      return <button className="btn btn-sm btn-disabled" disabled>Status: {String(status)}</button>;
  }
};

export default UserConnectButton; 
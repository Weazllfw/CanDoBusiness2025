'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'
import { EyeIcon, PencilIcon, CheckCircleIcon, XCircleIcon, ShieldExclamationIcon, TrashIcon, ExclamationTriangleIcon, UserMinusIcon } from '@heroicons/react/24/outline'

// Type for individual flagged post item from RPC
export type FlaggedPostItem = Database['public']['Functions']['admin_get_post_flags']['Returns'] extends (infer U)[] ? U : never;

// Type for individual flagged comment item from RPC
export type FlaggedCommentItem = Database['public']['Functions']['admin_get_comment_flags']['Returns'] extends (infer U)[] ? U : never;

// Type for flag status enum
type FlagStatus = Database['public']['Enums']['flag_status_enum'];

// Temporary manual type definition for ProfileStatusEnumType - ideally this should come from generated supabase.ts
type ProfileStatusEnumType = 'active' | 'warned' | 'banned_temporarily' | 'banned_permanently';
// Temporary manual type definition for AdminActionTargetTypeEnumType
type AdminActionTargetTypeEnumType = 'post' | 'comment' | 'profile' | 'flag';

// Type for the state of selectedUserToBan
type SelectedUserToBanType = {
  userId: string;
  userName: string | null;
  flagId: string;
  flagType: 'post' | 'comment';
  contentId: string | undefined;
} | null;

const ADMIN_EMAILS = ['rmarshall@itmarshall.net', 'anotheradmin@example.com']; // Consider centralizing or using env vars

const PAGE_SIZE = 10;

// Corrected flag statuses based on DB enum
const flagStatusesDB: FlagStatus[] = [
    'pending_review',
    'resolved_no_action',
    'resolved_content_removed',
    'resolved_user_warned',
    'resolved_user_banned'
];

export default function AdminFlagsPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Overall page loading

  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  
  const [postFlags, setPostFlags] = useState<FlaggedPostItem[]>([]);
  const [commentFlags, setCommentFlags] = useState<FlaggedCommentItem[]>([]);
  
  const [isLoadingFlags, setIsLoadingFlags] = useState(false); // For loading flags data specifically
  const [flagsError, setFlagsError] = useState<string | null>(null); // For fetching flags or modal updates
  const [actionError, setActionError] = useState<string | null>(null); // For direct actions like remove/warn
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const [currentPagePosts, setCurrentPagePosts] = useState(1);
  const [totalPostFlags, setTotalPostFlags] = useState(0);
  const [currentStatusFilterPosts, setCurrentStatusFilterPosts] = useState<FlagStatus | 'all'>('all');

  const [currentPageComments, setCurrentPageComments] = useState(1);
  const [totalCommentFlags, setTotalCommentFlags] = useState(0);
  const [currentStatusFilterComments, setCurrentStatusFilterComments] = useState<FlagStatus | 'all'>('all');

  // Modal state for updating flag status
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FlaggedPostItem | FlaggedCommentItem | null | undefined>(null);
  const [selectedFlagType, setSelectedFlagType] = useState<'post' | 'comment' | null>(null);
  const [newStatus, setNewStatus] = useState<FlagStatus>('pending_review'); 
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingFlag, setIsUpdatingFlag] = useState(false);

  // State for Ban User Modal
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [selectedUserToBan, setSelectedUserToBan] = useState<SelectedUserToBanType>(null);
  const [banDuration, setBanDuration] = useState<number | undefined>(30); 
  const [banType, setBanType] = useState<ProfileStatusEnumType>('banned_temporarily');
  const [isProcessingBan, setIsProcessingBan] = useState(false);
  const [banAdminNotes, setBanAdminNotes] = useState('');

  // State for direct actions
  const [isRemovingContent, setIsRemovingContent] = useState(false);
  const [isWarningUser, setIsWarningUser] = useState(false);
  const [processingActionFlagId, setProcessingActionFlagId] = useState<string | null>(null);

  const clearMessages = () => {
    setFlagsError(null);
    setActionError(null);
    setActionSuccessMessage(null);
  }

  const fetchPostFlags = useCallback(async (page: number, status: FlagStatus | 'all') => {
    if (!isAdmin) return;
    setIsLoadingFlags(true);
    clearMessages();
    try {
      const { data, error } = await supabase.rpc('admin_get_post_flags', {
        p_page_number: page,
        p_page_size: PAGE_SIZE,
        p_status: status === 'all' ? undefined : status,
      })

      if (error) throw error;
      setPostFlags(data || []);
      const currentTotal = data?.[0]?.total_count;
      setTotalPostFlags(typeof currentTotal === 'number' ? currentTotal : 0);
    } catch (e: any) {
      console.error('Error fetching post flags:', e);
      setFlagsError(e.message || 'Failed to load post flags.');
    } finally {
      setIsLoadingFlags(false);
    }
  }, [supabase, isAdmin]);

  const fetchCommentFlags = useCallback(async (page: number, status: FlagStatus | 'all') => {
    if (!isAdmin) return;
    setIsLoadingFlags(true);
    clearMessages();
    try {
      const { data, error } = await supabase.rpc('admin_get_comment_flags', {
        p_page_number: page,
        p_page_size: PAGE_SIZE,
        p_status: status === 'all' ? undefined : status,
      });

      if (error) throw error;
      setCommentFlags(data || []);
      const currentTotal = data?.[0]?.total_count;
      setTotalCommentFlags(typeof currentTotal === 'number' ? currentTotal : 0);
    } catch (e: any) {
      console.error('Error fetching comment flags:', e);
      setFlagsError(e.message || 'Failed to load comment flags.');
    } finally {
      setIsLoadingFlags(false);
    }
  }, [supabase, isAdmin]);

  useEffect(() => {
    const checkAdminAndInitialFetch = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);

      if (session.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        router.push('/feed'); // Or an unauthorized page
      }
      setIsLoading(false);
    };
    checkAdminAndInitialFetch();
  }, [supabase, router]);

  useEffect(() => {
    if (isAdmin && activeTab === 'posts') {
      fetchPostFlags(currentPagePosts, currentStatusFilterPosts);
    }
  }, [isAdmin, activeTab, currentPagePosts, currentStatusFilterPosts, fetchPostFlags]);

  useEffect(() => {
    if (isAdmin && activeTab === 'comments') {
      fetchCommentFlags(currentPageComments, currentStatusFilterComments);
    }
  }, [isAdmin, activeTab, currentPageComments, currentStatusFilterComments, fetchCommentFlags]);
  
  const handleOpenModal = (flag: FlaggedPostItem | FlaggedCommentItem, type: 'post' | 'comment') => {
    clearMessages();
    setSelectedFlag(flag);
    setSelectedFlagType(type);
    setNewStatus(flag?.status || 'pending_review'); 
    setAdminNotes(flag?.admin_notes || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFlag(null);
    setSelectedFlagType(null);
    setAdminNotes('');
    if (flagsError && isModalOpen) { // Clear modal-specific error if it was for the flag update modal
        setFlagsError(null);
    }
  };

  const handleOpenBanModal = (userId: string, userName: string | null, flagId: string, flagType: 'post' | 'comment', contentId: string | null) => {
    clearMessages();
    setSelectedUserToBan({ userId, userName, flagId, flagType, contentId: contentId || undefined });
    setIsBanModalOpen(true);
    setBanDuration(30); 
    setBanType('banned_temporarily');
    setBanAdminNotes(''); 
  };
  
  const handleCloseBanModal = () => {
    setIsBanModalOpen(false);
    setSelectedUserToBan(null);
    setBanDuration(undefined);
    setBanType('banned_temporarily');
    setBanAdminNotes('');
    if (flagsError && isBanModalOpen) { // Clear modal-specific error if it was for the ban modal
        setFlagsError(null);
    }
  };

  const handleUpdateFlag = async () => {
    if (!selectedFlag || !selectedFlagType) return;
    setIsUpdatingFlag(true);
    setFlagsError(null); 
    try {
      let rpcError;
      if (selectedFlagType === 'post') { 
        const { error } = await supabase.rpc('admin_update_post_flag_status', {
          p_flag_id: selectedFlag.flag_id,
          p_new_status: newStatus,
          p_admin_notes: adminNotes
        });
        rpcError = error;
      } else {
        const { error } = await supabase.rpc('admin_update_comment_flag_status', {
          p_flag_id: selectedFlag.flag_id,
          p_new_status: newStatus,
          p_admin_notes: adminNotes
        });
        rpcError = error;
      }
      if (rpcError) throw rpcError;
      
      setActionSuccessMessage(`Flag ${selectedFlag.flag_id} status updated successfully.`);
      if (selectedFlagType === 'post') { 
        fetchPostFlags(currentPagePosts, currentStatusFilterPosts);
      } else {
        fetchCommentFlags(currentPageComments, currentStatusFilterComments);
      }
      handleCloseModal();
    } catch (e: any) {
      console.error('Error updating flag:', e);
      setFlagsError(e.message || 'Failed to update flag.'); // Show error in modal
    } finally {
      setIsUpdatingFlag(false);
    }
  };

  const handleRemoveContent = async (flag: FlaggedPostItem | FlaggedCommentItem, type: 'post' | 'comment') => {
    clearMessages();
    const reason = window.prompt(`Enter reason for removing this ${type}:`);
    if (reason === null) return; // User cancelled

    setProcessingActionFlagId(flag.flag_id);
    setIsRemovingContent(true);
    try {
      let rpcError;
      if (type === 'post') {
        const postFlag = flag as FlaggedPostItem;
        const { error } = await supabase.rpc('admin_remove_post', { 
          p_post_id: postFlag.post_id, 
          p_reason: reason,
          p_related_flag_id: flag.flag_id,
          p_flag_table: 'post_flags'
        });
        rpcError = error;
      } else {
        const commentFlag = flag as FlaggedCommentItem;
        const { error } = await supabase.rpc('admin_remove_comment', { 
          p_comment_id: commentFlag.comment_id, 
          p_reason: reason,
          p_related_flag_id: flag.flag_id,
          p_flag_table: 'comment_flags'
        });
        rpcError = error;
      }
      if (rpcError) throw rpcError;

      setActionSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully. Flag status updated.`);
      if (type === 'post') {
        fetchPostFlags(currentPagePosts, currentStatusFilterPosts);
      } else {
        fetchCommentFlags(currentPageComments, currentStatusFilterComments);
      }
    } catch (e: any) {
      console.error(`Error removing ${type}:`, e);
      setActionError(e.message || `Failed to remove ${type}.`);
    } finally {
      setIsRemovingContent(false);
      setProcessingActionFlagId(null);
    }
  };

  const handleWarnUser = async (authorId: string, authorName: string | null, flagId: string, flagType: 'post' | 'comment', contentId: string | null) => {
    clearMessages();
    const reason = window.prompt(`Enter reason for warning user ${authorName || authorId}:`);
    if (reason === null) return; 

    setProcessingActionFlagId(flagId);
    setIsWarningUser(true);
    try {
      const { error } = await supabase.rpc('admin_warn_user', {
        p_target_profile_id: authorId,
        p_reason: reason,
        p_related_content_id: contentId === null ? undefined : contentId,
        p_related_content_type: flagType as AdminActionTargetTypeEnumType,
        p_related_flag_id: flagId,
        p_flag_table: flagType === 'post' ? 'post_flags' : 'comment_flags'
      });
      if (error) throw error;

      setActionSuccessMessage(`User ${authorName || authorId} warned successfully. Flag status updated.`);
      if (flagType === 'post') {
        fetchPostFlags(currentPagePosts, currentStatusFilterPosts);
      } else {
        fetchCommentFlags(currentPageComments, currentStatusFilterComments);
      }
    } catch (e: any) {
      console.error('Error warning user:', e);
      setActionError(e.message || 'Failed to warn user.');
    } finally {
      setIsWarningUser(false);
      setProcessingActionFlagId(null);
    }
  };

  const handleExecuteBan = async () => {
    if (!selectedUserToBan) return;
    setIsProcessingBan(true);
    setFlagsError(null); // Clear previous modal errors
    try {
      const { error } = await supabase.rpc('admin_ban_user', {
        p_target_profile_id: selectedUserToBan.userId,
        p_reason: banAdminNotes,
        p_duration_days: banType === 'banned_temporarily' ? (banDuration ? Number(banDuration) : undefined) : undefined,
        p_related_content_id: selectedUserToBan.contentId,
        p_related_content_type: selectedUserToBan.flagType as AdminActionTargetTypeEnumType,
        p_related_flag_id: selectedUserToBan.flagId,
        p_flag_table: selectedUserToBan.flagType === 'post' ? 'post_flags' : 'comment_flags'
      });
      if (error) throw error;

      setActionSuccessMessage(`User ${selectedUserToBan.userName || selectedUserToBan.userId} banned successfully. Flag status updated.`);
      handleCloseBanModal();
      if (selectedUserToBan.flagType === 'post') {
        fetchPostFlags(currentPagePosts, currentStatusFilterPosts);
      } else {
        fetchCommentFlags(currentPageComments, currentStatusFilterComments);
      }
    } catch (e: any) {
      console.error('Error banning user:', e);
      setFlagsError(e.message || 'Failed to ban user.'); // Show error in ban modal
    } finally {
      setIsProcessingBan(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading admin dashboard...</div>
  }

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-8">Access Denied. You are not authorized to view this page.</div>
  }

  const renderPagination = (type: 'posts' | 'comments') => {
    const currentPage = type === 'posts' ? currentPagePosts : currentPageComments;
    const totalItems = type === 'posts' ? totalPostFlags : totalCommentFlags;
    const setCurrentPage = type === 'posts' ? setCurrentPagePosts : setCurrentPageComments;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    if (totalPages <= 1) return null;

    return (
      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };
  
  const renderStatusFilter = (type: 'posts' | 'comments') => {
    const currentFilter = type === 'posts' ? currentStatusFilterPosts : currentStatusFilterComments;
    const setFilter = type === 'posts' ? setCurrentStatusFilterPosts : setCurrentStatusFilterComments;
    const setCurrentPage = type === 'posts' ? setCurrentPagePosts : setCurrentPageComments;

    return (
      <div className="mb-4">
        <label htmlFor={`status-filter-${type}`} className="block text-sm font-medium text-gray-700 mr-2">Filter by status:</label>
        <select 
          id={`status-filter-${type}`}
          value={currentFilter}
          onChange={(e) => {
            setFilter(e.target.value as FlagStatus | 'all');
            setCurrentPage(1); 
          }}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="all">All</option>
          {flagStatusesDB.map(status => (
            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g,' ')}</option>
          ))}
        </select>
      </div>
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
  };

  const getActionInProgress = (flagId: string) => {
    return processingActionFlagId === flagId && (isRemovingContent || isWarningUser);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
        <ShieldExclamationIcon className="h-8 w-8 mr-2 text-indigo-600"/> Manage Flagged Content
      </h1>
      <p className="text-gray-600 mb-8">Review and manage content reported by users.</p>

      {actionError && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-6">Error: {actionError}</p>}
      {actionSuccessMessage && <p className="text-green-500 bg-green-100 p-3 rounded-md mb-6">Success: {actionSuccessMessage}</p>}
      {/* flagsError is handled within modals or for overall flag loading issues */}
      {flagsError && !isModalOpen && !isBanModalOpen && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-6">Error loading flags: {flagsError}</p>}

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => { setActiveTab('posts'); clearMessages(); }}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'posts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Post Flags ({totalPostFlags})
          </button>
          <button
            onClick={() => { setActiveTab('comments'); clearMessages(); }}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Comment Flags ({totalCommentFlags})
          </button>
        </nav>
      </div>

      {isLoadingFlags && <p className="text-gray-500 py-4">Loading flags...</p>}
      
      {activeTab === 'posts' && (
        <section id="post-flags">
          {renderStatusFilter('posts')}
          {!isLoadingFlags && postFlags.length === 0 && <p className="text-gray-500">No post flags found for the selected filter.</p>}
          {!isLoadingFlags && postFlags.length > 0 && (
            <div className="space-y-6">
              {postFlags.map(flag => {
                const actionInProgress = getActionInProgress(flag.flag_id);
                return (
                <div key={flag.flag_id} className="bg-white shadow-lg rounded-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ 
                        flag.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 
                        flag.status === 'resolved_no_action' ? 'bg-blue-100 text-blue-800' : 
                        flag.status === 'resolved_content_removed' ? 'bg-green-100 text-green-800' : 
                        flag.status === 'resolved_user_warned' ? 'bg-purple-100 text-purple-800' : 
                        flag.status === 'resolved_user_banned' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700' 
                    }`}>
                      {flag.status ? flag.status.charAt(0).toUpperCase() + flag.status.slice(1).replace(/_/g,' ') : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1"><strong>Flag ID:</strong> {flag.flag_id}</p>
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed"><strong>Post Content:</strong> <span className="block bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">{flag.post_content}</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <p><strong>Post Author:</strong> {flag.post_author_username} ({flag.post_author_id})</p>
                    <p><strong>Flagged By:</strong> {flag.flagger_username} ({flag.flagger_user_id})</p>
                    <p><strong>Reason:</strong> {flag.reason || 'N/A'}</p>
                    <p><strong>Flagged On:</strong> {formatDate(flag.created_at)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(flag.updated_at)}</p>
                  </div>
                  {flag.admin_notes && (
                     <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200"><strong>Admin Notes:</strong> <span className="block bg-yellow-50 p-2 rounded mt-1 whitespace-pre-wrap">{flag.admin_notes}</span></p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2 justify-end">
                    <button 
                      onClick={() => handleOpenModal(flag, 'post')}
                      className="p-2 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Update Flag Status"
                      disabled={actionInProgress}
                    >
                      <PencilIcon className="h-5 w-5"/>
                    </button>
                    <button 
                      onClick={() => handleRemoveContent(flag, 'post')}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Remove Post"
                      disabled={actionInProgress || flag.status === 'resolved_content_removed'}
                    >
                      <TrashIcon className="h-5 w-5"/>
                    </button>
                     <button 
                      onClick={() => handleWarnUser(flag.post_author_id, flag.post_author_username, flag.flag_id, 'post', flag.post_id)}
                      className="p-2 text-gray-500 hover:text-yellow-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Warn Post Author"
                      disabled={actionInProgress}
                    >
                      <ExclamationTriangleIcon className="h-5 w-5"/>
                    </button>
                    <button 
                      onClick={() => handleOpenBanModal(flag.post_author_id, flag.post_author_username, flag.flag_id, 'post', flag.post_id)}
                      className="p-2 text-gray-500 hover:text-purple-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Ban Post Author"
                      disabled={actionInProgress}
                    >
                      <UserMinusIcon className="h-5 w-5"/>
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
          {renderPagination('posts')}
        </section>
      )}

      {activeTab === 'comments' && (
        <section id="comment-flags">
          {renderStatusFilter('comments')}
          {!isLoadingFlags && commentFlags.length === 0 && <p className="text-gray-500">No comment flags found for the selected filter.</p>}
          {!isLoadingFlags && commentFlags.length > 0 && (
            <div className="space-y-6">
              {commentFlags.map(flag => {
                const actionInProgress = getActionInProgress(flag.flag_id);
                return (
                 <div key={flag.flag_id} className="bg-white shadow-lg rounded-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ 
                        flag.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 
                        flag.status === 'resolved_no_action' ? 'bg-blue-100 text-blue-800' : 
                        flag.status === 'resolved_content_removed' ? 'bg-green-100 text-green-800' : 
                        flag.status === 'resolved_user_warned' ? 'bg-purple-100 text-purple-800' : 
                        flag.status === 'resolved_user_banned' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700' 
                    }`}>
                      {flag.status ? flag.status.charAt(0).toUpperCase() + flag.status.slice(1).replace(/_/g,' ') : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1"><strong>Flag ID:</strong> {flag.flag_id}</p>
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed"><strong>Comment Content:</strong> <span className="block bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">{flag.comment_content}</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <p><strong>Comment Author:</strong> {flag.comment_author_username} ({flag.comment_author_id})</p>
                    <p><strong>Flagged By:</strong> {flag.flagger_username} ({flag.flagger_user_id})</p>
                    <p><strong>Reason:</strong> {flag.reason || 'N/A'}</p>
                    <p><strong>Flagged On:</strong> {formatDate(flag.created_at)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(flag.updated_at)}</p>
                  </div>
                   {flag.admin_notes && (
                     <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200"><strong>Admin Notes:</strong> <span className="block bg-yellow-50 p-2 rounded mt-1 whitespace-pre-wrap">{flag.admin_notes}</span></p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2 justify-end">
                    <button 
                      onClick={() => handleOpenModal(flag, 'comment')}
                      className="p-2 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Update Flag Status"
                      disabled={actionInProgress}
                    >
                      <PencilIcon className="h-5 w-5"/>
                    </button>
                     <button 
                      onClick={() => handleRemoveContent(flag, 'comment')}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Remove Comment"
                      disabled={actionInProgress || flag.status === 'resolved_content_removed'}
                    >
                      <TrashIcon className="h-5 w-5"/>
                    </button>
                    <button 
                      onClick={() => handleWarnUser(flag.comment_author_id, flag.comment_author_username, flag.flag_id, 'comment', flag.comment_id)}
                      className="p-2 text-gray-500 hover:text-yellow-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Warn Comment Author"
                      disabled={actionInProgress}
                    >
                      <ExclamationTriangleIcon className="h-5 w-5"/>
                    </button>
                    <button 
                      onClick={() => handleOpenBanModal(flag.comment_author_id, flag.comment_author_username, flag.flag_id, 'comment', flag.comment_id)}
                      className="p-2 text-gray-500 hover:text-purple-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                      title="Ban Comment Author"
                      disabled={actionInProgress}
                    >
                      <UserMinusIcon className="h-5 w-5"/>
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
          {renderPagination('comments')}
        </section>
      )}

      {/* Modal for updating flag status */}
      {isModalOpen && selectedFlag && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={handleCloseModal}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Update Flag Status for {selectedFlagType === 'post' ? 'Post' : 'Comment'} Flag ID: {selectedFlag?.flag_id}
            </h3>
            {flagsError && isModalOpen && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {flagsError}</p>} 
            <div className="space-y-4">
              <div>
                <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700">New Status</label>
                <select 
                  id="newStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as FlagStatus)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {flagStatusesDB.map(status => (
                     <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700">Admin Notes (Optional)</label>
                <textarea 
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Reasoning for status change, actions taken, etc."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                type="button"
                onClick={handleCloseModal}
                disabled={isUpdatingFlag}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleUpdateFlag}
                disabled={isUpdatingFlag}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-indigo-400"
              >
                {isUpdatingFlag ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Modal for Banning User */}
      {isBanModalOpen && selectedUserToBan && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={handleCloseBanModal}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Ban User: {selectedUserToBan.userName || selectedUserToBan.userId}
            </h3>
            {/* Use flagsError for Ban Modal errors as per existing pattern */}
            {flagsError && isBanModalOpen && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{flagsError}</div>}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="banType" className="block text-sm font-medium text-gray-700">Ban Type</label>
                <select
                  id="banType"
                  name="banType"
                  value={banType}
                  onChange={(e) => {
                    setBanType(e.target.value as ProfileStatusEnumType);
                    if (e.target.value === 'banned_permanently') setBanDuration(undefined);
                    else setBanDuration(30); // Reset to default if switching back to temporary
                  }}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="banned_temporarily">Temporarily Banned</option>
                  <option value="banned_permanently">Permanently Banned</option>
                </select>
              </div>

              {banType === 'banned_temporarily' && (
                <div>
                  <label htmlFor="banDuration" className="block text-sm font-medium text-gray-700">Ban Duration (days)</label>
                  <input
                    type="number"
                    id="banDuration"
                    name="banDuration"
                    value={banDuration || ''}
                    onChange={(e) => setBanDuration(parseInt(e.target.value, 10) > 0 ? parseInt(e.target.value, 10) : undefined)}
                    min="1"
                    className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., 30"
                  />
                </div>
              )}
              <div>
                <label htmlFor="banAdminNotes" className="block text-sm font-medium text-gray-700">Admin Notes (Reason for ban)</label>
                <textarea
                  id="banAdminNotes"
                  name="banAdminNotes"
                  rows={3}
                  value={banAdminNotes}
                  onChange={(e) => setBanAdminNotes(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Required: Reason for ban, internal notes..."
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseBanModal}
                disabled={isProcessingBan}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBan} 
                disabled={isProcessingBan || !banAdminNotes.trim() || (banType === 'banned_temporarily' && (!banDuration || banDuration <= 0))}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isProcessingBan ? 'Processing...' : `Ban User`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
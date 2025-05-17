'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { XMarkIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid' 
import Link from 'next/link'

// Define the type for a single notification based on the RPC return type
// This should match or be compatible with the return type of get_user_notifications
export type UserNotification = {
  id: string // UUID
  user_id: string // UUID
  title: string
  message: string
  link_to: string | null
  is_read: boolean
  notification_type: string // Corresponds to notification_type_enum
  created_at: string // TIMESTAMPTZ
  unread_count: number // This comes from the RPC, but might not be directly on each item
}

interface NotificationDropdownProps {
  onClose: () => void
  onNotificationsUpdated: () => void // Callback to refresh parent (e.g., unread count)
}

const NOTIFICATIONS_TO_SHOW = 7 // Increased slightly

export default function NotificationDropdown({ onClose, onNotificationsUpdated }: NotificationDropdownProps) {
  const supabase = createClientComponentClient<Database>()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_user_notifications', { p_limit: NOTIFICATIONS_TO_SHOW, p_page_number: 1 })
      
      if (rpcError) throw rpcError

      setNotifications(data as UserNotification[] || [])
    } catch (e: any) {
      console.error('Error fetching notifications:', e)
      setError(e.message || 'Failed to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent click from bubbling if called from button
    try {
      const { error } = await supabase.rpc('mark_notification_as_read', { p_notification_id: notificationId })
      if (error) throw error
      // Optimistically update or refetch
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
      onNotificationsUpdated() // Notify parent to refresh unread count
    } catch (e: any) {
      console.error('Error marking notification as read:', e)
      // Potentially show a toast error
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_as_read')
      if (error) throw error
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      onNotificationsUpdated() // Notify parent to refresh unread count
    } catch (e: any) {
      console.error('Error marking all notifications as read:', e)
      // Potentially show a toast error
    }
  }

  const toggleExpandNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNotificationId(prevId => prevId === notificationId ? null : notificationId)
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div 
      className="flex flex-col h-full w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {isLoading && <div className="p-6 text-center text-gray-500">Loading notifications...</div>}
      {error && <div className="p-6 text-center text-red-500">Error: {error}</div>}

      {!isLoading && !error && notifications.length === 0 && (
        <div className="p-6 text-center text-gray-500">You have no new notifications.</div>
      )}

      {!isLoading && !error && notifications.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-gray-300 flex-grow overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[500px]">
          {notifications.map((notification) => (
            <li key={notification.id} className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-200 ${!notification.is_read ? 'bg-indigo-50 dark:bg-indigo-100' : 'bg-white dark:bg-white'}`}>
              <div className="flex items-start space-x-3">
                {!notification.is_read && (
                    <span className="flex-shrink-0 h-2 w-2 mt-1.5 bg-blue-500 rounded-full" aria-hidden="true"></span>
                )}
                {notification.is_read && (
                    <span className="flex-shrink-0 h-2 w-2 mt-1.5 bg-transparent rounded-full" aria-hidden="true"></span>
                )}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center">
                        <h4 className={`font-semibold text-sm ${!notification.is_read ? 'text-gray-800' : 'text-gray-600'}`}>{notification.title}</h4>
                        {!notification.is_read && (
                            <button 
                                onClick={(e) => handleMarkAsRead(notification.id, e)} 
                                title="Mark as read"
                                className="p-1 text-gray-400 hover:text-green-500 dark:hover:text-green-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                <CheckCircleIcon className="h-5 w-5"/>
                            </button>
                        )}
                    </div>
                    <p 
                        onClick={(e) => toggleExpandNotification(notification.id, e)} 
                        className={`text-xs mt-1 cursor-pointer ${!notification.is_read ? 'text-gray-700' : 'text-gray-500'} ${expandedNotificationId === notification.id ? 'whitespace-normal' : 'line-clamp-2'}`}
                    >
                        {notification.message}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">{formatDate(notification.created_at)}</p>
                        {notification.link_to && (
                            <Link href={notification.link_to} onClick={onClose} className="text-xs text-blue-500 hover:underline dark:hover:text-blue-400">
                                View Details
                            </Link>
                        )}
                    </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-300 sticky bottom-0 bg-white dark:bg-white">
          <button 
            onClick={handleMarkAllAsRead}
            className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-60"
            disabled={notifications.every(n => n.is_read)}
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  )
} 
'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BellIcon } from '@heroicons/react/24/outline' // Assuming you use Heroicons
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'
import { Menu, Transition } from '@headlessui/react' // Added Menu and Transition

export default function NotificationBell() {
  const supabase = createClientComponentClient<Database>()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchUnreadCount = useCallback(async (userId: string) => {
    if (!userId) return

    try {
      // We only need the count, so we can fetch 1 notification to get the total_unread.
      // Or, ideally, create a dedicated RPC just for the count if this becomes a performance concern.
      const { data, error } = await supabase
        .rpc('get_user_notifications', { p_limit: 1, p_page_number: 1 })
        // .eq('user_id', userId) // RPC handles user_id internally based on auth.uid()
        // .eq('is_read', false)
        // .select('id', { count: 'exact', head: true })

      if (error) {
        console.error('Error fetching unread notification count:', error)
        return
      }
      // The RPC returns unread_count on each row, so pick it from the first if available.
      setUnreadCount(data && data.length > 0 ? data[0].unread_count || 0 : 0)
    } catch (e) {
      console.error('Exception fetching unread count:', e)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) {
        fetchUnreadCount(user.id)
      }
    }
    getUser()
  }, [supabase, fetchUnreadCount])

  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel('public:user_notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'user_notifications',
          filter: `user_id=eq.${currentUser.id}` 
        },
        (payload) => {
          console.log('New notification received:', payload)
          fetchUnreadCount(currentUser.id)
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_notifications',
          filter: `user_id=eq.${currentUser.id}` 
        },
        (payload) => {
          console.log('Notification updated:', payload)
          fetchUnreadCount(currentUser.id) 
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to user_notifications changes!')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Error subscribing to notifications channel:', err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUser, fetchUnreadCount])

  const onNotificationsUpdated = () => {
    if(currentUser) fetchUnreadCount(currentUser.id);
  }

  if (!currentUser) {
    return null // Don't show if no user
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="relative p-2 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
      >
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && !isLoading && (
          <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-80 sm:w-[400px] origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[100]">
          <NotificationDropdown 
            onClose={() => { /* Headless UI manages this, but an explicit internal close button might need it */ }}
            onNotificationsUpdated={onNotificationsUpdated} 
          />
        </Menu.Items>
      </Transition>
    </Menu>
  )
} 
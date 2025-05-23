'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation'; // To get [id] from URL
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import UserConnectButton from '@/components/connections/UserConnectButton'; // Import the button
import Image from 'next/image'; // Added import for Next/Image

// Updated Profile type for MVP display
type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  // REMOVED email and status from this page's Profile type
};

export default function UserProfilePage() {
  const supabase = createClientComponentClient<Database>();
  const params = useParams();
  const targetUserId = params.id as string; // Get the user ID from the route parameter

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error fetching current user:', userError);
        //setError('Could not fetch current user details.');
      }
      setCurrentUser(user);
    };

    fetchCurrentUser();
  }, [supabase]);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url') // UPDATED: Select only MVP fields
          .eq('id', targetUserId)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') { // Not found
            setError('Profile not found.');
          } else {
            throw profileError;
          }
        }
        setProfile(data);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to fetch profile.');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase, targetUserId]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading profile...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!profile) {
    // This case should ideally be handled by the error state for 'Profile not found'
    return <div className="container mx-auto p-4 text-center">Profile not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          {profile.avatar_url && (
            <Image 
              src={profile.avatar_url} 
              alt={profile.name || 'User avatar'} 
              width={96}
              height={96}
              className="h-24 w-24 rounded-full object-cover"
            />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">{profile.name || 'N/A'}</h1>
            </div>
            {/* REMOVED email display */}
            {/* <p className="text-gray-600">{profile.email || 'No email provided'}</p> */}
            {/* REMOVED status display */}
            {/* {profile.status && (
              <p className="text-sm text-gray-500">Status: {profile.status}</p>
            )} */}
          </div>
        </div>
        
        <div className="mt-6">
          {/* UserConnectButton Integration */}
          {currentUser && targetUserId && currentUser.id !== targetUserId && (
            <UserConnectButton targetUserId={targetUserId} currentUser={currentUser} />
          )}
          {currentUser && currentUser.id === targetUserId && (
             <p className="text-sm text-gray-500 italic mt-2">This is your profile.</p>
          )}
        </div>

        {/* Placeholder for other profile details */}
        <div className="mt-6 border-t pt-6">
          <h2 className="text-xl font-semibold">About</h2>
          <p className="text-gray-700 mt-2">
            More profile information will go here (e.g., bio, connections list, posts, etc.).
          </p>
        </div>
      </div>
    </div>
  );
} 
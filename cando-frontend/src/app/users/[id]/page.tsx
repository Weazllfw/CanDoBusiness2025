'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation'; // To get [id] from URL
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import UserConnectButton from '@/components/connections/UserConnectButton'; // Import the button
import { ShieldCheckIcon } from '@heroicons/react/24/solid'; // For verification badge

// Define the expected structure for a profile (subset of profiles table)
// This should align with your actual profiles table definition
type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  trust_level?: 'NEW' | 'BASIC' | 'ESTABLISHED' | 'VERIFIED_CONTRIBUTOR' | null; // Added
  is_verified?: boolean; // Added
  // Add other fields you want to display
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
          .select('id, name, email, avatar_url, trust_level, is_verified') // Adjusted fields
          .eq('id', targetUserId)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') { // Not found
            setError('Profile not found.');
          } else {
            throw profileError;
          }
        }
        setProfile(data as Profile | null);
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
            <img 
              src={profile.avatar_url} 
              alt={profile.name || 'User avatar'} 
              className="h-24 w-24 rounded-full object-cover"
            />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">{profile.name || 'N/A'}</h1>
              {profile.is_verified && (
                <ShieldCheckIcon className="h-6 w-6 text-blue-500" title="Verified User" />
              )}
            </div>
            <p className="text-gray-600">{profile.email || 'No email provided'}</p>
            {profile.trust_level && (
              <span className={`mt-1 text-xs inline-block px-2 py-0.5 rounded-full ${ profile.trust_level === 'VERIFIED_CONTRIBUTOR' ? 'bg-green-100 text-green-700' : profile.trust_level === 'ESTABLISHED' ? 'bg-blue-100 text-blue-700' : profile.trust_level === 'BASIC' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700' }`}>
                Trust Level: {profile.trust_level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            )}
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
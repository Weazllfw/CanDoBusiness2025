"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

// Assuming your profiles table type is available in Database['public']['Tables']['profiles']['Row']
// And Update type is Database['public']['Tables']['profiles']['Update']
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface AccountSettingsFormProps {
  profile: Profile;
}

export default function AccountSettingsForm({ profile }: AccountSettingsFormProps) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [name, setName] = useState<string>(profile.name || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Effect to clear messages after a delay
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreview(profile.avatar_url || null); // Revert to original if no file selected
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    let avatarUrlToUpdate = profile.avatar_url; // Keep current avatar if no new one is uploaded

    if (avatarFile) {
      const filePath = `${profile.id}/avatar-${Date.now()}.${avatarFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { 
            cacheControl: '3600',
            upsert: true
        });

      if (uploadError) {
        setError(`Failed to upload avatar: ${uploadError.message}`);
        setIsLoading(false);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        setError('Failed to get public URL for avatar.');
        setIsLoading(false);
        return;
      }
      avatarUrlToUpdate = publicUrlData.publicUrl;
    }

    // Minimal profile update, only avatar and updated_at
    const profileUpdate: ProfileUpdate = {
      avatar_url: avatarUrlToUpdate,
      name: name,
      updated_at: new Date().toISOString(),
    };

    console.log("Updating profile with (SIMPLIFIED PAYLOAD):", JSON.stringify(profileUpdate, null, 2));

    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', profile.id);

    setIsLoading(false);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      setError(`Failed to update profile: ${updateError.message}`);
    } else {
      setSuccessMessage('Profile updated successfully!');
      if (avatarFile) setAvatarFile(null); 
      router.refresh(); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
      <div className="space-y-6">
        {error && <div className="p-3 text-white bg-red-500 rounded-md">{error}</div>}
        {successMessage && <div className="p-3 text-white bg-green-500 rounded-md">{successMessage}</div>}

        <div>
          <label htmlFor="avatar-upload-label" className="block text-sm font-medium text-gray-700">Profile Picture</label>
          <div className="mt-2 flex items-center space-x-4">
            <div className="shrink-0">
              {avatarPreview ? (
                <Image 
                  src={avatarPreview} 
                  alt="Avatar preview" 
                  width={80} 
                  height={80} 
                  className="h-20 w-20 rounded-full object-cover" 
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
            </div>
            <label htmlFor="avatar-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <span>Change</span>
              <input id="avatar-upload" name="avatar-upload" type="file" className="sr-only" onChange={handleAvatarChange} accept="image/png, image/jpeg, image/gif" />
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        {/* Trust Score & Verification Section - ALREADY REMOVED */}
      </div>
    </form>
  );
} 
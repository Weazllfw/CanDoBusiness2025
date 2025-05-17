'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'

interface CreatePostProps {
  companyId?: string | null
  onPostCreated: () => void
}

export default function CreatePost({ companyId, onPostCreated }: CreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authorSubscriptionTier, setAuthorSubscriptionTier] = useState('REGULAR'); // Default tier
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchUserAndSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Fetch active subscription tier for the user
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing']) // Consider both active and trialing as valid tiers
          .order('created_at', { ascending: false }) // In case of multiple, take the latest
          .maybeSingle(); // Use maybeSingle as user might not have a subscription or it might not be active

        if (subscriptionError) {
          console.error('Error fetching user subscription:', subscriptionError);
          // Keep default tier or handle error as appropriate
        }
        if (subscriptionData && subscriptionData.tier) {
          setAuthorSubscriptionTier(subscriptionData.tier);
        } else {
          setAuthorSubscriptionTier('REGULAR'); // Fallback if no active subscription found
        }
      }
    };
    fetchUserAndSubscription();
  }, [supabase]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    // Also clear the file input value if possible, though this is tricky directly
    const fileInput = document.getElementById('post-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const openModal = () => {
    setContent('');
    setSelectedFile(null);
    setFilePreview(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Content, file, preview are already reset if using openModal to open.
    // If cancel button is clicked directly, ensure reset here too for safety.
    setContent('');
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure content or a file is present. A post can be image-only.
    if ((!content.trim() && !selectedFile) || !currentUser) return

    try {
      setIsLoading(true)
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (selectedFile) {
        const fileExtension = selectedFile.name.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExtension}`;
        const filePath = `public/${fileName}`; // Standard public path

        const { error: uploadError } = await supabase.storage
          .from('post_media') // Your bucket name
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false // true if you want to overwrite, false to error on conflict
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('post_media')
          .getPublicUrl(filePath);
        
        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error('Could not get public URL for uploaded file.');
        }
        mediaUrl = publicUrlData.publicUrl;
        mediaType = selectedFile.type; // Store the full MIME type
      }

      const postData: Database['public']['Tables']['posts']['Insert'] = {
        content: content.trim(), // Content can be empty if there's an image
        user_id: currentUser.id,
        company_id: companyId || undefined, 
        author_subscription_tier: authorSubscriptionTier, 
        media_url: mediaUrl,
        media_type: mediaType,
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert(postData)

      if (insertError) throw insertError

      // Reset form states
      setContent('');
      setSelectedFile(null);
      setFilePreview(null);
      const fileInput = document.getElementById('post-image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = ''; // Attempt to clear the file input display
      }
      setIsModalOpen(false) // Close modal
      onPostCreated() // Callback to refresh feed or notify parent

    } catch (error) {
      console.error('Error creating post:', error)
      // TODO: Provide user feedback for the error (e.g., using a toast notification)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Post Creation Box */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={openModal}
          className="w-full text-left px-4 py-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 focus:outline-none"
        >
          Got something to share, {currentUser?.user_metadata?.name || 'User'}?
        </button>
      </div>

      {/* Post Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Create Post</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${currentUser?.user_metadata?.name || 'User'}?`}
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                autoFocus
              />

              {/* File Input Section */}
              <div className="mb-4">
                <label htmlFor="post-image-upload" className="block text-sm font-medium text-gray-700 mb-1">
                  Add an image (optional)
                </label>
                <input 
                  id="post-image-upload"
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {filePreview && (
                <div className="mb-4 relative">
                  <img src={filePreview} alt="Selected preview" className="max-h-40 w-auto rounded-md" />
                  <button 
                    type="button"
                    onClick={removeSelectedFile}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs leading-none hover:bg-red-600"
                    aria-label="Remove image"
                  >
                    X
                  </button>
                </div>
              )}
              {/* End File Input Section */}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !content.trim() || !currentUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
} 
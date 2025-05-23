'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
// import { PostCategory, POST_CATEGORY_LABELS } from '@/app/feed/page' // Removed for MVP
// import RichTextEditor from '../common/RichTextEditor' // Removed for MVP
// import FileUpload from '../messages/FileUpload' // Removed for MVP
// import { Analytics } from '@/lib/analytics' // Removed for MVP
// import { compressImage } from '@/lib/imageCompressionUtils' // Removed for MVP

// Type for entities the user can post as (self or company)
interface PostableEntity {
  id: string; // 'self' or company_id
  name: string;
  avatar_url?: string | null;
}

interface CreatePostProps {
  onPostCreated: () => void
  // user prop was removed from feed/page.tsx, so we fetch current user here
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // const [authorSubscriptionTier, setAuthorSubscriptionTier] = useState('REGULAR'); // Removed for MVP
  // const [selectedCategory, setSelectedCategory] = useState<PostCategory>('general'); // Removed for MVP
  
  const [postableEntities, setPostableEntities] = useState<PostableEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('self'); // Default to posting as self
  const [isFetchingEntities, setIsFetchingEntities] = useState(true);

  // const [selectedPostAsEntityId, setSelectedPostAsEntityId] = useState<string | null>(null) // Removed for MVP

  const supabase = createClientComponentClient<Database>()

  const fetchPostableEntities = useCallback(async (user: User) => {
    setIsFetchingEntities(true);
    const selfEntity: PostableEntity = {
      id: 'self',
      name: user.user_metadata?.name || 'Yourself',
      avatar_url: user.user_metadata?.avatar_url || null,
    };
    let entities: PostableEntity[] = [selfEntity];

    try {
      const { data: companyUsers, error } = await supabase
        .from('company_users')
        .select('role, companies(id, name, avatar_url)')
        .eq('user_id', user.id)
        .in('role', ['OWNER', 'ADMIN']);

      if (error) {
        console.error('Error fetching user companies:', error);
      } else if (companyUsers) {
        const companyEntities = companyUsers.reduce((acc: PostableEntity[], cu) => {
          // The select query now nests company details directly
          const company = cu.companies as unknown as { id: string; name: string; avatar_url: string | null } | null; 
          if (company) {
            acc.push({
              id: company.id,
              name: company.name,
              avatar_url: company.avatar_url,
            });
          }
          return acc;
        }, []);
        entities = [...entities, ...companyEntities];
      }
    } catch (e) {
      console.error('Exception fetching postable entities:', e);
    }
    setPostableEntities(entities);
    setSelectedEntityId('self'); // Ensure default is self after fetching
    setIsFetchingEntities(false);
  }, [supabase]);

  useEffect(() => {
    const fetchUserAndEntities = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        await fetchPostableEntities(user);
      }
    };
    fetchUserAndEntities();
  }, [supabase, fetchPostableEntities]);

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type.startsWith('image/')) {
        setMediaFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setMediaFile(null);
        setMediaPreview(null);
        alert('Please select an image file (e.g., PNG, JPG).'); 
      }
    } else {
      setMediaFile(null);
      setMediaPreview(null);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    const fileInput = document.getElementById('postMedia') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = "";
    }
  };

  const openModal = () => {
    setContent('');
    setMediaFile(null);
    setMediaPreview(null);
    setSelectedEntityId('self'); // Reset to self when opening modal
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setContent('');
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !mediaFile) || !currentUser) return

    try {
      setIsLoading(true)
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        // Use selectedEntityId in path if it's a company, otherwise user_id
        // const ownerEntityId = selectedEntityId === 'self' ? currentUser.id : selectedEntityId;
        // const fileName = `${ownerEntityId}/${uuidv4()}.${fileExt}`; // Original fileName structure
        // const filePath = `post-media/${fileName}`; // Original path, incorrect for RLS and bucket prefix
        
        // Corrected path for RLS: public/{user_id}/filename
        // For MVP, all post media is uploaded to the current user's folder, regardless of selectedEntityId.
        // The fileName itself can still retain the ownerEntityId for organization if desired, but the RLS path component must be currentUser.id.
        const rlsCompliantFileName = `${selectedEntityId === 'self' ? currentUser.id : selectedEntityId}-${uuidv4()}.${fileExt}`;
        const filePath = `public/${currentUser.id}/${rlsCompliantFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          // .from('user_generated_content') // Old incorrect bucket name
          .from('post_media') // Correct bucket name
          .upload(filePath, mediaFile, {
            cacheControl: '3600',
            upsert: false, 
          });

        if (uploadError) {
          console.error('Error uploading media:', uploadError);
          alert(`Failed to upload image: ${uploadError.message}`);
          setIsLoading(false);
          return;
        }
        
        const { data: publicUrlData } = supabase.storage
          // .from('user_generated_content') // Old incorrect bucket name
          .from('post_media') // Correct bucket name
          .getPublicUrl(filePath);
        
        if (publicUrlData?.publicUrl) {
          mediaUrl = publicUrlData.publicUrl;
          mediaType = 'IMAGE';
        } else {
            console.error('Failed to get public URL for media');
            alert('Image uploaded, but failed to get its public URL. Post will be text-only.');
        }
      }

      const postData: any = {
        content: content.trim(),
        user_id: currentUser.id, 
        media_urls: mediaUrl ? [mediaUrl] : [],
        media_types: mediaType ? [mediaType] : [],
        acting_as_company_id: selectedEntityId === 'self' ? null : selectedEntityId,
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert(postData)

      if (insertError) throw insertError

      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setSelectedEntityId('self'); // Reset selector
      setIsModalOpen(false)
      onPostCreated()

    } catch (error) {
      console.error('Error creating post:', error)
      alert(`Error creating post: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentUser) {
    // Optionally, render a login prompt or disable the create post button if user is not loaded/logged in
    // For now, the button text will just be generic if currentUser is null.
  }

  const selectedDisplayEntity = postableEntities.find(e => e.id === selectedEntityId) || postableEntities[0];

  return (
    <>
      {/* Post Creation Box */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center space-x-3">
          {selectedDisplayEntity?.avatar_url ? (
            <Image src={selectedDisplayEntity.avatar_url} alt={selectedDisplayEntity.name} width={40} height={40} className="rounded-full h-10 w-10 object-cover" />
          ) : (
            <span className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
              {selectedDisplayEntity?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
          <button
            onClick={openModal}
            disabled={!currentUser} 
            className="flex-grow text-left px-4 py-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Got something to share, {selectedDisplayEntity?.name || 'User'}?
          </button>
        </div>
      </div>

      {/* Post Creation Modal */}
      {isModalOpen && currentUser && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Create Post</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {/* Posting As Selector */}
              {postableEntities.length > 1 && (
                <div className="mb-4">
                  <label htmlFor="postAsEntity" className="block text-sm font-medium text-gray-700 mb-1">Post as:</label>
                  <select 
                    id="postAsEntity"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    disabled={isFetchingEntities}
                  >
                    {isFetchingEntities ? (
                        <option value="self" disabled>Loading entities...</option>
                    ) : (
                        postableEntities.map(entity => (
                            <option key={entity.id} value={entity.id}>{entity.name}</option>
                        ))
                    )}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="postContent" className="block text-sm font-medium text-gray-700 mb-1">
                  Your thoughts (optional if adding an image)
                </label>
                <textarea
                  id="postContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="postMedia" className="block text-sm font-medium text-gray-700 mb-1">
                  Add an image (optional)
                </label>
                <input
                  type="file"
                  id="postMedia"
                  accept="image/*"
                  onChange={handleMediaChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              {mediaPreview && (
                <div className="mb-4 relative">
                  <Image src={mediaPreview} alt="Media preview" width={400} height={300} objectFit="contain" className="rounded-md max-h-60 w-auto" />
                  <button 
                    type="button" 
                    onClick={removeMedia}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                    aria-label="Remove image"
                  >
                    X
                  </button>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  disabled={isLoading || (!content.trim() && !mediaFile)}
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 
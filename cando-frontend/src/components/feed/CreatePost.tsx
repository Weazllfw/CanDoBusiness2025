'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'
import { PostCategory, POST_CATEGORY_LABELS } from '@/app/feed/page'
import RichTextEditor from '../common/RichTextEditor'
import FileUpload from '../messages/FileUpload'
import { Analytics } from '@/lib/analytics'
import { compressImage } from '@/lib/imageCompressionUtils'

interface PostableEntity {
  id: string; // user_id or company_id
  name: string;
  avatar_url?: string | null;
  type: 'user' | 'company';
}

interface CreatePostProps {
  onPostCreated: () => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [mediaFileObjects, setMediaFileObjects] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authorSubscriptionTier, setAuthorSubscriptionTier] = useState('REGULAR');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('general');
  
  const [postableEntities, setPostableEntities] = useState<PostableEntity[]>([])
  const [selectedPostAsEntityId, setSelectedPostAsEntityId] = useState<string | null>(null)
  const [isFetchingEntities, setIsFetchingEntities] = useState(true)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchUserAndEntities = async () => {
      setIsFetchingEntities(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Fetch active subscription tier
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (subscriptionError) {
          console.error('Error fetching user subscription:', subscriptionError);
        }
        setAuthorSubscriptionTier(subscriptionData?.tier || 'REGULAR');

        // Prepare user as a postable entity
        const userEntity: PostableEntity = {
          id: user.id,
          name: user.user_metadata?.name || user.email || 'Yourself',
          avatar_url: user.user_metadata?.avatar_url,
          type: 'user',
        };
        let entities: PostableEntity[] = [userEntity];
        setSelectedPostAsEntityId(userEntity.id); // Default to posting as user

        // Fetch user's companies
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, avatar_url')
          .eq('owner_id', user.id);

        if (companiesError) {
          console.error('Error fetching companies:', companiesError);
        } else if (companies) {
          const companyEntities: PostableEntity[] = companies.map(c => ({
            id: c.id,
            name: c.name || 'Unnamed Company',
            avatar_url: c.avatar_url,
            type: 'company',
          }));
          entities = [...entities, ...companyEntities];
        }
        setPostableEntities(entities);
      } else {
        setPostableEntities([]);
        setSelectedPostAsEntityId(null);
      }
      setIsFetchingEntities(false);
    };
    fetchUserAndEntities();
  }, [supabase]);

  const handleFileChange = (newFiles: File[]) => {
    setMediaFileObjects(newFiles);
  };

  const removeSelectedFile = (index: number) => {
    const newFiles = mediaFileObjects.filter((_, i) => i !== index);
    setMediaFileObjects(newFiles);
  };

  const openModal = () => {
    setContent('');
    setMediaFileObjects([]);
    if (currentUser && postableEntities.length > 0) {
        // Default to user or first entity if user is not found (should not happen if currentUser is set)
        const userEntityExists = postableEntities.some(e => e.id === currentUser.id && e.type === 'user');
        setSelectedPostAsEntityId(userEntityExists ? currentUser.id : postableEntities[0].id);
    } else if (postableEntities.length > 0) {
        setSelectedPostAsEntityId(postableEntities[0].id);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setContent('');
    setMediaFileObjects([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && mediaFileObjects.length === 0) || !currentUser || !selectedPostAsEntityId) return

    const selectedEntity = postableEntities.find(entity => entity.id === selectedPostAsEntityId);
    if (!selectedEntity) {
        console.error("Selected posting entity not found");
        // TODO: Add user feedback
        return;
    }

    try {
      setIsLoading(true)
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];

      for (const file of mediaFileObjects) {
        const compressedFile = await compressImage(file); // Compress image
        const fileExtension = compressedFile.name.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExtension}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post_media')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: false
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
        mediaUrls.push(publicUrlData.publicUrl);
        mediaTypes.push(compressedFile.type); 
      }

      const postData = {
        content: content.trim(),
        user_id: currentUser.id, // Always the logged-in user
        company_id: selectedEntity.type === 'company' ? selectedEntity.id : null, 
        author_subscription_tier: authorSubscriptionTier, 
        media_urls: mediaUrls,
        media_types: mediaTypes,
        category: selectedCategory,
      }

      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single(); // select().single() to get the created post back for analytics

      if (insertError) throw insertError
      if (!newPost) throw new Error("Post creation did not return data.");

      // Analytics
      Analytics.trackPostCreate(
        currentUser.id,
        newPost.id,
        mediaFileObjects.length > 0,
        selectedCategory,
        { // Additional metadata for post_create
            postedAsType: selectedEntity.type,
            postedAsEntityId: selectedEntity.id
        }
      );

      setContent('');
      setMediaFileObjects([]);
      setSelectedCategory('general');
      setIsModalOpen(false)
      onPostCreated()

    } catch (error) {
      console.error('Error creating post:', error)
      // TODO: Provide user feedback (e.g., toast notification)
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
              {/* Post As Selector */}
              {postableEntities.length > 1 && !isFetchingEntities && (
                <div className="mb-4">
                  <label htmlFor="postAs" className="block text-sm font-medium text-gray-700 mb-1">
                    Post as
                  </label>
                  <select
                    id="postAs"
                    value={selectedPostAsEntityId || ''}
                    onChange={(e) => setSelectedPostAsEntityId(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    disabled={isFetchingEntities}
                  >
                    {postableEntities.map(entity => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name} ({entity.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isFetchingEntities && <p className="text-sm text-gray-500 mb-2">Loading posting options...</p>}

              {/* Category Selection */}
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as PostCategory)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Area - Rich Text Editor */}
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  What's on your mind?
                </label>
                <RichTextEditor content={content} onChange={setContent} placeholder={`What\'s on your mind, ${currentUser?.user_metadata?.name || 'User'}?`} />
              </div>
              
              {/* File Upload - Using FileUpload component */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add images (up to 5)
                </label>
                <FileUpload 
                  files={mediaFileObjects}
                  onFilesChange={handleFileChange} 
                  maxFiles={5} 
                />
                {/* Display selected files and remove button */}
                {mediaFileObjects.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {mediaFileObjects.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end items-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!content.trim() && mediaFileObjects.length === 0) || !selectedPostAsEntityId || isFetchingEntities}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
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
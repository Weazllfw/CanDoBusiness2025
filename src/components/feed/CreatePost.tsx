import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { User } from '@supabase/supabase-js'
import { PostCategory, POST_CATEGORY_LABELS } from '@/app/feed/page'
import RichTextEditor from '../common/RichTextEditor'
import FileUpload from '../messages/FileUpload'
import { Analytics } from '@/lib/analytics'
import imageCompression from 'browser-image-compression'

interface CreatePostProps {
  companyId?: string | null
  onPostCreated: () => void
}

export default function CreatePost({ companyId, onPostCreated }: CreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authorSubscriptionTier, setAuthorSubscriptionTier] = useState('REGULAR'); // Default tier
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('general'); // Default category
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
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (subscriptionError) {
          console.error('Error fetching user subscription:', subscriptionError);
        }
        if (subscriptionData && subscriptionData.tier) {
          setAuthorSubscriptionTier(subscriptionData.tier);
        } else {
          setAuthorSubscriptionTier('REGULAR');
        }
      }
    };
    fetchUserAndSubscription();
  }, [supabase]);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const openModal = () => {
    setContent('');
    setSelectedFiles([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setContent('');
    setSelectedFiles([]);
  };

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return new File([compressedFile], file.name, {
        type: compressedFile.type
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && selectedFiles.length === 0) || !currentUser) return

    try {
      setIsLoading(true)
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];

      // Compress images before upload
      const compressedFiles = await Promise.all(
        selectedFiles.map(file => compressImage(file))
      );

      for (const file of compressedFiles) {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExtension}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post_media')
          .upload(filePath, file, {
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
        mediaTypes.push(file.type);
      }

      const postData = {
        content: content.trim(),
        user_id: currentUser.id,
        company_id: companyId || undefined,
        author_subscription_tier: authorSubscriptionTier,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        category: selectedCategory,
      }

      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Track post creation for Pro users
      if (newPost) {
        Analytics.trackPostCreate(
          currentUser.id,
          newPost.id,
          mediaUrls.length > 0,
          selectedCategory
        );
      }

      setContent('');
      setSelectedFiles([]);
      setSelectedCategory('general');
      setIsModalOpen(false);
      onPostCreated();

    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={openModal}
          className="w-full text-left px-4 py-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 focus:outline-none"
        >
          Got something to share, {currentUser?.user_metadata?.name || 'User'}?
        </button>
      </div>

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

              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder={`What's on your mind, ${currentUser?.user_metadata?.name || 'User'}?`}
              />

              <div className="mt-4">
                <FileUpload
                  files={selectedFiles}
                  onFilesChange={handleFilesChange}
                  maxFiles={5}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!content.trim() && selectedFiles.length === 0) || !currentUser}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
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
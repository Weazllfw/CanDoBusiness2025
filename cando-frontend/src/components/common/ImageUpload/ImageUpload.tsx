import { useState, useRef, useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/types/database.types';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  onError?: (error: string) => void;
  defaultImage?: string;
  bucketName?: string;
  folderPath?: string;
  maxSizeMB?: number;
  aspectRatio?: number;
  className?: string;
}

export function ImageUpload({
  onUpload,
  onError,
  defaultImage,
  bucketName = 'company-logos',
  folderPath = 'logos',
  maxSizeMB = 2,
  aspectRatio = 1,
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(defaultImage || '');
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, [supabase]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!userId) {
      onError?.('User not authenticated');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.('Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);

      // Create a preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${folderPath}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      onUpload(publicUrl);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative group ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      
      <div
        onClick={handleClick}
        className={`
          relative cursor-pointer
          border-2 border-dashed rounded-lg
          ${preview ? 'border-transparent hover:border-gray-300' : 'border-gray-300 hover:border-gray-400'}
          transition-colors duration-200
          flex items-center justify-center
          overflow-hidden
          ${aspectRatio === 1 ? 'aspect-square' : ''}
        `}
        style={aspectRatio !== 1 ? { aspectRatio } : undefined}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Company logo preview"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200 flex items-center justify-center">
              <div className="bg-white rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <PhotoIcon className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-6">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm leading-6 text-gray-600">
              <span className="relative rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                Upload logo
              </span>
            </div>
            <p className="text-xs leading-5 text-gray-600">PNG, JPG up to {maxSizeMB}MB</p>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-pulse text-sm text-gray-500">Uploading...</div>
        </div>
      )}
    </div>
  );
} 
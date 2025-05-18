import imageCompression, { type Options as ImageCompressionOptions } from 'browser-image-compression';

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  // Progress update is not handled here for simplicity, but can be added
  // onProgress: (p: number) => console.log(`Compression Progress: ${p}%`)
};

/**
 * Compresses an image file using browser-image-compression.
 * @param imageFile The image File object to compress.
 * @param options Optional compression options.
 * @returns A Promise that resolves with the compressed File object.
 */
export async function compressImage(
  imageFile: File,
  options?: ImageCompressionOptions
): Promise<File> {
  if (!imageFile.type.startsWith('image/')) {
    console.warn('File is not an image, returning original file:', imageFile.name);
    return imageFile; // Return original file if not an image
  }

  const compressionOptions: ImageCompressionOptions = { ...DEFAULT_OPTIONS, ...options };

  // console.log(`Original image size: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
  // console.log('Compression options:', compressionOptions);

  try {
    const compressedFile = await imageCompression(imageFile, compressionOptions);
    // console.log(`Compressed image size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error during image compression:', error);
    // Fallback to original file if compression fails
    return imageFile;
  }
} 
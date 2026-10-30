/**
 * Image Compression & Optimization Utility
 * 
 * Automatically crops to a square avatar and compresses images into lightweight
 * WebP (or JPEG fallback) data URLs (~15KB - 35KB) before storing in PostgreSQL.
 */

export interface CompressAvatarOptions {
  maxDimension?: number;
  quality?: number;
  preferWebP?: boolean;
}

export interface CompressedImageResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
  format: 'image/webp' | 'image/jpeg';
}

export async function compressAvatarImage(
  file: File,
  options: CompressAvatarOptions = {}
): Promise<CompressedImageResult> {
  const { maxDimension = 256, quality = 0.82, preferWebP = true } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file must be an image (PNG, JPG, WebP, etc.)');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // Determine center square crop
        const minSide = Math.min(originalWidth, originalHeight);
        const cropX = (originalWidth - minSide) / 2;
        const cropY = (originalHeight - minSide) / 2;

        const targetSize = Math.min(maxDimension, minSide);

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not initialize 2D canvas context for image compression');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped & scaled square avatar
        ctx.drawImage(
          img,
          cropX,
          cropY,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );

        // Try WebP first (highest compression ratio), fallback to JPEG
        let format: 'image/webp' | 'image/jpeg' = 'image/webp';
        let dataUrl = '';

        if (preferWebP) {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            format = 'image/jpeg';
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } else {
          format = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Estimate size from Base64 string length
        const base64Data = dataUrl.split(',')[1] || '';
        const compressedSizeBytes = Math.round((base64Data.length * 3) / 4);

        resolve({
          dataUrl,
          originalSizeBytes: file.size,
          compressedSizeBytes,
          width: targetSize,
          height: targetSize,
          format
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file for compression'));
    };

    img.src = objectUrl;
  });
}


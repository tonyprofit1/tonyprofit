/**
 * Image optimization utility for Tony's Restaurant Cost Control.
 * Resizes images to max 300px and compresses to WebP or JPEG
 * to ensure small IndexedDB storage footprint and fast offline performance.
 */

export interface OptimizedImageData {
  imageId: string;
  imageData: string;
  imageMimeType: string;
  imageUpdatedAt: string;
}

export async function optimizeImageFile(
  file: File | Blob,
  maxDimension: number = 300,
  quality: number = 0.75
): Promise<OptimizedImageData> {
  return new Promise((resolve, reject) => {
    // Check if it's an image
    if (file.type && !file.type.startsWith('image/')) {
      reject(new Error('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WebP, etc.)'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        return;
      }

      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Prevent zero dimensions
        width = Math.max(1, width);
        height = Math.max(1, height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถเข้าถึง Canvas Context ได้'));
          return;
        }

        // Fill white background for transparent images when converting to JPEG/WebP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fall back to jpeg
        let mimeType = 'image/webp';
        let dataUrl = canvas.toDataURL('image/webp', quality);

        // Some older browsers return PNG when WebP is unsupported
        if (!dataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const uniqueId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const updatedAt = new Date().toISOString();

        resolve({
          imageId: uniqueId,
          imageData: dataUrl,
          imageMimeType: mimeType,
          imageUpdatedAt: updatedAt,
        });
      };

      img.onerror = () => {
        reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
      };

      img.src = src;
    };

    reader.onerror = () => {
      reject(new Error('เกิดข้อผิดพลาดในการโหลดไฟล์'));
    };

    reader.readAsDataURL(file);
  });
}

import { CONFIG } from '../config';

export interface ProcessedPhotoResult {
  fullDataUrl: string;
  thumbDataUrl: string;
  coverDataUrl: string;
  width: number;
  height: number;
}

export async function processImageFile(file: File): Promise<ProcessedPhotoResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read photo file'));
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => reject(new Error('Unable to decode image (unsupported format)'));
        img.onload = async () => {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // 1. Process Full image: max 1600px long edge, <= 250 KB
          const fullRes = await resizeAndCompress(
            img,
            1600,
            CONFIG.maxPhotoSizeBytes,
            0.82
          );

          // 2. Process Thumbnail: max 400px long edge, <= 25 KB
          const thumbRes = await resizeAndCompress(
            img,
            400,
            CONFIG.maxThumbnailSizeBytes,
            0.75
          );

          // 3. Process Cover: max 120px, <= 8 KB
          const coverRes = await resizeAndCompress(
            img,
            120,
            CONFIG.maxCoverThumbSizeBytes,
            0.65
          );

          resolve({
            fullDataUrl: fullRes.dataUrl,
            thumbDataUrl: thumbRes.dataUrl,
            coverDataUrl: coverRes.dataUrl,
            width: originalWidth,
            height: originalHeight,
          });
        };
        img.src = dataUrl;
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function resizeAndCompress(
  img: HTMLImageElement,
  maxDimension: number,
  maxSizeBytes: number,
  initialQuality: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Draw image to canvas
  ctx.drawImage(img, 0, 0, width, height);

  let quality = initialQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  // Approximate byte size check (base64 length * 0.75)
  let approxBytes = Math.round(dataUrl.length * 0.75);
  while (approxBytes > maxSizeBytes && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    approxBytes = Math.round(dataUrl.length * 0.75);
  }

  return { dataUrl, width, height };
}

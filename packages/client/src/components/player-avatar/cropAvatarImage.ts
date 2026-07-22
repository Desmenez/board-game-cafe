import type { Area } from 'react-easy-crop';
import { PROFILE_AVATAR_MAX_BYTES } from 'shared';

const OUTPUT_SIZE = 512;
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('โหลดรูปไม่สำเร็จ')));
    image.src = src;
  });
}

/**
 * Crop to square pixels then encode JPEG ≤ PROFILE_AVATAR_MAX_BYTES.
 * Returns null blob error message when even lowest quality exceeds the limit.
 */
export async function getCroppedAvatarJpeg(
  imageSrc: string,
  crop: Area,
): Promise<{ ok: true; blob: Blob } | { ok: false; error: string }> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, error: 'เบราว์เซอร์ไม่รองรับการครอปรูป' };

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  for (const quality of QUALITY_STEPS) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
    });
    if (!blob) continue;
    if (blob.size <= PROFILE_AVATAR_MAX_BYTES) {
      return { ok: true, blob };
    }
  }

  return {
    ok: false,
    error: `หลังครอปแล้วยังใหญ่เกิน ${Math.floor(PROFILE_AVATAR_MAX_BYTES / 1024)}KB — ลองเลือกรูปที่เล็กกว่า`,
  };
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

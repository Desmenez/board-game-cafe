import { PROFILE_AVATAR_MAX_BYTES, profileAvatarObjectPath } from 'shared';
import { getSupabaseClient } from './index';
import { updateOwnProfile } from './profileApi';

const AVATARS_BUCKET = 'avatars';

function userFacingStorageError(error: { message?: string } | null): string {
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('row-level security') || msg.includes('policy')) {
    return 'ไม่มีสิทธิ์อัปโหลดรูป — ลองเข้าสู่ระบบใหม่';
  }
  if (msg.includes('payload') || msg.includes('size') || msg.includes('maximum')) {
    return `ไฟล์ใหญ่เกิน ${Math.floor(PROFILE_AVATAR_MAX_BYTES / 1024)}KB`;
  }
  return error?.message || 'อัปโหลดรูปไม่สำเร็จ';
}

/**
 * Upload a cropped JPEG blob to Storage and persist `profiles.avatar_url`.
 * Overwrites `{userId}/avatar.jpg` so each account keeps one file.
 */
export async function uploadOwnAvatar(
  userId: string,
  blob: Blob,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };
  if (blob.size > PROFILE_AVATAR_MAX_BYTES) {
    return {
      ok: false,
      error: `ไฟล์ใหญ่เกิน ${Math.floor(PROFILE_AVATAR_MAX_BYTES / 1024)}KB`,
    };
  }

  const path = profileAvatarObjectPath(userId);
  const { error: uploadError } = await client.storage.from(AVATARS_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  });
  if (uploadError) {
    return { ok: false, error: userFacingStorageError(uploadError) };
  }

  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  // Bust CDN/browser cache after overwrite
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const profileResult = await updateOwnProfile(userId, {
    avatar_url: url,
    avatar_display: 'photo',
  });
  if (!profileResult.ok) {
    return { ok: false, error: profileResult.error };
  }
  return { ok: true, url };
}

/** Remove Storage object and clear `profiles.avatar_url`. */
export async function clearOwnAvatar(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const path = profileAvatarObjectPath(userId);
  const { error: removeError } = await client.storage.from(AVATARS_BUCKET).remove([path]);
  if (removeError) {
    console.warn('clearOwnAvatar storage remove', removeError);
  }

  const profileResult = await updateOwnProfile(userId, {
    avatar_url: null,
    avatar_display: 'character',
  });
  if (!profileResult.ok) {
    return { ok: false, error: profileResult.error };
  }
  return { ok: true };
}

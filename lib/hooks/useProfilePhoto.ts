import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useProfilePhoto() {
  const { user, updateUser } = useAuthStore();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?.profileImageKey) {
      setPhotoUrl(null);
      return;
    }
    // Legacy Cloudinary URLs are full HTTPS URLs — use directly
    if (user.profileImageKey.startsWith('https://')) {
      setPhotoUrl(user.profileImageKey);
      return;
    }
    // S3 key — fetch a fresh presigned download URL (expires in 15 min)
    authApi
      .getProfileImageDownloadUrl()
      .then((res) => setPhotoUrl(res.data?.url ?? null))
      .catch(() => setPhotoUrl(null));
  }, [user?.profileImageKey]);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    setUploading(true);
    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';

      // Step 1: get presigned S3 PUT URL + key from backend (content-type is signed into URL)
      const uploadRes = await authApi.getProfileImageUploadUrl(mimeType);
      if (!uploadRes.success || !uploadRes.data) throw new Error('Could not get upload URL');
      const { url, key } = uploadRes.data;
      console.log('[S3 Upload] presigned URL domain:', url.split('?')[0]);

      // Step 2: fetch image as blob and PUT directly to S3
      const imageData = await fetch(asset.uri);
      const blob = await imageData.blob();
      console.log('[S3 Upload] blob size:', blob.size, 'type:', mimeType);
      const s3Res = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });
      if (!s3Res.ok) {
        let errBody = '';
        try { errBody = await s3Res.text(); } catch (_) {}
        console.error('[S3 Upload] FAILED status:', s3Res.status, '\n', errBody);
        throw new Error(`S3 upload failed (${s3Res.status}): ${errBody || '(no body)'}`);
      }

      // Step 3: save S3 key to backend
      const saveRes = await authApi.saveProfileImageKey(key);
      if (!saveRes.success || !saveRes.data) throw new Error('Failed to save image key');
      await updateUser(saveRes.data);

      // Step 4: get a presigned download URL for immediate display
      const dlRes = await authApi.getProfileImageDownloadUrl();
      setPhotoUrl(dlRes.data?.url ?? null);
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return { photoUrl, uploading, pickAndUpload };
}

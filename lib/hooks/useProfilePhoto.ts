import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

const CLOUD_NAME = process.env['EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME'] ?? '';
const UPLOAD_PRESET = process.env['EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET'] ?? '';

export function useProfilePhoto() {
  const { user, updateUser } = useAuthStore();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // profileImageKey is now a full Cloudinary URL — use it directly
  useEffect(() => {
    setPhotoUrl(user?.profileImageKey ?? null);
  }, [user?.profileImageKey]);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    setUploading(true);
    try {
      // Upload directly to Cloudinary — no backend presign step needed
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: 'profile.jpg',
      } as any);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'parensure/profile-images');

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!cloudRes.ok) {
        const err = await cloudRes.json();
        throw new Error(err?.error?.message ?? 'Cloudinary upload failed');
      }

      const cloudData = await cloudRes.json();
      const imageUrl: string = cloudData.secure_url;

      // Save the Cloudinary URL as the profile image key
      const saveRes = await authApi.saveProfileImageKey(imageUrl);
      if (!saveRes.success || !saveRes.data) throw new Error('Failed to save image');

      await updateUser(saveRes.data);
      setPhotoUrl(imageUrl);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return { photoUrl, uploading, pickAndUpload };
}

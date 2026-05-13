import { View, Image } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/store/authStore';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Image
          source={require('@/assets/images/parensure-logo.png')}
          className="w-32 h-32"
          resizeMode="contain"
        />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}

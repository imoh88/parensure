import { useAuthStore } from '@/lib/store/authStore';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      {/* Tabs — no swipe-back from the tab root */}
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, animation: 'none' }} />

      {/* Push screens — all get iOS swipe-back */}
      <Stack.Screen name="add-task" />
      <Stack.Screen name="add-appointment" />
      <Stack.Screen name="snapshot" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="task-detail" />
      <Stack.Screen name="appointment-detail" />
      <Stack.Screen name="alert-detail" />
      <Stack.Screen name="alerts-safety" />
      <Stack.Screen name="add-care-receiver" />
      <Stack.Screen name="care-receiver-detail" />
      <Stack.Screen name="caregiver-detail" />
      <Stack.Screen name="caregivers" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="chat-room" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="change-language" />
      <Stack.Screen name="medication" />
      <Stack.Screen name="add-medication" />
      <Stack.Screen name="add-medication-manual" />
      <Stack.Screen name="scan-medication" />
      <Stack.Screen name="medication-success" />
      <Stack.Screen name="heart-rate-check" />
      <Stack.Screen name="stability-check" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="invite-member" />
      <Stack.Screen name="manage-receiver" />
      <Stack.Screen name="manage-carecircle" />
    </Stack>
  );
}

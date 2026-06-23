import { useAuthStore } from "@/lib/store/authStore";
import { registerDeviceForPushNotifications, setupNotificationCategories } from "@/lib/utils/notifications";
import SOSModal, { SOSData } from "@/components/SOSModal";
import { taskApi } from "@/lib/api/task";
import { sosForegroundService } from "@/lib/native/SosForegroundService";
import { View } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
// import "./globals.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const syncProfile = useAuthStore((state) => state.syncProfile);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [sosData, setSosData] = useState<SOSData | null>(null);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        syncProfile();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  // Register device push token and notification categories when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      registerDeviceForPushNotifications();
      setupNotificationCategories();
    }
  }, [isAuthenticated]);

  // Set up notification listeners
  useEffect(() => {
    // Foreground: SOS received while app is open → start foreground service + show modal
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = content?.data as Record<string, string> | undefined;
      if (data?.['type'] === 'SOS_TRIGGERED' || data?.['type'] === 'FALL_DETECTED') {
        const sosPayload: SOSData = {
          alertId: data['alertId'] ?? '',
          notificationId: notification.request.identifier,
          receiverName: data['receiverName'] ?? 'Your care receiver',
          message: content?.body ?? 'Emergency SOS triggered. Please respond immediately.',
        };
        // Start the Android foreground service so the alert persists in the notification shade
        sosForegroundService.start({
          title: content?.title ?? '🚨 SOS Alert',
          body: sosPayload.message,
          alertId: sosPayload.alertId,
          receiverName: sosPayload.receiverName,
        });
        setSosData(sosPayload);
      }
    });

    // Background/killed: user tapped notification or action button
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response.notification.request.content;
      const data = content?.data as Record<string, string> | undefined;
      if (!data) return;

      const type = data['type'];
      const action = response.actionIdentifier;
      const notifId = response.notification.request.identifier;

      if (type === 'SOS_TRIGGERED' || type === 'FALL_DETECTED') {
        const sosPayload: SOSData = {
          alertId: data['alertId'] ?? '',
          notificationId: notifId,
          receiverName: data['receiverName'] ?? 'Your care receiver',
          message: content?.body ?? 'Emergency SOS triggered. Please respond immediately.',
        };
        // Ensure foreground service is running whenever the app is opened via SOS
        sosForegroundService.start({
          title: content?.title ?? '🚨 SOS Alert',
          body: sosPayload.message,
          alertId: sosPayload.alertId,
          receiverName: sosPayload.receiverName,
        });
        setSosData(sosPayload);
        return;
      }

      if (type === 'MEDICATION_REMINDER' || type === 'MISSED_MEDICATION') {
        const taskId = data['taskId'];
        if (action === 'mark_taken' && taskId) {
          taskApi.complete(taskId).catch(() => {});
          Notifications.dismissNotificationAsync(notifId).catch(() => {});
        } else if (action === 'remind_10m') {
          Notifications.dismissNotificationAsync(notifId).catch(() => {});
          Notifications.scheduleNotificationAsync({
            content: {
              title: content?.title ?? 'Medication Reminder',
              body: content?.body ?? '',
              data: content?.data,
              categoryIdentifier: 'medication_reminder',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 600 },
          }).catch(() => {});
        } else if (action === 'dismiss') {
          Notifications.dismissNotificationAsync(notifId).catch(() => {});
        } else {
          router.push('/(app)/alerts' as any);
        }
        return;
      }

      if (type === 'DEVICE_OFFLINE') {
        if (action === 'dismiss') {
          Notifications.dismissNotificationAsync(notifId).catch(() => {});
        } else {
          router.push('/(app)/alerts' as any);
        }
        return;
      }

      if (type === 'INVITE') {
        const inviteId = data['inviteId'];
        if (inviteId) {
          router.push({ pathname: '/(app)/invite-preview', params: { inviteId } } as any);
        }
        return;
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (isLoading || !fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="set-password" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <SOSModal data={sosData} onDismiss={() => setSosData(null)} />
    </SafeAreaProvider>
  );
}

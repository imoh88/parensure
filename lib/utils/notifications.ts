import { authApi } from '@/lib/api/auth';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, string> | undefined;
    const isSos = data?.['type'] === 'SOS_TRIGGERED' || data?.['type'] === 'FALL_DETECTED';
    // For SOS, suppress expo's notification — ParensureMessagingService already shows
    // a non-swipeable foreground service notification instead.
    return {
      shouldShowAlert: !isSos,
      shouldPlaySound: !isSos,
      shouldSetBadge: !isSos,
      shouldShowBanner: !isSos,
      shouldShowList: !isSos,
    };
  },
});

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('sos_alert', [
    {
      identifier: 'respond',
      buttonTitle: 'RESPOND',
      options: { opensAppToForeground: true, isDestructive: false, isAuthenticationRequired: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('medication_reminder', [
    {
      identifier: 'mark_taken',
      buttonTitle: 'Mark as Taken',
      options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
    },
    {
      identifier: 'remind_10m',
      buttonTitle: 'Remind in 10m',
      options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('missed_medication', [
    {
      identifier: 'mark_taken',
      buttonTitle: 'Mark as Taken',
      options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false, isDestructive: true, isAuthenticationRequired: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('device_offline', [
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
    },
  ]);
}

async function setupAndroidChannels() {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Parensure',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E84545',
  });
  await Notifications.setNotificationChannelAsync('sos', {
    name: 'SOS Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lightColor: '#FF0000',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  try {
    // Use native device token on both platforms so Firebase Admin SDK can deliver directly.
    // Android → raw FCM token, iOS → raw APNs token.
    const result = await Notifications.getDevicePushTokenAsync();
    console.log('[Notifications] Device push token:', result.data, `(${result.type})`);
    return result.data as string;
  } catch (err) {
    console.warn('[Notifications] Failed to get device push token:', err);
    return null;
  }
}

export async function registerDeviceForPushNotifications(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await authApi.registerDevice(token, platform);
      console.log(`[Notifications] Device registered (${platform})`);
    }
  } catch (err) {
    console.warn('[Notifications] Device registration failed:', err);
  }
}


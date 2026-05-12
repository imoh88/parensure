import { alertApi } from '@/lib/api/alert';
import { sosForegroundService } from '@/lib/native/SosForegroundService';
import { F } from '@/lib/fonts';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

export interface SOSData {
  alertId: string;
  notificationId: string;
  receiverName: string;
  message: string;
}

interface Props {
  data: SOSData | null;
  onDismiss: () => void;
}

export default function SOSModal({ data, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  const handleRespond = useCallback(async () => {
    if (!data) return;
    setLoading(true);
    try {
      await alertApi.checkIn(data.alertId);
      sosForegroundService.stop();
      await Notifications.dismissNotificationAsync(data.notificationId).catch(() => {});
      onDismiss();
    } catch {
      sosForegroundService.stop();
      onDismiss();
    } finally {
      setLoading(false);
    }
  }, [data, onDismiss]);

  // Pulse vibration when modal appears
  React.useEffect(() => {
    if (data) {
      Vibration.vibrate([0, 500, 300, 500, 300, 500]);
    }
    return () => Vibration.cancel();
  }, [data]);

  return (
    <Modal
      visible={!!data}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {/* blocked — must respond */}}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.85)" barStyle="light-content" />
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Pulse ring */}
          <View style={s.pulseOuter}>
            <View style={s.pulseInner}>
              <Text style={s.sosIcon}>🚨</Text>
            </View>
          </View>

          <Text style={s.label}>SOS TRIGGERED</Text>
          <Text style={s.name}>{data?.receiverName ?? ''}</Text>
          <Text style={s.message}>{data?.message ?? ''}</Text>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRespond}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>RESPOND NOW</Text>
            )}
          </TouchableOpacity>

          <Text style={s.hint}>This alert will stay active until you respond.</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  pulseOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(229,57,53,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pulseInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosIcon: { fontSize: 28 },
  label: {
    fontSize: 22,
    fontFamily: F.m.xBold,
    color: '#E53935',
    letterSpacing: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: F.m.bold,
    color: '#111',
  },
  message: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  btn: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#fff',
    letterSpacing: 0.8,
  },
  hint: {
    fontSize: 12,
    fontFamily: F.i.regular,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});

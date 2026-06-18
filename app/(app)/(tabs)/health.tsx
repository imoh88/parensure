import { alertApi } from '@/lib/api/alert';
import { careReceiverApi } from '@/lib/api/careReceiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { LatestHealthCheck } from '@/lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Activity, Drop, Heart, Man } from 'iconsax-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Heights as % of max — index 4 is the tallest (current reading)
const HR_BARS = [25, 45, 65, 50, 100, 60, 40, 25, 12];

export default function HealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const [sosPending, setSosPending] = useState(false);

  const [latest, setLatest] = useState<LatestHealthCheck | null>(null);
  const [bpInput, setBpInput] = useState('');
  const [sugarInput, setSugarInput] = useState('');
  const [completing, setCompleting] = useState(false);

  const loadLatest = useCallback(async () => {
    try {
      const res = await careReceiverApi.getLatestHealthCheck();
      if (res.data) setLatest(res.data);
    } catch {
      // non-fatal: keep showing placeholders
    }
  }, []);

  // Refresh whenever the screen regains focus (e.g. returning from a check).
  useFocusEffect(
    useCallback(() => {
      loadLatest();
    }, [loadLatest])
  );

  // Save a single blood pressure / blood sugar reading via the "+" buttons.
  async function quickLog(field: 'bloodPressure' | 'bloodSugar') {
    if (field === 'bloodPressure') {
      const value = bpInput.trim();
      if (!/^\d{2,3}\/\d{2,3}$/.test(value)) {
        Alert.alert('Invalid entry', 'Enter blood pressure like 120/80.');
        return;
      }
      try {
        await careReceiverApi.logHealthCheck({ bloodPressure: value });
        setBpInput('');
        await loadLatest();
      } catch {
        Alert.alert('Error', 'Could not save. Please try again.');
      }
    } else {
      const num = parseInt(sugarInput.trim(), 10);
      if (!Number.isFinite(num) || num <= 0) {
        Alert.alert('Invalid entry', 'Enter a blood sugar value in mg/dL.');
        return;
      }
      try {
        await careReceiverApi.logHealthCheck({ bloodSugar: num });
        setSugarInput('');
        await loadLatest();
      } catch {
        Alert.alert('Error', 'Could not save. Please try again.');
      }
    }
  }

  async function handleMarkCompleted() {
    if (completing) return;

    // Gather any readings still typed into the inputs.
    const payload: { bloodPressure?: string; bloodSugar?: number } = {};
    const bp = bpInput.trim();
    if (bp) {
      if (!/^\d{2,3}\/\d{2,3}$/.test(bp)) {
        Alert.alert('Invalid entry', 'Enter blood pressure like 120/80.');
        return;
      }
      payload.bloodPressure = bp;
    }
    const sugar = sugarInput.trim();
    if (sugar) {
      const num = parseInt(sugar, 10);
      if (!Number.isFinite(num) || num <= 0) {
        Alert.alert('Invalid entry', 'Enter a blood sugar value in mg/dL.');
        return;
      }
      payload.bloodSugar = num;
    }

    setCompleting(true);
    try {
      if (payload.bloodPressure || payload.bloodSugar) {
        await careReceiverApi.logHealthCheck(payload);
        setBpInput('');
        setSugarInput('');
      }
      await loadLatest();
      Alert.alert('Logged', "Today's health check has been recorded.");
    } catch {
      Alert.alert('Error', 'Could not save your daily log. Please try again.');
    } finally {
      setCompleting(false);
    }
  }

  const hrDisplay = latest?.heartRate != null ? String(latest.heartRate) : '--';
  const bpDisplay = latest?.bloodPressure ?? '--';
  const stability = latest?.stabilityScore;
  const fallRisk =
    stability == null ? '--' : stability >= 80 ? 'Low' : stability >= 55 ? 'Moderate' : 'High';

  function handleSos() {
    Alert.alert(
      '🚨 Send SOS Alert?',
      'This will immediately notify your caregiver that you need urgent help.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            if (sosPending) return;
            setSosPending(true);
            try {
              await alertApi.triggerSos();
              Alert.alert('SOS Sent', 'Your caregiver has been notified.');
            } catch {
              Alert.alert('Error', 'Failed to send SOS. Please try again.');
            } finally {
              setSosPending(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.title}>Health</Text>
          <Text style={s.subtitle}>
            {getGreeting()}, {firstName}. Your vitals look{'\n'}stable today.
          </Text>
        </View>

        {/* Heart Rate Card */}
        <View style={s.card}>
          <View style={s.hrTop}>
            <View style={s.hrTitleRow}>
              <Heart size={18} color="#E53935" variant="Bold" />
              <Text style={s.hrTitle}>Heart Rate</Text>
            </View>
            <View style={s.avgBadge}>
              <Text style={s.avgText}>AVERAGE</Text>
            </View>
          </View>
          <Text style={s.hrValue}>
            {hrDisplay} <Text style={s.hrUnit}>BPM</Text>
          </Text>
          <View style={s.barsRow}>
            {HR_BARS.map((h, i) => (
              <View
                key={i}
                style={[
                  s.bar,
                  {
                    height: Math.max(8, (h / 100) * 64),
                    backgroundColor: i === 4 ? '#E53935' : '#FECDD3',
                    borderRadius: 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Blood Pressure + Fall Risk */}
        <View style={s.row}>
          <View style={[s.card, s.halfCard]}>
            <View style={s.miniHeader}>
              <View style={s.miniIconBox}>
                <Activity size={16} color="#E53935" variant="Linear" />
              </View>
              <Text style={s.miniTitle}>Blood Pressure</Text>
            </View>
            <Text style={s.bpValue}>{bpDisplay}</Text>
            <Text style={s.bpSub}>MMHG</Text>
            <View style={s.bpBar} />
          </View>

          <View style={[s.card, s.halfCard]}>
            <View style={s.miniHeader}>
              <View style={s.miniIconBox}>
                <Man size={16} color="#E53935" variant="Linear" />
              </View>
              <Text style={s.miniTitle}>Fall Risk</Text>
            </View>
            <Text style={s.fallValue}>{fallRisk}</Text>
            <Text style={s.fallSub}>
              STABILITY: {stability != null ? `${stability}%` : '--'}
            </Text>
            <View style={s.dotsRow}>
              <View style={[s.dot, { backgroundColor: '#FECDD3' }]} />
              <View style={[s.dot, { backgroundColor: '#FECDD3' }]} />
              <View style={[s.dot, { backgroundColor: '#E53935' }]} />
            </View>
          </View>
        </View>

        {/* AI Insight Banner */}
        <View style={s.insightCard}>
          <Text style={s.insightStar}>✦</Text>
          <Text style={s.insightText}>
            Your morning activity levels have increased by 15% this week. This is positively impacting your sleep quality.
          </Text>
        </View>

        {/* Health Actions */}
        <Text style={s.sectionTitle}>Health Actions</Text>

        <View style={s.card}>
          <View style={s.actionRow}>
            <View style={s.actionIconCircle}>
              <Activity size={22} color="#E53935" variant="Linear" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Check Heart Rate</Text>
              <Text style={s.actionSub}>Using phone camera sensor</Text>
            </View>
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => router.push('/(app)/heart-rate-check')}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[s.card, { marginTop: 10 }]}>
          <View style={s.actionRow}>
            <View style={s.actionIconCircle}>
              <Man size={22} color="#E53935" variant="Linear" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Stability Test</Text>
              <Text style={s.actionSub}>30-second balance check</Text>
            </View>
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => router.push('/(app)/stability-check')}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Daily Data */}
        <Text style={s.sectionTitle}>Log Daily Data</Text>

        <View style={s.row}>
          <View style={[s.card, s.halfCard]}>
            <View style={s.logIconRow}>
              <Activity size={14} color="#6B7280" variant="Linear" />
              <Text style={s.logLabel}>BLOOD{'\n'}PRESSURE</Text>
            </View>
            <View style={s.logInputRow}>
              <TextInput
                style={s.logInput}
                placeholder="120/80"
                placeholderTextColor="#C4C4C4"
                keyboardType="numbers-and-punctuation"
                value={bpInput}
                onChangeText={setBpInput}
              />
              <TouchableOpacity style={s.addBtn} activeOpacity={0.8} onPress={() => quickLog('bloodPressure')}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[s.card, s.halfCard]}>
            <View style={s.logIconRow}>
              <Drop size={14} color="#6B7280" variant="Linear" />
              <Text style={s.logLabel}>BLOOD SUGAR</Text>
            </View>
            <View style={s.logInputRow}>
              <TextInput
                style={s.logInput}
                placeholder="95 mg/dL"
                placeholderTextColor="#C4C4C4"
                keyboardType="numeric"
                value={sugarInput}
                onChangeText={setSugarInput}
              />
              <TouchableOpacity style={s.addBtn} activeOpacity={0.8} onPress={() => quickLog('bloodSugar')}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Mark as Completed */}
        <TouchableOpacity
          style={[s.completedBtn, completing && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleMarkCompleted}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.completedBtnText}>Mark as Completed</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* SOS */}
      <TouchableOpacity
        style={[s.sos, { bottom: insets.bottom + 16 }, sosPending && { opacity: 0.6 }]}
        activeOpacity={0.85}
        onPress={handleSos}
        disabled={sosPending}
      >
        <Text style={s.sosText}>{sosPending ? '…' : 'SOS'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 22,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Heart rate
  hrTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hrTitle: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#374151',
  },
  avgBadge: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  avgText: {
    fontSize: 11,
    fontFamily: F.m.semiBold,
    color: '#10B981',
    letterSpacing: 0.3,
  },
  hrValue: {
    fontSize: 48,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -1,
    marginBottom: 12,
  },
  hrUnit: {
    fontSize: 18,
    fontFamily: F.m.medium,
    color: '#6B7280',
    letterSpacing: 0,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 70,
  },
  bar: {
    flex: 1,
  },

  // Row + half cards
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  miniIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTitle: {
    fontSize: 12,
    fontFamily: F.m.semiBold,
    color: '#374151',
    flexShrink: 1,
  },
  bpValue: {
    fontSize: 22,
    fontFamily: F.m.xBold,
    color: '#10B981',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  bpSub: {
    fontSize: 10,
    fontFamily: F.m.medium,
    color: '#9CA3AF',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  bpBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E53935',
    width: '70%',
  },
  fallValue: {
    fontSize: 22,
    fontFamily: F.m.xBold,
    color: '#10B981',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  fallSub: {
    fontSize: 10,
    fontFamily: F.m.medium,
    color: '#9CA3AF',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // Insight
  insightCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FEF3E8',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightStar: {
    fontSize: 18,
    color: '#F59E0B',
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#374151',
    lineHeight: 20,
  },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontFamily: F.m.bold,
    color: '#111',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: -0.3,
  },

  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: F.m.semiBold,
    color: '#111',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
  },
  startBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
  },
  startBtnText: {
    fontSize: 13,
    fontFamily: F.m.bold,
    color: '#FFF',
  },

  // Log daily data
  logIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 10,
  },
  logLabel: {
    fontSize: 10,
    fontFamily: F.m.semiBold,
    color: '#6B7280',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  logInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.m.medium,
    color: '#111',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 20,
    color: '#E53935',
    lineHeight: 24,
    fontFamily: F.m.semiBold,
  },

  // Completed button
  completedBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#E53935',
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  completedBtnText: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#FFF',
  },

  // SOS
  sos: {
    position: 'absolute',
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },
  sosText: {
    fontSize: 13,
    fontFamily: F.m.bold,
    color: '#FFF',
  },
});

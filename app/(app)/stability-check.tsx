import { careReceiverApi } from '@/lib/api/careReceiver';
import { F } from '@/lib/fonts';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft, Judge } from 'iconsax-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEST_SECONDS = 30;
const UPDATE_INTERVAL = 100; // ms between accelerometer samples

type Phase = 'intro' | 'testing' | 'result';

// Convert average frame-to-frame acceleration change (in g) into a 0–100
// stability score. Less movement (smaller sway) → higher score.
function swayToScore(meanDelta: number) {
  const score = 100 - meanDelta * 450;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskLabel(score: number) {
  if (score >= 80) return { text: 'Low', color: '#10B981' };
  if (score >= 55) return { text: 'Moderate', color: '#F59E0B' };
  return { text: 'High', color: '#E53935' };
}

export default function StabilityCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('intro');
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [score, setScore] = useState<number | null>(null);
  const [liveSway, setLiveSway] = useState(0);
  const [saving, setSaving] = useState(false);

  const subRef = useRef<{ remove: () => void } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMag = useRef<number | null>(null);
  const totalDelta = useRef(0);
  const sampleCount = useRef(0);

  useEffect(() => {
    return () => stopSensors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopSensors() {
    subRef.current?.remove();
    subRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  async function startTest() {
    const available = await Accelerometer.isAvailableAsync();
    if (!available) {
      Alert.alert('Unavailable', 'Your device does not have a motion sensor for this test.');
      return;
    }

    prevMag.current = null;
    totalDelta.current = 0;
    sampleCount.current = 0;
    setSecondsLeft(TEST_SECONDS);
    setLiveSway(0);
    setPhase('testing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL);
    subRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      if (prevMag.current !== null) {
        const delta = Math.abs(mag - prevMag.current);
        totalDelta.current += delta;
        sampleCount.current += 1;
        setLiveSway(delta);
      }
      prevMag.current = mag;
    });

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function finishTest() {
    stopSensors();
    const meanDelta = sampleCount.current > 0 ? totalDelta.current / sampleCount.current : 0;
    const result = swayToScore(meanDelta);
    setScore(result);
    setPhase('result');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function cancelTest() {
    stopSensors();
    setPhase('intro');
    setSecondsLeft(TEST_SECONDS);
  }

  async function saveResult() {
    if (score == null || saving) return;
    setSaving(true);
    try {
      await careReceiverApi.logHealthCheck({ stabilityScore: score });
      router.replace('/(app)/health');
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        'Could not save your result. Please try again.';
      Alert.alert('Error', msg);
      setSaving(false);
    }
  }

  const progress = 1 - secondsLeft / TEST_SECONDS;
  // live sway → a 0..1 indicator (clamped) for the wobble bar
  const swayPct = Math.min(1, liveSway * 6);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/health')}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {phase === 'intro' ? 'Instructions' : phase === 'testing' ? 'Balance Test' : 'Result'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {phase === 'intro' && (
          <>
            <Text style={s.title}>Check Your Balance</Text>
            <Text style={s.subtitle}>
              Let&apos;s measure your physical stability with a simple 30-second balance exercise.
              Hold the phone against your chest during the test.
            </Text>

            <View style={s.illustrationBox}>
              <Judge size={80} color="#E53935" variant="Linear" />
            </View>

            <View style={s.stepCard}>
              <View style={s.stepBadge}>
                <Text style={s.stepNumber}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>Single Leg Stance</Text>
                <Text style={s.stepDesc}>
                  Stand straight and lift one foot slightly off the floor. Try to hold for 30 seconds.
                </Text>
              </View>
            </View>

            <View style={s.stepCard}>
              <View style={s.stepBadge}>
                <Text style={s.stepNumber}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>Safety First</Text>
                <Text style={s.stepDesc}>
                  Keep a sturdy chair or table within arm&apos;s reach for support if you feel wobbly.
                </Text>
              </View>
            </View>

            <View style={s.warningBanner}>
              <Text style={s.warningDot}>ⓘ</Text>
              <Text style={s.warningText}>
                Ensure you are in a clear space before beginning.
              </Text>
            </View>

            <TouchableOpacity style={[s.startBtn, { marginTop: 28 }]} activeOpacity={0.85} onPress={startTest}>
              <Text style={s.startBtnText}>Start Test</Text>
            </TouchableOpacity>

            <Text style={[s.durationHint, { marginBottom: insets.bottom + 16 }]}>
              Test duration: ~30 seconds
            </Text>
          </>
        )}

        {phase === 'testing' && (
          <View style={s.centerBlock}>
            <Text style={s.title}>Hold Steady…</Text>
            <Text style={s.subtitle}>
              Balance on one leg and keep the phone still{'\n'}against your chest.
            </Text>

            <Text style={s.countdown}>{secondsLeft}s</Text>

            <Text style={s.swayLabel}>Live sway</Text>
            <View style={s.swayTrack}>
              <View
                style={[
                  s.swayFill,
                  {
                    width: `${swayPct * 100}%`,
                    backgroundColor: swayPct > 0.6 ? '#E53935' : swayPct > 0.3 ? '#F59E0B' : '#10B981',
                  },
                ]}
              />
            </View>

            <View style={[s.progressTrack, { marginTop: 24 }]}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <TouchableOpacity style={[s.secondaryBtn, { marginTop: 28 }]} activeOpacity={0.85} onPress={cancelTest}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'result' && score != null && (
          <View style={s.centerBlock}>
            <Text style={s.title}>Stability Result</Text>
            <Text style={s.subtitle}>Test complete.</Text>

            <View style={s.resultCircle}>
              <Text style={s.resultValue}>{score}%</Text>
              <Text style={[s.resultRisk, { color: riskLabel(score).color }]}>
                {riskLabel(score).text} fall risk
              </Text>
            </View>

            <TouchableOpacity
              style={[s.startBtn, { marginTop: 36, width: '100%' }]}
              activeOpacity={0.85}
              onPress={saveResult}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.startBtnText}>Save Result</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: 12, marginBottom: insets.bottom + 16 }]}
              activeOpacity={0.85}
              onPress={startTest}
              disabled={saving}
            >
              <Text style={s.secondaryBtnText}>Test Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: F.m.semiBold,
    color: '#111',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 28,
  },

  illustrationBox: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: '#FEF2F2',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#374151',
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: F.m.semiBold,
    color: '#111',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 19,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  warningDot: {
    fontSize: 16,
    color: '#E53935',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#E53935',
    lineHeight: 20,
  },

  // Testing + result
  centerBlock: {
    alignItems: 'center',
    paddingTop: 8,
  },
  countdown: {
    fontSize: 56,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -2,
    marginBottom: 28,
  },
  swayLabel: {
    fontSize: 12,
    fontFamily: F.m.semiBold,
    color: '#9CA3AF',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  swayTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  swayFill: {
    height: 12,
    borderRadius: 6,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  resultCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 6,
  },
  resultValue: {
    fontSize: 52,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -2,
  },
  resultRisk: {
    fontSize: 15,
    fontFamily: F.m.semiBold,
  },

  startBtn: {
    backgroundColor: '#E53935',
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#FFF',
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: F.m.semiBold,
    color: '#6B7280',
  },
  durationHint: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
});

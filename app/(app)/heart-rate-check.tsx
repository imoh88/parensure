import { careReceiverApi } from '@/lib/api/careReceiver';
import { F } from '@/lib/fonts';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft, Heart } from 'iconsax-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

const MEASURE_SECONDS = 20; // seconds of continuous good contact required

// ── Finger-contact thresholds (0–255). With the torch on and a fingertip fully
// covering the lens, the red channel saturates and dominates green/blue. ──────
const RED_MIN = 110;
const RED_OVER_BLUE = 1.4;
const RED_OVER_GREEN = 1.2;

type Phase = 'intro' | 'measuring' | 'result' | 'error';

interface Sample {
  t: number; // ms
  r: number;
  g: number;
  b: number;
}

function isFingerOn(recent: Sample[]): boolean {
  if (recent.length === 0) return false;
  let r = 0, g = 0, b = 0;
  for (const s of recent) {
    r += s.r;
    g += s.g;
    b += s.b;
  }
  const n = recent.length;
  r /= n; g /= n; b /= n;
  return r > RED_MIN && r > b * RED_OVER_BLUE && r > g * RED_OVER_GREEN;
}

// Estimate BPM from the red-channel PPG signal via detrend → smooth → peak find.
function computeBpm(samples: Sample[]): number | null {
  if (samples.length < 60) return null;

  const t0 = samples[0]!.t;
  const xs = samples.map((s) => (s.t - t0) / 1000); // seconds
  const ys = samples.map((s) => s.r);

  const duration = xs[xs.length - 1]! - xs[0]!;
  if (duration < 8) return null;
  const fps = samples.length / duration;

  // Detrend: subtract a ~1s moving average to isolate the pulsatile component.
  const win = Math.max(3, Math.round(fps));
  const detr = ys.map((v, i) => {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - win); j <= Math.min(ys.length - 1, i + win); j++) {
      sum += ys[j]!;
      count++;
    }
    return v - sum / count;
  });

  // Light smoothing to suppress sensor noise.
  const sm = detr.map((_, i) => {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(detr.length - 1, i + 2); j++) {
      sum += detr[j]!;
      count++;
    }
    return sum / count;
  });

  // Peak detection with a minimum spacing capping at ~180 BPM.
  const minDist = Math.max(1, Math.round(fps * 0.33));
  const peaks: number[] = [];
  for (let i = 1; i < sm.length - 1; i++) {
    if (sm[i]! > sm[i - 1]! && sm[i]! >= sm[i + 1]! && sm[i]! > 0) {
      const last = peaks[peaks.length - 1];
      if (last === undefined || i - last >= minDist) {
        peaks.push(i);
      } else if (sm[i]! > sm[last]!) {
        peaks[peaks.length - 1] = i;
      }
    }
  }
  if (peaks.length < 5) return null;

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(xs[peaks[i]!]! - xs[peaks[i - 1]!]!);
  }
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)]!;
  const bpm = 60 / median;
  if (bpm < 40 || bpm > 200) return null;
  return Math.round(bpm);
}

export default function HeartRateCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const { resize } = useResizePlugin();

  const [phase, setPhase] = useState<Phase>('intro');
  const [secondsLeft, setSecondsLeft] = useState(MEASURE_SECONDS);
  const [fingerOn, setFingerOn] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const samplesRef = useRef<Sample[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debugCountRef = useRef(0);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Called from the frame-processor worklet on every analysed frame.
  const onSample = useRunOnJS((r: number, g: number, b: number) => {
    if (phaseRef.current !== 'measuring') return;
    const arr = samplesRef.current;
    arr.push({ t: Date.now(), r, g, b });
    // keep memory bounded (~ a few minutes of 30fps)
    if (arr.length > 4000) arr.splice(0, arr.length - 4000);

    // TEMP debug: log mean channels every ~15 frames to calibrate thresholds.
    debugCountRef.current += 1;
    if (debugCountRef.current % 15 === 0) {
      console.log(
        `🫀 PPG sample r=${r.toFixed(0)} g=${g.toFixed(0)} b=${b.toFixed(0)} (samples=${arr.length})`
      );
    }

    const recent = arr.slice(-12);
    setFingerOn(isFingerOn(recent));
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      // Downscale to a tiny RGB buffer and average the channels.
      const w = 8;
      const h = 8;
      const data = resize(frame, {
        scale: { width: w, height: h },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });
      let r = 0, g = 0, b = 0;
      const px = w * h;
      for (let i = 0; i < px; i++) {
        r += data[i * 3];
        g += data[i * 3 + 1];
        b += data[i * 3 + 2];
      }
      onSample(r / px, g / px, b / px);
    },
    [onSample, resize]
  );

  async function startMeasurement() {
    setErrorMsg('');
    setBpm(null);

    if (!device) {
      setErrorMsg('No back camera is available on this device.');
      setPhase('error');
      return;
    }
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setErrorMsg('Camera access is required to measure your heart rate.');
        setPhase('error');
        return;
      }
    }

    samplesRef.current = [];
    setSecondsLeft(MEASURE_SECONDS);
    setFingerOn(false);
    setPhase('measuring');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    intervalRef.current = setInterval(() => {
      const recent = samplesRef.current.slice(-12);
      const present = isFingerOn(recent);

      if (!present) {
        // Lost contact — restart the window so we only keep a clean run.
        samplesRef.current = [];
        setSecondsLeft(MEASURE_SECONDS);
        return;
      }

      setSecondsLeft((prev) => {
        if (prev <= 1) {
          finishMeasurement();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function finishMeasurement() {
    stopInterval();
    const reading = computeBpm(samplesRef.current);
    if (reading == null) {
      setErrorMsg(
        'Could not detect a steady pulse. Keep your fingertip still and fully covering the camera and flash, then try again.'
      );
      setPhase('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setBpm(reading);
    setPhase('result');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function cancelMeasurement() {
    stopInterval();
    samplesRef.current = [];
    setPhase('intro');
    setSecondsLeft(MEASURE_SECONDS);
  }

  async function saveReading() {
    if (bpm == null || saving) return;
    setSaving(true);
    try {
      await careReceiverApi.logHealthCheck({ heartRate: bpm });
      router.replace('/(app)/health');
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        'Could not save your reading. Please try again.';
      Alert.alert('Error', msg);
      setSaving(false);
    }
  }

  const cameraActive = phase === 'measuring';
  const progress = 1 - secondsLeft / MEASURE_SECONDS;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => {
            stopInterval();
            router.replace('/(app)/health');
          }}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {phase === 'intro'
            ? 'Instructions'
            : phase === 'measuring'
            ? 'Measuring'
            : phase === 'result'
            ? 'Result'
            : 'Try Again'}
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
            <Text style={s.title}>Check Your Heart Rate</Text>
            <Text style={s.subtitle}>
              Please take a moment to sit comfortably and{'\n'}relax before we start.
            </Text>

            <View style={s.cameraBox}>
              <View style={s.cameraIconCircle}>
                <Activity size={32} color="#E53935" variant="Linear" />
              </View>
            </View>

            {[
              { n: 1, title: 'Place Your Finger', desc: 'Cover the back camera lens and flash completely.' },
              { n: 2, title: 'Hold Still', desc: 'Keep your finger firmly in place while we read your pulse.' },
              { n: 3, title: 'Read Your BPM', desc: 'Your heart rate will appear when measurement is complete.' },
            ].map((step) => (
              <View key={step.n} style={s.stepCard}>
                <View style={s.stepBadge}>
                  <Text style={s.stepNumber}>{step.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[s.startBtn, { marginTop: 32, marginBottom: insets.bottom + 16 }]}
              activeOpacity={0.85}
              onPress={startMeasurement}
            >
              <Text style={s.startBtnText}>Start Measurement</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'measuring' && (
          <View style={s.centerBlock}>
            <Text style={s.title}>{fingerOn ? 'Reading pulse…' : 'Place your finger'}</Text>
            <Text style={s.subtitle}>
              {fingerOn
                ? 'Keep your fingertip steady over the camera and flash.'
                : 'Cover the back camera lens and flash completely with your fingertip.'}
            </Text>

            <View style={[s.pulseWrap, { borderColor: fingerOn ? '#E53935' : '#E5E7EB' }]}>
              {device && (
                <Camera
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={cameraActive}
                  torch="on"
                  frameProcessor={frameProcessor}
                  photo={false}
                  video={false}
                  audio={false}
                />
              )}
              {!fingerOn && (
                <View style={s.pulseOverlay}>
                  <Heart size={40} color="#9CA3AF" variant="Bold" />
                </View>
              )}
            </View>

            <Text style={s.countdown}>{fingerOn ? `${secondsLeft}s` : '—'}</Text>

            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(fingerOn ? progress : 0) * 100}%` }]} />
            </View>

            <Text style={s.hint}>
              {fingerOn
                ? 'Hold still — the timer resets if contact is lost.'
                : 'Waiting for good contact…'}
            </Text>

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: 20 }]}
              activeOpacity={0.85}
              onPress={cancelMeasurement}
            >
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'result' && (
          <View style={s.centerBlock}>
            <Text style={s.title}>Your Heart Rate</Text>
            <Text style={s.subtitle}>Measurement complete.</Text>

            <View style={s.resultCircle}>
              <Heart size={28} color="#E53935" variant="Bold" />
              <Text style={s.resultValue}>{bpm}</Text>
              <Text style={s.resultUnit}>BPM</Text>
            </View>

            <TouchableOpacity
              style={[s.startBtn, { marginTop: 36, width: '100%' }]}
              activeOpacity={0.85}
              onPress={saveReading}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.startBtnText}>Save Reading</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: 12, marginBottom: insets.bottom + 16 }]}
              activeOpacity={0.85}
              onPress={startMeasurement}
              disabled={saving}
            >
              <Text style={s.secondaryBtnText}>Measure Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'error' && (
          <View style={s.centerBlock}>
            <Text style={s.title}>Couldn&apos;t Read</Text>
            <Text style={s.subtitle}>{errorMsg}</Text>

            <View style={[s.resultCircle, { backgroundColor: '#FEF2F2' }]}>
              <Heart size={48} color="#FCA5A5" variant="Bold" />
            </View>

            <TouchableOpacity
              style={[s.startBtn, { marginTop: 36, width: '100%' }]}
              activeOpacity={0.85}
              onPress={startMeasurement}
            >
              <Text style={s.startBtnText}>Try Again</Text>
            </TouchableOpacity>

            {errorMsg.includes('Camera access') && (
              <TouchableOpacity
                style={[s.secondaryBtn, { marginTop: 12 }]}
                activeOpacity={0.85}
                onPress={() => Linking.openSettings()}
              >
                <Text style={s.secondaryBtnText}>Open Settings</Text>
              </TouchableOpacity>
            )}
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
  },
  cameraBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cameraIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Measuring + result
  centerBlock: {
    alignItems: 'center',
    paddingTop: 8,
  },
  pulseWrap: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    borderWidth: 3,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontSize: 40,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -1,
    marginBottom: 18,
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
  hint: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  resultCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 2,
  },
  resultValue: {
    fontSize: 56,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -2,
  },
  resultUnit: {
    fontSize: 16,
    fontFamily: F.m.medium,
    color: '#6B7280',
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
});

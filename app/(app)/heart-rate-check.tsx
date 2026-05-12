import { F } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft } from 'iconsax-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HeartRateCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/health')}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Instructions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Check Your Heart Rate</Text>
        <Text style={s.subtitle}>
          Please take a moment to sit comfortably and{'\n'}relax before we start.
        </Text>

        {/* Camera preview placeholder */}
        <View style={s.cameraBox}>
          <View style={s.cameraIconCircle}>
            <Activity size={32} color="#E53935" variant="Linear" />
          </View>
        </View>

        {/* Steps */}
        {[
          { n: 1, title: 'Place Your Finger', desc: 'Cover the back camera lens and flash completely.' },
          { n: 2, title: 'Hold Still', desc: 'Keep your finger firmly in place for 30 seconds.' },
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

        {/* Start button */}
        <TouchableOpacity
          style={[s.startBtn, { marginTop: 32, marginBottom: insets.bottom + 16 }]}
          activeOpacity={0.85}
        >
          <Text style={s.startBtnText}>Start Measurement</Text>
        </TouchableOpacity>
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
    marginBottom: 32,
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
  startBtn: {
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
  startBtnText: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#FFF',
  },
});

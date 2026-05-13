import { F } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { ArrowLeft, Judge } from 'iconsax-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StabilityCheckScreen() {
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
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Instructions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Check Your Balance</Text>
        <Text style={s.subtitle}>
          Let's measure your physical stability with a simple 30-second balance exercise.
        </Text>

        {/* Illustration */}
        <View style={s.illustrationBox}>
          <Judge size={80} color="#E53935" variant="Linear" />
        </View>

        {/* Steps */}
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
              Keep a sturdy chair or table within arm's reach for support if you feel wobbly.
            </Text>
          </View>
        </View>

        {/* Warning banner */}
        <View style={s.warningBanner}>
          <Text style={s.warningDot}>ⓘ</Text>
          <Text style={s.warningText}>
            Ensure you are in a clear space before beginning.
          </Text>
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[s.startBtn, { marginTop: 28 }]}
          activeOpacity={0.85}
        >
          <Text style={s.startBtnText}>Start Test</Text>
        </TouchableOpacity>

        <Text style={[s.durationHint, { marginBottom: insets.bottom + 16 }]}>
          Test duration: ~1 minute
        </Text>
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
  durationHint: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
});

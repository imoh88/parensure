import { F } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConsentItem {
  key: string;
  title: string;
  description: string;
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    key: 'healthVitals',
    title: 'Share Health Vitals',
    description:
      'Continuous sync of heart rate, oxygen levels, and blood pressure trends for immediate medical oversight.',
  },
  {
    key: 'activityData',
    title: 'Share Activity Data',
    description:
      'Share steps, sleep cycles, and mobility patterns to help us understand your daily recovery journey.',
  },
  {
    key: 'emergencyAccess',
    title: 'Allow Emergency Access',
    description:
      'Enables high-priority data transmission to local emergency services if critical vitals fall outside safe thresholds.',
  },
];

export default function PrivacyConsentScreen() {
  const router = useRouter();
  const [consents, setConsents] = useState<Record<string, boolean>>({
    healthVitals: false,
    activityData: false,
    emergencyAccess: false,
  });

  const toggle = (key: string) =>
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleFinish = () => {
    router.replace('/(app)');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Information</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={s.progressFill} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Privacy Policy{'\n'}& Data Consent</Text>
        <Text style={s.subtitle}>
          We collect vitals and activity data to build a proactive care ecosystem. We ensure it is only
          visible to those essential for your care.
        </Text>

        {/* Consent toggles */}
        <View style={s.cardList}>
          {CONSENT_ITEMS.map((item, idx) => (
            <View key={item.key} style={[s.card, idx < CONSENT_ITEMS.length - 1 && s.cardBorder]}>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardDesc}>{item.description}</Text>
              </View>
              <Switch
                value={consents[item.key] ?? false}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#E5E7EB', true: '#E84545' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Encryption notice */}
        <Text style={s.notice}>
          Your data is encrypted at rest and in transit. You may revoke these permissions at any time via Settings.
        </Text>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.finishBtn}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={s.finishBtnText}>Finish Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(app)')} activeOpacity={0.7}>
          <Text style={s.skipText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 28, fontFamily: F.i.regular, color: '#E84545', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111827' },

  progressTrack: { height: 4, backgroundColor: '#F3F4F6', width: '100%' },
  progressFill: { height: '100%', width: '75%', backgroundColor: '#E84545' },

  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },

  title: {
    fontSize: 34,
    fontFamily: F.m.xBold,
    color: '#111827',
    lineHeight: 42,
    letterSpacing: -0.6,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 23,
    marginBottom: 32,
  },

  cardList: { gap: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    gap: 16,
  },
  cardBorder: {},
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 17,
    fontFamily: F.m.bold,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 20,
  },

  notice: {
    fontSize: 12,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 16,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 4,
  },
  finishBtn: {
    height: 58,
    borderRadius: 100,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  finishBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF' },
  skipText: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#111827',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

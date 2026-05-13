import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPTIONS = [
  {
    key: 'scan',
    icon: 'camera' as const,
    title: 'Scan Medication',
    description: 'Use your camera to quickly capture pill bottle information.',
    route: '/(app)/scan-medication',
  },
  {
    key: 'manual',
    icon: 'document-text' as const,
    title: 'Enter Manually',
    description: 'Type in the dosage, frequency, and instructions yourself.',
    route: '/(app)/add-medication-manual',
  },
] as const;

export default function AddMedicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenWrapper bg="#F5F5F5" avoidKeyboard={false}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Medication</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Choose how you'd like{'\n'}to add medication details</Text>
        <Text style={s.subtitle}>This helps us customize your setup and dashboard.</Text>

        <View style={s.options}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={s.card}
              activeOpacity={0.85}
              onPress={() => router.push(opt.route as any)}
            >
              <View style={s.iconWrap}>
                <Ionicons name={opt.icon} size={24} color="#fff" />
              </View>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>{opt.title}</Text>
                <Text style={s.cardDesc}>{opt.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.tip}>
          <Ionicons name="bulb-outline" size={18} color="#E53935" style={{ marginTop: 1 }} />
          <Text style={s.tipText}>
            <Text style={s.tipBold}>Caregiver Tip: </Text>
            Keep the original packaging nearby to ensure accurate dosage information.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },

  body: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginTop: 8, marginBottom: 10, lineHeight: 30 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, marginBottom: 32 },

  options: { gap: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FBFBFB', borderRadius: 18,
    padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },
  cardDesc: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 18 },

  tip: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EBEBEB', borderRadius: 14,
    padding: 16, marginTop: 28,
  },
  tipText: { flex: 1, fontSize: 13, fontFamily: F.i.regular, color: '#555', lineHeight: 19 },
  tipBold: { fontFamily: F.i.bold, color: '#111' },
});

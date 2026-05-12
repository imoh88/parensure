import { F } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowSwapHorizontal } from 'iconsax-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Lang = 'en' | 'es';

const LANGUAGES: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'es', label: 'Spanish', flag: '🇪🇸' },
];

export default function ChangeLanguageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Lang>('en');

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E84545" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Change Language</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <Text style={s.sectionLabel}>Switch App Language</Text>

        <View style={s.pillRow}>
          {LANGUAGES.map((lang, idx) => {
            const active = selected === lang.key;
            return (
              <React.Fragment key={lang.key}>
                <TouchableOpacity
                  style={[s.pill, active && s.pillActive]}
                  onPress={() => setSelected(lang.key)}
                  activeOpacity={0.8}
                >
                  <Text style={s.pillFlag}>{lang.flag}</Text>
                  <Text style={[s.pillLabel, active && s.pillLabelActive]}>{lang.label}</Text>
                </TouchableOpacity>
                {idx < LANGUAGES.length - 1 && (
                  <ArrowSwapHorizontal size={22} color="#9CA3AF" variant="Linear" />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 36, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111827' },

  content: { paddingHorizontal: 24, paddingTop: 32 },
  sectionLabel: { fontSize: 18, fontFamily: F.m.bold, color: '#111827', marginBottom: 24 },

  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 50,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFF',
  },
  pillActive: {
    borderColor: '#F59E0B', backgroundColor: '#FFFBEB',
  },
  pillFlag: { fontSize: 22 },
  pillLabel: { fontSize: 15, fontFamily: F.m.semiBold, color: '#374151' },
  pillLabelActive: { color: '#111827' },
});

import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type AmPm = 'AM' | 'PM';
type DigestOption = 'Morning' | 'Afternoon' | 'Evening' | 'Custom';

interface TimeValue {
  hour: number;
  minute: number;
  ampm: AmPm;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({ value, onInc, onDec, pad = 2 }: {
  value: number; onInc: () => void; onDec: () => void; pad?: number;
}) {
  return (
    <View style={ts.stepper}>
      <TouchableOpacity style={ts.stepBtn} onPress={onInc} activeOpacity={0.7}>
        <Ionicons name="chevron-up" size={12} color="#6B7280" />
      </TouchableOpacity>
      <Text style={ts.stepValue}>{String(value).padStart(pad, '0')}</Text>
      <TouchableOpacity style={ts.stepBtn} onPress={onDec} activeOpacity={0.7}>
        <Ionicons name="chevron-down" size={12} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

function AmPmToggle({ value, onChange }: { value: AmPm; onChange: (v: AmPm) => void }) {
  return (
    <TouchableOpacity
      style={ts.ampm}
      onPress={() => onChange(value === 'AM' ? 'PM' : 'AM')}
      activeOpacity={0.7}
    >
      <Text style={ts.ampmText}>{value}</Text>
      <Ionicons name="chevron-down" size={12} color="#6B7280" />
    </TouchableOpacity>
  );
}

function TimeRow({ label, time, onChange }: {
  label: string; time: TimeValue; onChange: (t: TimeValue) => void;
}) {
  const setHour = (delta: number) => onChange({
    ...time, hour: Math.max(1, Math.min(12, time.hour + delta)),
  });
  const setMinute = (delta: number) => onChange({
    ...time, minute: ((time.minute + delta + 60) % 60),
  });
  return (
    <View style={ts.timeRow}>
      <Text style={ts.timeLabel}>{label}</Text>
      <View style={ts.timePickers}>
        <Stepper value={time.hour} onInc={() => setHour(1)} onDec={() => setHour(-1)} />
        <Stepper value={time.minute} onInc={() => setMinute(1)} onDec={() => setMinute(-1)} />
        <AmPmToggle value={time.ampm} onChange={(v) => onChange({ ...time, ampm: v })} />
      </View>
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const DIGEST_OPTIONS: DigestOption[] = ['Morning', 'Afternoon', 'Evening', 'Custom'];

const DEFAULT_TIME: TimeValue = { hour: 0, minute: 30, ampm: 'AM' };

const CRITICAL_ITEMS = ['Fall detection', 'Missed medication (critical)', 'Emergency alerts'];

export default function NotificationSettingsScreen() {
  const router = useRouter();

  const [quietFrom, setQuietFrom] = useState<TimeValue>({ ...DEFAULT_TIME });
  const [quietTo, setQuietTo] = useState<TimeValue>({ ...DEFAULT_TIME });
  const [digest, setDigest] = useState<DigestOption>('Custom');
  const [digestFrom, setDigestFrom] = useState<TimeValue>({ ...DEFAULT_TIME });
  const [digestTo, setDigestTo] = useState<TimeValue>({ ...DEFAULT_TIME });

  const handleSave = () => {
    Alert.alert('Saved', 'Notification settings updated.');
    router.back();
  };

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Notification Settings</Text>
        <Text style={s.pageSubtitle}>
          Customize how and when you receive updates about your Circle's health and safety.
        </Text>

        {/* ── Quiet Hours ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quiet Hours</Text>
          <Text style={s.sectionSub}>Only urgent alerts will come through during this time</Text>
          <View style={s.card}>
            <TimeRow label="From" time={quietFrom} onChange={setQuietFrom} />
            <View style={s.cardDivider} />
            <TimeRow label="To" time={quietTo} onChange={setQuietTo} />
          </View>
        </View>

        {/* ── Digest Delivery ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Digest Delivery</Text>
          <Text style={s.sectionSub}>Choose when you'd like to receive your daily summary</Text>
          <View style={s.card}>
            {/* Chips */}
            <View style={s.chipRow}>
              {DIGEST_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.chip, digest === opt && s.chipActive]}
                  onPress={() => setDigest(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, digest === opt && s.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom time range */}
            {digest === 'Custom' && (
              <>
                <View style={s.cardDivider} />
                <TimeRow label="From" time={digestFrom} onChange={setDigestFrom} />
                <View style={s.cardDivider} />
                <TimeRow label="To" time={digestTo} onChange={setDigestTo} />
              </>
            )}
          </View>
        </View>

        {/* ── Critical Alerts ── */}
        <View style={s.section}>
          <View style={s.criticalHeader}>
            <View style={s.criticalTitleRow}>
              <Ionicons name="alert-circle" size={18} color="#E53935" />
              <Text style={s.criticalTitle}>Critical Alerts</Text>
            </View>
            <View style={s.alwaysActiveBadge}>
              <Text style={s.alwaysActiveText}>ALWAYS ACTIVE</Text>
            </View>
          </View>
          <View style={s.card}>
            {CRITICAL_ITEMS.map((item, i) => (
              <View key={item}>
                <View style={s.criticalRow}>
                  <Text style={s.criticalItem}>{item}</Text>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                </View>
                {i < CRITICAL_ITEMS.length - 1 && <View style={s.cardDivider} />}
              </View>
            ))}
            <View style={s.criticalNote}>
              <Text style={s.criticalNoteText}>
                These alerts are always delivered immediately, regardless of quiet hours or silent mode settings.
              </Text>
            </View>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Stepper styles ───────────────────────────────────────────────────────────

const ts = StyleSheet.create({
  stepper: {
    alignItems: 'center', backgroundColor: '#F3F4F6',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    minWidth: 52,
  },
  stepBtn: { padding: 2 },
  stepValue: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111', marginVertical: 2 },
  ampm: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  ampmText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#374151' },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  timeLabel: { fontSize: 14, fontFamily: F.m.semiBold, color: '#374151' },
  timePickers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  pageTitle: { fontSize: 26, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginBottom: 6 },
  pageSubtitle: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 20, marginBottom: 28 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', marginBottom: 4 },
  sectionSub: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 12 },

  card: {
    backgroundColor: '#F3F4F6', borderRadius: 16,
    overflow: 'hidden',
  },
  cardDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#E53935' },
  chipText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#374151' },
  chipTextActive: { color: '#FFF' },

  criticalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  criticalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  criticalTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#E53935' },
  alwaysActiveBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  alwaysActiveText: { fontSize: 11, fontFamily: F.m.bold, color: '#E53935', letterSpacing: 0.5 },

  criticalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  criticalItem: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  criticalNote: {
    backgroundColor: '#FEF2F2', padding: 14, margin: 12, borderRadius: 10,
  },
  criticalNoteText: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19 },

  saveBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 16 },
});

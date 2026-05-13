import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeValue {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

// ─── Time Stepper ─────────────────────────────────────────────────────────────

function TimeStepper({
  value,
  onChange,
}: {
  value: TimeValue;
  onChange: (v: TimeValue) => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');

  const stepHour = (dir: 1 | -1) => {
    let h = value.hour + dir;
    if (h > 12) h = 1;
    if (h < 1) h = 12;
    onChange({ ...value, hour: h });
  };

  const stepMinute = (dir: 1 | -1) => {
    let m = value.minute + dir * 5;
    if (m >= 60) m = 0;
    if (m < 0) m = 55;
    onChange({ ...value, minute: m });
  };

  const togglePeriod = () =>
    onChange({ ...value, period: value.period === 'AM' ? 'PM' : 'AM' });

  return (
    <View style={ts.row}>
      {/* Hour */}
      <View style={ts.box}>
        <TouchableOpacity onPress={() => stepHour(1)} style={ts.arrow} activeOpacity={0.6}>
          <Text style={ts.arrowText}>▲</Text>
        </TouchableOpacity>
        <Text style={ts.value}>{value.hour}</Text>
        <TouchableOpacity onPress={() => stepHour(-1)} style={ts.arrow} activeOpacity={0.6}>
          <Text style={ts.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Minute */}
      <View style={ts.box}>
        <TouchableOpacity onPress={() => stepMinute(1)} style={ts.arrow} activeOpacity={0.6}>
          <Text style={ts.arrowText}>▲</Text>
        </TouchableOpacity>
        <Text style={ts.value}>{pad(value.minute)}</Text>
        <TouchableOpacity onPress={() => stepMinute(-1)} style={ts.arrow} activeOpacity={0.6}>
          <Text style={ts.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* AM/PM */}
      <TouchableOpacity style={ts.periodBox} onPress={togglePeriod} activeOpacity={0.7}>
        <Text style={ts.periodText}>{value.period}</Text>
        <Ionicons name="chevron-down" size={14} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CareReceiverRoutineScreen() {
  const router = useRouter();
  const { careReceiverId } = useLocalSearchParams<{ careReceiverId: string }>();

  const [wakeUp, setWakeUp] = useState<TimeValue>({ hour: 5, minute: 30, period: 'AM' });
  const [sleepTime, setSleepTime] = useState<TimeValue>({ hour: 5, minute: 30, period: 'PM' });
  const [breakfast, setBreakfast] = useState<TimeValue>({ hour: 9, minute: 0, period: 'AM' });
  const [lunch, setLunch] = useState<TimeValue>({ hour: 2, minute: 0, period: 'PM' });
  const [dinner, setDinner] = useState<TimeValue>({ hour: 5, minute: 30, period: 'PM' });

  const handleContinue = () => {
    router.push({ pathname: '/(auth)/care-receiver-team', params: { careReceiverId } });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add a Care Receiver</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: '66%' }]} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Create a simple{'\n'}daily routine</Text>
        <Text style={s.subtitle}>We'll use this to personalize reminders and care tasks</Text>

        {/* Daily Sleep */}
        <Text style={s.sectionLabel}>Daily Sleep</Text>

        <Text style={s.fieldLabel}>Wake-up time</Text>
        <TimeStepper value={wakeUp} onChange={setWakeUp} />

        <Text style={[s.fieldLabel, { marginTop: 20 }]}>Sleep time</Text>
        <TimeStepper value={sleepTime} onChange={setSleepTime} />

        <View style={s.dashedDivider} />

        {/* Meal Times */}
        <Text style={s.sectionLabel}>Meal Times</Text>

        <Text style={s.fieldLabel}>Breakfast</Text>
        <TimeStepper value={breakfast} onChange={setBreakfast} />

        <Text style={[s.fieldLabel, { marginTop: 20 }]}>Lunch</Text>
        <TimeStepper value={lunch} onChange={setLunch} />

        <Text style={[s.fieldLabel, { marginTop: 20 }]}>Dinner</Text>
        <TimeStepper value={dinner} onChange={setDinner} />

        {/* Info note */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#E53935" style={{ marginTop: 2 }} />
          <Text style={s.infoText}>
            This helps us adjust reminders around rest and activity, ensuring care doesn't interrupt vital sleep or meal cycles.
          </Text>
        </View>

        <TouchableOpacity style={s.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Time stepper styles ──────────────────────────────────────────────────────

const ts = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  box: {
    width: 80, backgroundColor: '#F3F4F6', borderRadius: 12,
    alignItems: 'center', paddingVertical: 6,
  },
  arrow: { paddingVertical: 4, paddingHorizontal: 16 },
  arrowText: { fontSize: 11, color: '#6B7280', fontFamily: F.m.semiBold },
  value: { fontSize: 22, fontFamily: F.m.bold, color: '#111827', paddingVertical: 4 },
  periodBox: {
    width: 88, backgroundColor: '#F3F4F6', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  periodText: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111827' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111827' },
  progressTrack: { height: 3, backgroundColor: '#F3F4F6' },
  progressFill: { height: '100%', backgroundColor: '#E53935' },

  scroll: { paddingHorizontal: 24, paddingBottom: 56, paddingTop: 20 },

  title: { fontSize: 32, fontFamily: F.m.xBold, color: '#111827', lineHeight: 40, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, marginBottom: 28 },

  sectionLabel: { fontSize: 11, fontFamily: F.m.semiBold, color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  fieldLabel: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111827', marginBottom: 4 },

  dashedDivider: {
    borderBottomWidth: 1.5, borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed', marginVertical: 28,
  },

  infoBox: {
    flexDirection: 'row', gap: 12, backgroundColor: '#F3F4F6',
    borderRadius: 14, padding: 16, marginTop: 32, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19 },

  continueBtn: { height: 56, borderRadius: 28, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  continueBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
});

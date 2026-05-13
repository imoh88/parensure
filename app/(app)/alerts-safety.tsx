import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  label: string;
  enabled: boolean;
  value: number;
  unit: 'min' | 'h' | 'tasks';
  min: number;
  max: number;
  step: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: number, unit: AlertRule['unit']): string {
  if (unit === 'tasks') return `${value} Tasks`;
  if (unit === 'h') return `${value}h`;
  return `${value}m`;
}

// ─── Slider (draggable) ───────────────────────────────────────────────────────

function DiscreteSlider({
  value, min, max, step, color, onChange,
}: {
  value: number; min: number; max: number; step: number;
  color: string; onChange: (v: number) => void;
}) {
  const trackWidth = useRef(0);
  const steps = Math.round((max - min) / step);
  const currentStep = Math.round((value - min) / step);
  const pct = steps > 0 ? currentStep / steps : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        if (trackWidth.current > 0) {
          const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
          const rawValue = min + ratio * (max - min);
          const snapped = Math.round((rawValue - min) / step) * step + min;
          onChange(Math.max(min, Math.min(max, snapped)));
        }
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        if (trackWidth.current > 0) {
          const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
          const rawValue = min + ratio * (max - min);
          const snapped = Math.round((rawValue - min) / step) * step + min;
          onChange(Math.max(min, Math.min(max, snapped)));
        }
      },
    })
  ).current;

  return (
    <View
      style={sl.track}
      onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={[sl.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      <View style={[sl.thumb, { left: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRuleRow({
  rule, color, onChange,
}: {
  rule: AlertRule;
  color: string;
  onChange: (patch: Partial<AlertRule>) => void;
}) {
  return (
    <View style={r.wrap}>
      <View style={r.top}>
        <Text style={r.label}>{rule.label}</Text>
        <Switch
          value={rule.enabled}
          onValueChange={(v) => onChange({ enabled: v })}
          trackColor={{ false: '#E5E7EB', true: color }}
          thumbColor="#FFF"
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      </View>
      <View style={r.sliderRow}>
        <View style={[r.dot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <DiscreteSlider
            value={rule.value}
            min={rule.min}
            max={rule.max}
            step={rule.step}
            color={color}
            onChange={(v) => onChange({ value: v })}
          />
        </View>
        <Text style={[r.valueLabel, { color }]}>{formatValue(rule.value, rule.unit)}</Text>
      </View>
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon, title, badge, badgeColor, badgeBg, rules, color, onChangeRule,
}: {
  icon: string; title: string; badge: string;
  badgeColor: string; badgeBg: string;
  rules: AlertRule[]; color: string;
  onChangeRule: (id: string, patch: Partial<AlertRule>) => void;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Text style={sc.icon}>{icon}</Text>
        <Text style={[sc.title, { color }]}>{title}</Text>
        <View style={[sc.badge, { backgroundColor: badgeBg }]}>
          <Text style={[sc.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      </View>
      {rules.map((rule, i) => (
        <View key={rule.id}>
          {i > 0 && <View style={sc.divider} />}
          <AlertRuleRow
            rule={rule}
            color={color}
            onChange={(patch) => onChangeRule(rule.id, patch)}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Recipient Selector ───────────────────────────────────────────────────────

interface RecipientOption {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
}

const RECIPIENT_OPTIONS: RecipientOption[] = [
  { id: 'PROFESSIONAL_CAREGIVER', label: 'Professional Caregiver', subtitle: 'Licensed care provider', emoji: '👨‍⚕️' },
  { id: 'FAMILY_OBSERVER', label: 'Family Observer', subtitle: 'Family member with view access', emoji: '👨‍👩‍👧' },
  { id: 'FRIEND_NEIGHBOR', label: 'Friend / Neighbor', subtitle: 'Trusted community contact', emoji: '🤝' },
  { id: 'EMERGENCY_CONTACT', label: 'Emergency Contact', subtitle: 'First responder contact', emoji: '🚨' },
  { id: 'OTHER', label: 'Other', subtitle: 'Any other designated recipient', emoji: '👤' },
];

function MultiRecipientSelector({
  label,
  color,
  selected,
  onChange,
}: {
  label: string;
  color: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setOpen(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectedLabels = RECIPIENT_OPTIONS.filter((o) => selected.includes(o.id)).map((o) => o.label);

  return (
    <>
      <TouchableOpacity style={ms.trigger} onPress={openSheet} activeOpacity={0.75}>
        {selectedLabels.length === 0 ? (
          <Text style={ms.placeholder}>Select caregiver(s)</Text>
        ) : (
          <View style={ms.chipWrap}>
            {selectedLabels.map((lbl) => (
              <View key={lbl} style={[ms.chip, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                <Text style={[ms.chipText, { color }]}>{lbl}</Text>
              </View>
            ))}
          </View>
        )}
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet}>
        <Animated.View style={[ms.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <Animated.View style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={ms.sheetHandle} />
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>Select Caregivers</Text>
              <TouchableOpacity onPress={closeSheet} style={ms.closeBtn}>
                <Text style={ms.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={ms.sheetSub}>{label}</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {RECIPIENT_OPTIONS.map((opt, i) => {
                const checked = selected.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[ms.optRow, i < RECIPIENT_OPTIONS.length - 1 && ms.optBorder]}
                    onPress={() => toggle(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={ms.optEmoji}>{opt.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={ms.optLabel}>{opt.label}</Text>
                      <Text style={ms.optSub}>{opt.subtitle}</Text>
                    </View>
                    <View style={[ms.checkbox, checked && { backgroundColor: color, borderColor: color }]}>
                      {checked && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[ms.doneBtn, { backgroundColor: color }]} onPress={closeSheet} activeOpacity={0.85}>
              <Text style={ms.doneBtnText}>Done{selected.length > 0 ? ` (${selected.length})` : ''}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DEFAULT_RED: AlertRule[] = [
  { id: 'missed_med_critical', label: 'Missed Medication (Critical)', enabled: true, value: 15, unit: 'min', min: 5, max: 60, step: 5 },
  { id: 'no_response_checkin', label: 'No Response to Check-in', enabled: true, value: 60, unit: 'min', min: 15, max: 120, step: 15 },
  { id: 'multiple_missed_tasks', label: 'Multiple Missed Tasks (2+)', enabled: true, value: 3, unit: 'tasks', min: 2, max: 10, step: 1 },
];

const DEFAULT_YELLOW: AlertRule[] = [
  { id: 'missed_task', label: 'Missed Task', enabled: true, value: 15, unit: 'min', min: 5, max: 60, step: 5 },
  { id: 'delayed_medication', label: 'Delayed Medication', enabled: true, value: 30, unit: 'min', min: 10, max: 90, step: 10 },
  { id: 'skipped_checkin', label: 'Skipped Check-in', enabled: false, value: 2, unit: 'h', min: 1, max: 12, step: 1 },
];

export default function AlertsSafetyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { receiverName } = useLocalSearchParams<{ receiverName?: string }>();

  const [redRules, setRedRules] = useState<AlertRule[]>(DEFAULT_RED);
  const [yellowRules, setYellowRules] = useState<AlertRule[]>(DEFAULT_YELLOW);
  const [yellowRecipients, setYellowRecipients] = useState<string[]>([]);
  const [redRecipients, setRedRecipients] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const patchRule = (
    setter: React.Dispatch<React.SetStateAction<AlertRule[]>>,
    id: string,
    patch: Partial<AlertRule>
  ) => {
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    Alert.alert('Saved', 'Alert configuration updated.');
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.push('/(app)/carecircle')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Alerts and Safety</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page title */}
        <View style={s.pageTitle}>
          <Text style={s.pageTitleText}>Alert Configuration</Text>
          <Text style={s.pageTitleSub}>
            Customize what triggers alerts and who gets notified
            {receiverName ? ` for ${receiverName}` : ''}
          </Text>
        </View>

        {/* Red Alert */}
        <SectionCard
          icon="🔴"
          title="Red Alert"
          badge="URGENT"
          badgeColor="#E53935"
          badgeBg="#FEE2E2"
          rules={redRules}
          color="#E53935"
          onChangeRule={(id, patch) => patchRule(setRedRules, id, patch)}
        />

        {/* Yellow Alert */}
        <SectionCard
          icon="⚠️"
          title="Yellow Alert"
          badge="WARNING"
          badgeColor="#D97706"
          badgeBg="#FEF3C7"
          rules={yellowRules}
          color="#F6A623"
          onChangeRule={(id, patch) => patchRule(setYellowRules, id, patch)}
        />

        {/* Alert Recipients */}
        <View style={s.recipientsCard}>
          <Text style={s.recipientsTitle}>Alert Recipients</Text>

          <Text style={s.recipientLabel}>Yellow Alert Levels</Text>
          <MultiRecipientSelector
            label="Who receives Yellow Alerts"
            color="#F6A623"
            selected={yellowRecipients}
            onChange={setYellowRecipients}
          />

          <Text style={[s.recipientLabel, { marginTop: 16 }]}>Red Alert Levels</Text>
          <MultiRecipientSelector
            label="Who receives Red Alerts"
            color="#E53935"
            selected={redRecipients}
            onChange={setRedRecipients}
          />
        </View>

        {/* Bottom actions — inline, end of scroll */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/carecircle')} activeOpacity={0.7}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'left', fontSize: 17, fontFamily: F.m.bold, color: '#111' },

  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },

  pageTitle: { paddingHorizontal: 4, marginBottom: 4 },
  pageTitleText: { fontSize: 24, fontFamily: F.m.xBold, color: '#111', marginBottom: 6 },
  pageTitleSub: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19 },

  recipientsCard: {
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 20,
  },
  recipientsTitle: { fontSize: 20, fontFamily: F.m.xBold, color: '#111', marginBottom: 20 },
  recipientLabel: { fontSize: 13, fontFamily: F.m.semiBold, color: '#374151', marginBottom: 8 },
  recipientInput: {
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, fontFamily: F.i.regular, color: '#333',
    borderWidth: 1, borderColor: '#F3F4F6',
  },

  actions: {
    paddingHorizontal: 4, paddingTop: 8, gap: 10,
  },
  saveBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  cancelText: { fontSize: 15, fontFamily: F.m.medium, color: '#374151', textAlign: 'center', paddingVertical: 4 },
});

const sc = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  icon: { fontSize: 20 },
  title: { flex: 1, fontSize: 18, fontFamily: F.m.bold },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: F.m.bold, letterSpacing: 0.4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
});

const r = StyleSheet.create({
  wrap: { paddingVertical: 8, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, fontFamily: F.m.medium, color: '#111', flex: 1 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  valueLabel: { fontSize: 12, fontFamily: F.m.bold, minWidth: 48, textAlign: 'right' },
});

const sl = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    justifyContent: 'center',
    marginVertical: 8,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    top: -7,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

const ms = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 48,
  },
  placeholder: { flex: 1, fontSize: 14, fontFamily: F.i.regular, color: '#C4B5A5' },
  chipWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: F.m.semiBold },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontFamily: F.m.xBold, color: '#111' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 13, color: '#374151', fontFamily: F.m.semiBold },
  sheetSub: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 16 },

  optRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  optBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  optLabel: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111', marginBottom: 2 },
  optSub: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },

  doneBtn: {
    marginTop: 20, borderRadius: 50,
    paddingVertical: 15, alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
});
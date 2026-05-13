import { burnoutApi, WellnessPopupType } from '@/lib/api/burnout';
import { F } from '@/lib/fonts';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PopupAction {
  label: string;
  response: string;
  primary?: boolean;
}

type PopupVariant = 'default' | 'emoji_mood';

interface PopupDef {
  badge?: string;
  badgeColor?: string;
  icon?: string;          // emoji character shown in a colored circle
  iconBg?: string;
  title: string;          // supports {{firstName}} placeholder
  subtitle?: string;
  variant?: PopupVariant;
  actions: PopupAction[];
  gridOptions?: string[]; // for SLEEP_QUALITY text grid
}

// ─── Popup definitions ────────────────────────────────────────────────────────

const POPUP_DEFS: Record<WellnessPopupType, PopupDef> = {
  // ── Caregiver popups ────────────────────────────────────────────────────────
  MOOD_CHECK: {
    title: 'How have you been feeling lately?',
    subtitle: 'Check in with yourself — it only takes a second.',
    actions: [
      { label: 'Doing okay',        response: 'DOING_OKAY',  primary: true },
      { label: 'A bit overwhelmed', response: 'OVERWHELMED', primary: true },
      { label: 'Stressed',          response: 'STRESSED',    primary: true },
    ],
  },
  AFFIRMATION: {
    badge: 'AFFIRMATION',
    badgeColor: '#7C3AED',
    title: 'You are a Hero.',
    subtitle:
      'Caring for someone is one of the most selfless things a person can do. You show up, every day, and that matters more than you know.',
    actions: [{ label: 'I Needed That', response: 'ACKNOWLEDGED', primary: true }],
  },
  SLEEP_QUALITY: {
    badge: 'SLEEP QUALITY CHECK',
    badgeColor: '#1D4ED8',
    title: 'A Moment for You',
    subtitle: 'How did you sleep last night?',
    gridOptions: ['Restless', 'Okay', 'Good', 'Deep Sleep'],
    actions: [{ label: 'Log Sleep', response: 'LOGGED', primary: true }],
  },
  WELLNESS_CHECK_IN: {
    badge: 'WELLNESS CHECK IN',
    badgeColor: '#047857',
    title: 'Maybe check in with someone you like today',
    subtitle: 'Connection is medicine. A quick message or call can lift both of you.',
    actions: [
      { label: 'I did',  response: 'DID_IT',  primary: true },
      { label: 'I will', response: 'WILL_DO', primary: true },
    ],
  },
  OUTDOOR_EXPOSURE: {
    badge: 'OUTDOOR EXPOSURE',
    badgeColor: '#D97706',
    title: 'Time for a Breather',
    subtitle: 'Even five minutes outside can reset your nervous system and improve your mood.',
    actions: [
      { label: 'I went outside', response: 'DID_GO_OUT',  primary: true },
      { label: 'Later today',    response: 'WILL_GO_OUT', primary: false },
    ],
  },
  HYDRATION: {
    badge: 'HYDRATION',
    badgeColor: '#0284C7',
    title: 'Have you had water in the last hour?',
    subtitle: 'Caregivers often forget to hydrate. Your body (and your patients) need you at your best.',
    actions: [
      { label: 'Drank some',     response: 'DRANK',       primary: true },
      { label: "I'll do it now", response: 'WILL_DRINK',  primary: false },
    ],
  },

  // ── Care receiver popups ────────────────────────────────────────────────────
  CR_MOOD_CHECK: {
    badge: 'WELLNESS CHECK IN',
    badgeColor: '#E53935',
    title: 'How are you feeling, {{firstName}}?',
    subtitle: 'Your care circle is here to support you today.',
    variant: 'emoji_mood',
    actions: [{ label: 'Got it', response: 'LOGGED', primary: true }],
  },
  CR_WELLNESS_CHECK_IN: {
    badge: 'WELLNESS CHECK IN',
    badgeColor: '#E53935',
    icon: '❤️',
    iconBg: '#FEE2E2',
    title: 'Hi {{firstName}}, just checking in',
    subtitle: 'How are you feeling right now?',
    actions: [
      { label: "I'm okay",   response: 'IM_OKAY',    primary: false },
      { label: 'I need help', response: 'NEED_HELP', primary: true },
    ],
  },
  CR_HYDRATION: {
    badge: 'HYDRATION',
    badgeColor: '#0284C7',
    icon: '💧',
    iconBg: '#DBEAFE',
    title: 'Have you had water in the last hour?',
    subtitle: 'Maintaining fluid balance supports cognitive clarity and physical resilience throughout your day.',
    actions: [
      { label: 'Drank some',     response: 'DRANK',      primary: true },
      { label: "I'll do it now", response: 'WILL_DRINK', primary: false },
    ],
  },
  CR_OUTDOOR_EXPOSURE: {
    badge: 'OUTDOOR EXPOSURE',
    badgeColor: '#D97706',
    icon: '☀️',
    iconBg: '#FEF3C7',
    title: 'Time for a Breather',
    subtitle: 'A little fresh air could lift your mood ☀️\nWant to step outside?',
    actions: [
      { label: 'I went outside', response: 'DID_GO_OUT',  primary: true },
      { label: 'Later today',    response: 'WILL_GO_OUT', primary: false },
    ],
  },
  CR_GENTLE_CHANGE: {
    icon: '☀️',
    iconBg: '#FEE2E2',
    title: 'A Gentle Change',
    subtitle: "Don't forget to take care of yourself today. Small moments of rest make a big difference.",
    actions: [{ label: 'Got it', response: 'ACKNOWLEDGED', primary: true }],
  },
};

// ─── Emoji mood row ───────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { emoji: '😞', label: 'NOT\nGREAT', response: 'NOT_GREAT' },
  { emoji: '😟', label: 'OKAY',       response: 'OKAY' },
  { emoji: '🙂', label: 'GOOD',       response: 'GOOD' },
  { emoji: '😄', label: 'GREAT',      response: 'GREAT' },
  { emoji: '🎉', label: 'AMAZING',    response: 'AMAZING' },
];

function EmojiMoodRow({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (r: string) => void;
}) {
  return (
    <View style={em.row}>
      {MOOD_OPTIONS.map((opt) => {
        const isSelected = selected === opt.response;
        return (
          <TouchableOpacity
            key={opt.response}
            style={[em.cell, isSelected && em.cellSelected]}
            onPress={() => onSelect(opt.response)}
            activeOpacity={0.75}
          >
            <Text style={em.emoji}>{opt.emoji}</Text>
            <Text style={[em.label, isSelected && em.labelSelected]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const em = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  cell: {
    alignItems: 'center',
    width: 54,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#F3F4F6',
  },
  cellSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#E53935',
  },
  emoji: { fontSize: 26, marginBottom: 4 },
  label: {
    fontSize: 9,
    fontFamily: F.m.bold,
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  labelSelected: { color: '#E53935' },
});

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  popupType: WellnessPopupType;
  firstName?: string;
  isCareReceiver?: boolean;
  onDismiss: () => void;
}

export default function WellnessPopup({ popupType, firstName = '', isCareReceiver = false, onDismiss }: Props) {
  const def = POPUP_DEFS[popupType];
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [selectedGrid, setSelectedGrid] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useEffect(() => {
    if (!def) return;
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!def) return null;

  const resolvedTitle = firstName
    ? def.title.replace('{{firstName}}', firstName)
    : def.title.replace(' {{firstName}}', '').replace('{{firstName}}', '');

  const animateOut = (cb: () => void) => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(cb);
  };

  const logAndDismiss = async (response: string, snoozed = false) => {
    try {
      const logFn = isCareReceiver
        ? burnoutApi.logCareReceiverWellnessResponse
        : burnoutApi.logWellnessResponse;
      await logFn({ popupType, response, snoozed });
    } catch { /* silent */ }
    animateOut(onDismiss);
  };

  const handleAction = (action: PopupAction) => {
    let response = action.response;
    if (def.variant === 'emoji_mood' && selectedMood) response = `${response}:${selectedMood}`;
    if (def.gridOptions && selectedGrid) response = `${response}:${selectedGrid}`;
    logAndDismiss(response);
  };

  const handleSnooze = () => logAndDismiss('SNOOZED', true);

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleSnooze}>
      <TouchableWithoutFeedback onPress={handleSnooze}>
        <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>

              {/* Badge */}
              {def.badge && (
                <View style={[s.badge, { backgroundColor: (def.badgeColor ?? '#E53935') + '18' }]}>
                  <Text style={[s.badgeText, { color: def.badgeColor ?? '#E53935' }]}>{def.badge}</Text>
                </View>
              )}

              {/* Icon circle */}
              {def.icon && (
                <View style={[s.iconCircle, { backgroundColor: def.iconBg ?? '#FEE2E2' }]}>
                  <Text style={s.iconEmoji}>{def.icon}</Text>
                </View>
              )}

              {/* Title */}
              <Text style={s.title}>{resolvedTitle}</Text>

              {/* Subtitle */}
              {def.subtitle && <Text style={s.subtitle}>{def.subtitle}</Text>}

              {/* Emoji mood row */}
              {def.variant === 'emoji_mood' && (
                <EmojiMoodRow selected={selectedMood} onSelect={setSelectedMood} />
              )}

              {/* Text grid (sleep quality) */}
              {def.gridOptions && (
                <View style={s.grid}>
                  {def.gridOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.gridCell, selectedGrid === opt && s.gridCellSelected]}
                      onPress={() => setSelectedGrid(opt)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.gridCellText, selectedGrid === opt && s.gridCellTextSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Action buttons */}
              <View style={s.actions}>
                {def.actions.map((action) => (
                  <TouchableOpacity
                    key={action.response}
                    style={[s.actionBtn, action.primary ? s.actionBtnPrimary : s.actionBtnSecondary]}
                    onPress={() => handleAction(action)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.actionBtnText, action.primary ? s.actionBtnTextPrimary : s.actionBtnTextSecondary]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Remind me later */}
              <TouchableOpacity style={s.snoozeBtn} onPress={handleSnooze} activeOpacity={0.7}>
                <Text style={s.snoozeBtnText}>Remind me later</Text>
              </TouchableOpacity>

            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: F.m.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  iconEmoji: { fontSize: 28 },

  title: {
    fontSize: 22,
    fontFamily: F.m.xBold,
    color: '#111827',
    lineHeight: 30,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  gridCell: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  gridCellSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#E53935',
  },
  gridCellText: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#374151',
  },
  gridCellTextSelected: { color: '#E53935' },

  actions: { gap: 10, marginBottom: 12 },
  actionBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary:  { backgroundColor: '#E53935' },
  actionBtnSecondary: { backgroundColor: '#F3F4F6' },
  actionBtnText: { fontSize: 15, fontFamily: F.m.bold },
  actionBtnTextPrimary:  { color: '#FFFFFF' },
  actionBtnTextSecondary: { color: '#374151' },

  snoozeBtn: { alignItems: 'center', paddingVertical: 10 },
  snoozeBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#9CA3AF' },
});

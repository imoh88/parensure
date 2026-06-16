import { alertApi } from '@/lib/api/alert';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { Alert, AlertType } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case 'SOS_TRIGGERED': return 'SOS Triggered';
    case 'FALL_DETECTED': return 'Fall Detected';
    case 'MISSED_MEDICATION': return 'Missed Medication';
    case 'LOW_ACTIVITY': return 'Low Activity';
    case 'UPCOMING_MEDICATION': return 'Upcoming Medication';
  }
}

function severityLabel(a: Alert) {
  return a.severity === 'CRITICAL' ? 'HIGH PRIORITY' : 'ATTENTION NEEDED';
}

function severityColor(a: Alert) {
  return a.severity === 'CRITICAL' ? '#E53935' : '#F6A623';
}

function alertIcon(type: AlertType): string {
  switch (type) {
    case 'SOS_TRIGGERED': return 'warning';
    case 'FALL_DETECTED': return 'body';
    case 'MISSED_MEDICATION': return 'medical';
    case 'LOW_ACTIVITY': return 'walk';
    case 'UPCOMING_MEDICATION': return 'time';
  }
}

function alertBg(type: AlertType) {
  switch (type) {
    case 'SOS_TRIGGERED':
    case 'FALL_DETECTED':
    case 'MISSED_MEDICATION':
      return '#FEF2F2';
    default:
      return '#FFF8E7';
  }
}

function alertIconBg(type: AlertType) {
  switch (type) {
    case 'SOS_TRIGGERED':
    case 'FALL_DETECTED':
    case 'MISSED_MEDICATION':
      return '#FECACA';
    default:
      return '#FFE0B2';
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({
  time, title, body, isCurrent, isLast,
}: { time: string; title: string; body: string; isCurrent?: boolean; isLast?: boolean }) {
  return (
    <View style={tl.row}>
      <View style={tl.dotCol}>
        <View style={[tl.dot, isCurrent && tl.dotActive]} />
        {!isLast && <View style={tl.line} />}
      </View>
      <View style={tl.text}>
        <Text style={[tl.time, isCurrent && tl.timeCurrent]}>{time}</Text>
        <Text style={tl.title}>{title}</Text>
        <Text style={tl.body}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AlertDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    alertApi.getAll().then((res) => {
      const found = (res.data ?? []).find((a) => a.id === id);
      setAlert(found ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleMessage = async () => {
    if (!alert) return;
    const userId = alert.careReceiver?.userId;
    const name = alert.careReceiver?.user?.fullName ?? 'Care Receiver';
    if (!userId) return;
    setActionLoading(true);
    try {
      const res = await chatApi.getOrCreateConversation(userId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/alert-detail' },
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!alert) return;
    setActionLoading(true);
    try {
      const res = await alertApi.resolve(alert.id);
      if (res.data) setAlert(res.data);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }, s.center]}>
        <ActivityIndicator color="#E53935" />
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }, s.center]}>
        <Text style={s.notFound}>Alert not found.</Text>
      </View>
    );
  }

  const receiverName = alert.careReceiver?.user?.fullName ?? 'Care Receiver';
  const profileImageKey = alert.careReceiver?.user?.profileImageKey;
  const isResolved = alert.status === 'RESOLVED';
  const isCheckedIn = alert.status === 'CHECKED_IN';
  const sc = severityColor(alert);

  // Build timeline events from status
  const timelineItems: { time: string; title: string; body: string }[] = [];
  if (isResolved || isCheckedIn) {
    timelineItems.push({
      time: `${formatTime(alert.updatedAt)} (CURRENT)`,
      title: isResolved ? 'Alert Resolved' : 'Alert Escalated to Care Circle',
      body: isResolved
        ? 'Alert has been marked as resolved.'
        : 'System triggered notification to primary contacts due to non-response.',
    });
  }
  timelineItems.push({
    time: formatTime(alert.createdAt),
    title: 'Dose Scheduled',
    body: `${alertTypeLabel(alert.type)} registered in calendar.`,
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.push('/(app)/alerts')} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#E53935" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Alert Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: isResolved ? insets.bottom + 24 : 160 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar + identity */}
          <View style={s.profileSection}>
            <View style={[s.avatarRing, { borderColor: sc }]}>
              {profileImageKey ? (
                <Image source={{ uri: profileImageKey }} style={s.avatarImg} />
              ) : (
                <View style={[s.avatarImg, s.avatarPlaceholder]}>
                  <Ionicons name="person" size={38} color="#ccc" />
                </View>
              )}
            </View>
            <Text style={[s.severityBadge, { color: sc }]}>{severityLabel(alert)}</Text>
            <Text style={s.receiverName}>{receiverName}</Text>
            <Text style={s.receiverAge}>
              <Text style={{ color: sc }}>(Care Receiver)</Text>
            </Text>
            <View style={s.lastCheckin}>
              <Ionicons name="time-outline" size={13} color="#9CA3AF" />
              <Text style={s.lastCheckinText}>Last check-in: {timeAgo(alert.updatedAt)}</Text>
            </View>
          </View>

          {/* Alert card */}
          <View style={[s.alertCard, { backgroundColor: alertBg(alert.type) }]}>
            <View style={[s.alertIconWrap, { backgroundColor: alertIconBg(alert.type) }]}>
              <Ionicons name={alertIcon(alert.type) as any} size={22} color={sc} />
            </View>
            <Text style={s.alertCardTitle}>{alertTypeLabel(alert.type)}</Text>
            <Text style={s.alertCardBody}>{alert.message}</Text>
            <View style={s.alertTags}>
              <View style={s.tag}>
                <Text style={s.tagText}>{alert.severity === 'CRITICAL' ? 'Critical Cycle' : 'Attention Cycle'}</Text>
              </View>
              <View style={s.tag}>
                <Text style={s.tagText}>{formatTime(alert.createdAt)} Schedule</Text>
              </View>
            </View>
          </View>

          {/* Incident Timeline */}
          <View style={s.timelineSection}>
            <View style={s.timelineHeader}>
              <Ionicons name="time-outline" size={18} color="#E53935" />
              <Text style={s.timelineTitle}>Incident Timeline</Text>
            </View>
            {timelineItems.map((item, i) => (
              <TimelineItem
                key={i}
                time={item.time}
                title={item.title}
                body={item.body}
                isCurrent={i === 0}
                isLast={i === timelineItems.length - 1}
              />
            ))}
          </View>

          {/* Message input */}
          {!isResolved && (
            <View style={s.messageSection}>
              <Text style={s.messageLabel}>Message <Text style={s.messageOptional}>(Optional)</Text></Text>
              <TextInput
                style={s.messageInput}
                placeholder="Type a message to the care team..."
                placeholderTextColor="#C4B5A5"
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom actions */}
        {!isResolved && (
          <View style={[s.actions, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={s.btnCheckIn}
              onPress={handleMessage}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnCheckInText}>Message</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnResolve}
              onPress={handleResolve}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <Text style={s.btnResolveText}>Resolved</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, fontFamily: F.i.regular, color: '#888' },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'left', fontSize: 17, fontFamily: F.m.bold, color: '#111' },

  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },

  // ── Profile ──
  profileSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, overflow: 'hidden', marginBottom: 12,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  severityBadge: { fontSize: 12, fontFamily: F.m.bold, letterSpacing: 1, marginBottom: 6 },
  receiverName: { fontSize: 22, fontFamily: F.m.xBold, color: '#111', marginBottom: 4 },
  receiverAge: { fontSize: 15, fontFamily: F.i.regular, color: '#555', marginBottom: 6 },
  lastCheckin: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lastCheckinText: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },

  // ── Alert card ──
  alertCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  alertIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  alertCardTitle: { fontSize: 22, fontFamily: F.m.xBold, color: '#111', textAlign: 'center' },
  alertCardBody: { fontSize: 14, fontFamily: F.i.regular, color: '#555', textAlign: 'center', lineHeight: 21 },
  alertTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  tag: {
    backgroundColor: '#FFF', borderRadius: 50,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  tagText: { fontSize: 13, fontFamily: F.m.medium, color: '#333' },

  // ── Timeline ──
  timelineSection: { gap: 4 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  timelineTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },

  // ── Message ──
  messageSection: { gap: 8 },
  messageLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  messageOptional: { fontFamily: F.i.regular, color: '#9CA3AF' },
  messageInput: {
    backgroundColor: '#FFF8F0', borderRadius: 16,
    padding: 16, minHeight: 120,
    fontSize: 14, fontFamily: F.i.regular, color: '#333',
  },

  // ── Actions ──
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  btnCheckIn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
  },
  btnCheckInText: { fontSize: 16, fontFamily: F.m.bold, color: '#fff' },
  btnResolve: {
    borderWidth: 1.5, borderColor: '#E53935', borderRadius: 50,
    paddingVertical: 15, alignItems: 'center',
  },
  btnResolveText: { fontSize: 16, fontFamily: F.m.bold, color: '#E53935' },
});

const tl = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  dotCol: { alignItems: 'center', width: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB', marginTop: 3 },
  dotActive: { backgroundColor: '#E53935' },
  line: { flex: 1, width: 2, backgroundColor: '#E5E7EB', marginTop: 4 },
  text: { flex: 1, paddingBottom: 20 },
  time: { fontSize: 11, fontFamily: F.m.semiBold, color: '#9CA3AF', marginBottom: 3, textTransform: 'uppercase' },
  timeCurrent: { color: '#E53935' },
  title: { fontSize: 14, fontFamily: F.m.bold, color: '#111', marginBottom: 4 },
  body: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19 },
});

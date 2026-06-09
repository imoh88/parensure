import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useCareReceiverDashboardStore } from '@/lib/store/careReceiverDashboardStore';
import { useCaregiverDashboardStore } from '@/lib/store/caregiverDashboardStore';
import { medicationCache } from '@/lib/utils/medicationCache';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return Infinity;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  const p = match[3]!.toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function earliestTime(times: string[]): string {
  if (times.length === 0) return '';
  return times.reduce((best, cur) =>
    parseTimeToMinutes(cur) < parseTimeToMinutes(best) ? cur : best
  );
}

function minutesUntil(timeStr: string): string | null {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1]!, 10); 
  const m = parseInt(match[2]!, 10);
  const p = match[3]!.toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Now';
  if (diff < 60) return `In ${diff} minute${diff === 1 ? '' : 's'}`;
  const hrs = Math.floor(diff / 60);
  return `In ${hrs} hour${hrs === 1 ? '' : 's'}`;
}

function formatLogTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

const SKIP_REASONS = ['Patient refused', 'Not at home', 'Already taken', 'Other'];

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function MedicationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const med = medicationCache.get() as any;
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(false);
  const invalidateCareReceiver = useCareReceiverDashboardStore((s) => s.invalidate);
  const invalidateCaregiver = useCaregiverDashboardStore((s) => s.invalidate);
  const [done, setDone] = useState(med?.status === 'COMPLETED');
  const [missed, setMissed] = useState(med?.status === 'MISSED' || med?.status === 'CANCELLED');
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [skipNote, setSkipNote] = useState('');
  const [privateNote, setPrivateNote] = useState('');

  if (!med) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.center}>
          <Text style={s.errorText}>Medication not found.</Text>
        </View>
      </View>
    );
  }

  const medId = med._id ?? med.id;
  const timeLabel = earliestTime(med.scheduledTimes ?? []);
  const timeUntil = timeLabel ? minutesUntil(timeLabel) : null;
  const isOverdue = timeUntil === 'Overdue';

  const handleMarkComplete = async () => {
    if (done || missed) return;
    setMarking(true);
    try {
      await caregiverApi.updateTaskStatus(medId, 'COMPLETED');
      setDone(true);
      setShowSkip(false);
    } catch {
      Alert.alert('Error', 'Could not update medication status.');
    } finally {
      setMarking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              await caregiverApi.deleteTask(medId);
              invalidateCareReceiver();
              invalidateCaregiver();
              router.replace('/(app)');
            } catch {
              Alert.alert('Error', 'Could not delete medication. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleSkipConfirm = async () => {
    if (!skipReason) {
      Alert.alert('Select a reason', 'Please choose a reason for skipping.');
      return;
    }
    try {
      await caregiverApi.updateTaskStatus(medId, 'CANCELLED');
      setMissed(true);
      setShowSkip(false);
    } catch {
      Alert.alert('Error', 'Could not update medication status.');
    }
  };

  const statusColor = done ? '#10B981' : missed ? '#DC2626' : isOverdue ? '#F59E0B' : '#6B7280';
  const statusLabel = done ? 'COMPLETED' : missed ? 'MISSED' : isOverdue ? 'ATTENTION NEEDED' : 'NOT STARTED';
  const statusBg = done ? '#ECFDF5' : missed ? '#FEF2F2' : isOverdue ? '#FFFBEB' : '#F3F4F6';

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Medication</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={s.backBtn} onPress={handleDelete} activeOpacity={0.7} disabled={deleting}>
            <Ionicons name="trash-outline" size={22} color="#E53935" />
          </TouchableOpacity>
          <View style={s.userAvatar}>
            <Text style={s.userAvatarText}>
              {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 140 }]}
      >
        {/* Title + status */}
        <Text style={s.title}>{med.title}</Text>
        <View style={[s.statusChip, { backgroundColor: statusBg }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        {med.description ? (
          <Text style={s.subtitle}>{med.description}</Text>
        ) : null}

        {/* Next Dose */}
        {timeLabel ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Next Dose</Text>
            <View style={s.infoBox}>
              <Text style={s.infoMain}>Today, {timeLabel}</Text>
              {timeUntil ? (
                <Text style={[s.infoSub, isOverdue && { color: '#F59E0B' }]}>{timeUntil}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Frequency */}
        {med.frequency ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Frequency</Text>
            <View style={s.infoBox}>
              <Text style={s.infoMain}>
                {med.frequency === 'DAILY' ? 'Once daily' :
                 med.frequency === 'WEEKLY' ? 'Once weekly' :
                 med.frequency === 'CUSTOM' ? 'Custom' : med.frequency}
              </Text>
              {med.notes ? <Text style={s.infoSub}>{med.notes}</Text> : null}
            </View>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Instructions</Text>
            {!done && (
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={s.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.instructionsBox}>
            {med.subtasks && med.subtasks.length > 0 ? (
              med.subtasks.map((st: string, i: number) => (
                <Text key={i} style={s.instructionText}>• {st}</Text>
              ))
            ) : med.description ? (
              <Text style={s.instructionText}>{med.description}</Text>
            ) : (
              <Text style={[s.instructionText, { color: '#9CA3AF' }]}>No instructions added.</Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        {!done && !missed && (
          <View style={s.actionBtns}>
            <TouchableOpacity
              style={s.completeBtn}
              onPress={handleMarkComplete}
              disabled={marking}
              activeOpacity={0.85}
            >
              {marking ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.completeBtnText}>Mark as Completed</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.skipBtn}
              onPress={() => setShowSkip((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={s.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}
        {done && (
          <View style={[s.completedBadge, { marginBottom: 24 }]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={s.completedBadgeText}>Medication Taken</Text>
          </View>
        )}
        {missed && (
          <View style={[s.missedBadge, { marginBottom: 24 }]}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
            <Text style={s.missedBadgeText}>Medication Missed</Text>
          </View>
        )}

        {/* Skip reason panel */}
        {showSkip && (
          <View style={s.skipPanel}>
            <Text style={s.skipPanelTitle}>Reason for skipping?</Text>
            <View style={s.skipGrid}>
              {SKIP_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.skipChip, skipReason === r && s.skipChipActive]}
                  onPress={() => setSkipReason(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.skipChipText, skipReason === r && s.skipChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.skipInput}
              placeholder="Optional notes..."
              placeholderTextColor="#9CA3AF"
              value={skipNote}
              onChangeText={setSkipNote}
              multiline
            />
            <TouchableOpacity style={s.skipConfirmBtn} onPress={handleSkipConfirm} activeOpacity={0.8}>
              <Text style={s.skipConfirmText}>Confirm Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Private note */}
        <View style={s.noteRow}>
          <TextInput
            style={s.noteInput}
            placeholder="Add a private note..."
            placeholderTextColor="#9CA3AF"
            value={privateNote}
            onChangeText={setPrivateNote}
          />
          <TouchableOpacity style={s.noteSendBtn} activeOpacity={0.8}>
            <Ionicons name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Dose History */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="time-outline" size={18} color="#E53935" />
              <Text style={s.sectionTitle}>Dose History</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.editLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {done ? (
            <View style={s.logItem}>
              <View style={s.logDotCol}>
                <View style={s.logDot} />
              </View>
              <View style={s.logContent}>
                <Text style={s.logTime}>Just now</Text>
                <Text style={s.logBody}>
                  <Text style={s.logBold}>{user?.fullName?.split(' ')[0] ?? 'You'}</Text>
                  {' '}marked{' '}
                  <Text style={s.logBold}>{med.title}</Text> as taken.
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.logEmpty}>
              <Text style={s.logEmptyText}>No dose history yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', flex: 1, marginLeft: 4 },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 14, fontFamily: F.m.bold, color: '#FFF' },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginBottom: 10 },
  statusChip: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, marginBottom: 8,
  },
  statusText: { fontSize: 11, fontFamily: F.m.bold, letterSpacing: 0.5 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 20 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  editLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  infoBox: {
    backgroundColor: '#F5F5F7', borderRadius: 14, padding: 16, gap: 4,
  },
  infoMain: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  infoSub: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280' },

  instructionsBox: {
    backgroundColor: '#FFF8F0', borderRadius: 14, padding: 16, gap: 8,
  },
  instructionText: { fontSize: 14, fontFamily: F.i.regular, color: '#555', lineHeight: 21 },

  // Skip panel
  skipPanel: {
    backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16, marginBottom: 20, gap: 12,
  },
  skipPanelTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  skipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skipChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  skipChipActive: { borderColor: '#E53935', backgroundColor: '#FFF5F5' },
  skipChipText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#374151' },
  skipChipTextActive: { color: '#E53935' },
  skipInput: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 12,
    fontSize: 14, fontFamily: F.i.regular, color: '#111',
    borderWidth: 1, borderColor: '#E5E7EB', minHeight: 60,
  },
  skipConfirmBtn: {
    height: 44, borderRadius: 22, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  skipConfirmText: { fontSize: 14, fontFamily: F.m.bold, color: '#FFF' },

  // Private note
  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24,
  },
  noteInput: {
    flex: 1, height: 46, backgroundColor: '#F3F4F6', borderRadius: 23,
    paddingHorizontal: 16, fontSize: 14, fontFamily: F.i.regular, color: '#111',
  },
  noteSendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
  },

  // Dose history
  logItem: { flexDirection: 'row', gap: 12 },
  logDotCol: { alignItems: 'center', width: 14 },
  logDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#E53935', marginTop: 4, flexShrink: 0,
  },
  logContent: { flex: 1, paddingBottom: 16 },
  logTime: { fontSize: 12, fontFamily: F.m.semiBold, color: '#9CA3AF', marginBottom: 3 },
  logBody: { fontSize: 14, fontFamily: F.i.regular, color: '#374151', lineHeight: 20 },
  logBold: { fontFamily: F.m.bold, color: '#111' },
  logEmpty: { paddingVertical: 16, alignItems: 'center' },
  logEmptyText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' },

  // Footer
  actionBtns: { gap: 10, marginBottom: 24 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#FFF', gap: 10,
  },
  completeBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  completeBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
  skipBtn: {
    height: 50, borderRadius: 28, borderWidth: 1.5, borderColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#E53935' },
  completedBadge: {
    height: 56, borderRadius: 28, backgroundColor: '#ECFDF5',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#10B981',
  },
  completedBadgeText: { fontSize: 17, fontFamily: F.m.bold, color: '#10B981' },
  missedBadge: {
    height: 56, borderRadius: 28, backgroundColor: '#FEF2F2',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#DC2626',
  },
  missedBadgeText: { fontSize: 17, fontFamily: F.m.bold, color: '#DC2626' },
});

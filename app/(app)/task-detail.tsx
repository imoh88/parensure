import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useCareReceiverDashboardStore } from '@/lib/store/careReceiverDashboardStore';
import { useCaregiverDashboardStore } from '@/lib/store/caregiverDashboardStore';
import { taskCache } from '@/lib/utils/taskCache';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusKey = 'ATTENTION_NEEDED' | 'NOT_STARTED' | 'COMPLETED';

const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string }> = {
  ATTENTION_NEEDED: { label: 'ATTENTION NEEDED', color: '#F59E0B', bg: '#FFFBEB' },
  NOT_STARTED:      { label: 'NOT STARTED',      color: '#6B7280', bg: '#F3F4F6' },
  COMPLETED:        { label: 'COMPLETED',         color: '#10B981', bg: '#ECFDF5' },
};

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

function taskStatus(item: any): StatusKey {
  if (item.status === 'COMPLETED' || item.completed === true) return 'COMPLETED';
  if (item.priority === 'HIGH' || item.status === 'OVERDUE') return 'ATTENTION_NEEDED';
  return 'NOT_STARTED';
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

function formatLogTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { user } = useAuthStore();

  const task = taskCache.get() as any;
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(
    task?.status === 'COMPLETED' || task?.completed === true
  );

  const attachmentKeys: string[] = task?.attachments ?? [];
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (attachmentKeys.length === 0) return;
    setLoadingAttachments(true);
    Promise.all(
      attachmentKeys.map(async (key: string) => {
        const res = await caregiverApi.getTaskAttachmentUrl(key);
        return { key, url: res.data.url };
      })
    )
      .then((results) => {
        const map: Record<string, string> = {};
        results.forEach(({ key, url }: { key: string; url: string }) => {
          map[key] = url;
        });
        setAttachmentUrls(map);
      })
      .catch(() => {})
      .finally(() => setLoadingAttachments(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.center}>
          <Text style={s.errorText}>Task not found.</Text>
        </View>
      </View>
    );
  }

  const sk = done ? 'COMPLETED' : taskStatus(task);
  const meta = STATUS_META[sk]!;
  const resolvedTaskId = task._id ?? task.id;
  const timeLabel = earliestTime(task.scheduledTimes ?? []);
  const dueDate = task.endDate ?? task.startDate;
  const assignedName = task.createdByUser?.fullName ?? null;
  const assignedInitial = assignedName ? assignedName.charAt(0).toUpperCase() : null;

  // Care receiver info for the top-right avatar
  const receiverName =
    task.careReceiver?.user?.fullName ??
    task.careReceiver?.fullName ??
    null;
  const receiverImage =
    task.careReceiver?.user?.profileImageKey ??
    task.careReceiver?.profileImageKey ??
    null;
  const receiverInitial = receiverName
    ? receiverName.charAt(0).toUpperCase()
    : (user?.fullName ?? 'U').charAt(0).toUpperCase();

  const handleMarkComplete = async () => {
    if (done) return;
    setMarking(true);
    try {
      await caregiverApi.updateTaskStatus(resolvedTaskId, 'COMPLETED');
      setDone(true);
    } catch {
      Alert.alert('Error', 'Could not update task status.');
    } finally {
      setMarking(false);
    }
  };

  const invalidateCareReceiver = useCareReceiverDashboardStore((s) => s.invalidate);
  const invalidateCaregiver = useCaregiverDashboardStore((s) => s.invalidate);

  const handleEdit = () => {
    router.push({ pathname: '/(app)/add-task', params: { taskId: taskId ?? '', from: '/(app)/task-detail' } });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await caregiverApi.deleteTask(resolvedTaskId);
              invalidateCareReceiver();
              invalidateCaregiver();
              router.replace('/(app)');
            } catch {
              Alert.alert('Error', 'Could not delete task. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Build activity log entries
  const activityLog: { time: string; body: React.ReactNode }[] = [];
  if (done) {
    activityLog.push({
      time: 'Just now',
      body: (
        <Text style={s.logBody}>
          {user?.fullName?.split(' ')[0] ?? 'You'} marked{' '}
          <Text style={s.logBold}>{task.title}</Text> as complete.
        </Text>
      ),
    });
  }
  activityLog.push({
    time: formatLogTime(task.createdAt),
    body: <Text style={s.logBody}>Task was opened by {user?.fullName?.split(' ')[0] ?? 'you'}.</Text>,
  });

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tasks</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={handleDelete} disabled={deleting} style={s.menuBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#E53935" />
          </TouchableOpacity>
          <View style={s.userAvatar}>
            {receiverImage ? (
              <Image source={{ uri: receiverImage }} style={s.userAvatarImg} />
            ) : (
              <Text style={s.userAvatarText}>{receiverInitial}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 120 }]}
      >
        {/* Title */}
        <Text style={[s.title, done && s.titleDone]}>{task.title}</Text>

        {/* Status badge */}
        <View style={[s.statusChip, { backgroundColor: meta.bg }]}>
          <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {/* Description + edit pencil */}
        <View style={s.descWrap}>
          {task.description ? (
            <Text style={s.description}>{task.description}</Text>
          ) : (
            <Text style={s.descriptionEmpty}>No description provided.</Text>
          )}
          {!done && (
            // <TouchableOpacity style={s.pencilBtn} onPress={handleEdit} activeOpacity={0.7}>
            //   <Ionicons name="pencil" size={16} color="#E53935" />
            // </TouchableOpacity>
            <TouchableOpacity style={s.pencilBtn} onPress={handleEdit} activeOpacity={0.7}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Due Date + Assigned row */}
        <View style={s.infoRow}>
          {/* Due Date card */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="calendar-outline" size={18} color="#E53935" />
            </View>
            <Text style={s.infoLabel}>DUE DATE</Text>
            <Text style={s.infoDate}>{dueDate ? formatDate(dueDate) : '—'}</Text>
            {timeLabel ? <Text style={s.infoTime}>{timeLabel}</Text> : null}
          </View>

          {/* Assigned card */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#E53935" />
            </View>
            <Text style={s.infoLabel}>ASSIGNEE</Text>
            {assignedName ? (
              <View style={s.assignedRow}>
                <View style={s.assignedAvatar}>
                  <Text style={s.assignedAvatarText}>{assignedInitial}</Text>
                </View>
                <Text style={s.assignedName}>{assignedName}</Text>
              </View>
            ) : (
              <Text style={s.infoDate}>Unassigned</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Instructions</Text>
          </View>
          <View style={s.instructionsBox}>
            {task.subtasks && task.subtasks.length > 0 ? (
              task.subtasks.map((st: string, i: number) => (
                <Text key={i} style={s.instructionText}>• {st}</Text>
              ))
            ) : task.description ? (
              <Text style={s.instructionText}>{task.description}</Text>
            ) : (
              <Text style={[s.instructionText, { color: '#9CA3AF' }]}>No instructions added.</Text>
            )}
          </View>
        </View>

        {/* Attachments */}
        {attachmentKeys.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Attachments</Text>
            </View>
            {loadingAttachments ? (
              <ActivityIndicator size="small" color="#E53935" />
            ) : (
              <View style={s.attachList}>
                {attachmentKeys.map((key) => {
                  const filename = key.split('/').pop() ?? key;
                  const url = attachmentUrls[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={s.attachChip}
                      onPress={() => url && Linking.openURL(url)}
                      disabled={!url}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-outline" size={16} color="#E53935" />
                      <Text style={s.attachChipText} numberOfLines={1}>{filename}</Text>
                      <Ionicons name="open-outline" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Activity Log */}
        <View style={s.section}>
          <View style={s.activityHeader}>
            <Ionicons name="time-outline" size={18} color="#E53935" />
            <Text style={s.sectionTitle}>Activity Log</Text>
          </View>
          <View style={s.logList}>
            {activityLog.map((entry, i) => (
              <View key={i} style={s.logItem}>
                <View style={s.logDotCol}>
                  <View style={s.logDot} />
                  {i < activityLog.length - 1 && <View style={s.logLine} />}
                </View>
                <View style={s.logContent}>
                  <Text style={s.logTime}>{entry.time}</Text>
                  {entry.body}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        {done ? (
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={s.completedBadgeText}>Task Completed</Text>
          </View>
        ) : (
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
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', flex: 1, marginLeft: 4 },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  userAvatarText: { fontSize: 14, fontFamily: F.m.bold, color: '#FFF' },

  // ── Scroll ──
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  // ── Title + badge ──
  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginBottom: 10 },
  titleDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  statusChip: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, marginBottom: 14,
  },
  statusText: { fontSize: 11, fontFamily: F.m.bold, letterSpacing: 0.5 },

  // ── Description ──
  descWrap: { marginBottom: 20, position: 'relative' },
  description: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, paddingRight: 28 },
  descriptionEmpty: { fontSize: 14, fontFamily: F.i.regular, color: '#C4C4C4', paddingRight: 28 },
  pencilBtn: {
    position: 'absolute', top: 0, right: 0,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },

  // ── Info cards ──
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: {
    flex: 1, backgroundColor: '#F5F5F7', borderRadius: 16, padding: 14, gap: 6,
  },
  infoIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  infoLabel: { fontSize: 10, fontFamily: F.m.bold, color: '#9CA3AF', letterSpacing: 0.6 },
  infoDate: { fontSize: 15, fontFamily: F.m.bold, color: '#111', lineHeight: 20 },
  infoTime: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280' },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  assignedAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
  },
  assignedAvatarText: { fontSize: 12, fontFamily: F.m.bold, color: '#FFF' },
  assignedName: { fontSize: 15, fontFamily: F.m.bold, color: '#111', flex: 1 },

  // ── Sections ──
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  editLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  instructionsBox: {
    backgroundColor: '#FFF8F0', borderRadius: 14,
    padding: 16, gap: 8,
  },
  instructionText: { fontSize: 14, fontFamily: F.i.regular, color: '#555', lineHeight: 21 },

  // ── Activity log ──
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  logList: { gap: 0 },
  logItem: { flexDirection: 'row', gap: 12 },
  logDotCol: { alignItems: 'center', width: 14 },
  logDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#E53935', marginTop: 4, flexShrink: 0,
  },
  logLine: { flex: 1, width: 2, backgroundColor: '#F3F4F6', marginTop: 4 },
  logContent: { flex: 1, paddingBottom: 20 },
  logTime: { fontSize: 12, fontFamily: F.m.semiBold, color: '#9CA3AF', marginBottom: 3 },
  logBody: { fontSize: 14, fontFamily: F.i.regular, color: '#374151', lineHeight: 20 },
  logBold: { fontFamily: F.m.bold, color: '#111' },

  // ── Attachments ──
  attachList: { gap: 8 },
  attachChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F7', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  attachChipText: {
    flex: 1, fontSize: 14, fontFamily: F.i.regular, color: '#374151',
  },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#FFF',
  },
  completeBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  completeBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
  completedBadge: {
    height: 56, borderRadius: 28, backgroundColor: '#ECFDF5',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#10B981',
  },
  completedBadgeText: { fontSize: 17, fontFamily: F.m.bold, color: '#10B981' },
});

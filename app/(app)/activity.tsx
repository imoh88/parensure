import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  TASK_CREATED: 'created task',
  TASK_COMPLETED: 'marked as complete',
  TASK_CANCELLED: 'cancelled task',
  APPOINTMENT_CREATED: 'added appointment',
  SOS_TRIGGERED: 'triggered an SOS alert',
  FALL_DETECTED: 'triggered a fall alert',
};

function formatEntryTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Date Picker Sheet ────────────────────────────────────────────────────────

function DatePickerSheet({
  visible,
  value,
  onConfirm,
  onCancel,
  title,
}: {
  visible: boolean;
  value: Date;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
  title: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={draft}
        mode="date"
        display="default"
        onChange={(_e, d) => { if (d) onConfirm(d); else onCancel(); }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={dp.root}>
        <Pressable style={dp.backdrop} onPress={onCancel} />
        <View style={dp.sheet}>
          <View style={dp.handle} />
          <View style={dp.header}>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <Text style={dp.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={dp.title}>{title}</Text>
            <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={12}>
              <Text style={dp.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            textColor="#000000"
            themeVariant="light"
            style={{ width: '100%', height: 200 }}
            onChange={(_e, d) => { if (d) setDraft(d); }}
          />
        </View>
      </View>
    </Modal>
  );
}

const dp = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  cancel: { fontSize: 15, fontFamily: F.m.medium, color: '#6B7280' },
  done: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E53935' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { careReceiverId, receiverName } = useLocalSearchParams<{
    careReceiverId: string;
    receiverName: string;
  }>();

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!careReceiverId) return;
    try {
      const res = await caregiverApi.getActivityLog(careReceiverId, 100);
      setEntries(res.success && res.data ? res.data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [careReceiverId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const clearFilters = () => { setFromDate(null); setToDate(null); };

  const filtered = entries.filter((e) => {
    const d = new Date(e.createdAt);
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });

  const hasFilter = !!(fromDate || toDate);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Recent Activity</Text>
          {receiverName ? <Text style={s.headerSub}>{receiverName}</Text> : null}
        </View>
      </View>

      {/* Filter bar */}
      <View style={s.filterBar}>
        <Text style={s.filterLabel}>Filter by date:</Text>
        <TouchableOpacity
          style={[s.filterPill, fromDate && s.filterPillActive]}
          onPress={() => setShowFromPicker(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={14} color={fromDate ? '#E53935' : '#6B7280'} />
          <Text style={[s.filterPillText, fromDate && s.filterPillTextActive]}>
            {fromDate ? formatDisplayDate(fromDate) : 'From'}
          </Text>
        </TouchableOpacity>

        <Text style={s.filterArrow}>→</Text>

        <TouchableOpacity
          style={[s.filterPill, toDate && s.filterPillActive]}
          onPress={() => setShowToPicker(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={14} color={toDate ? '#E53935' : '#6B7280'} />
          <Text style={[s.filterPillText, toDate && s.filterPillTextActive]}>
            {toDate ? formatDisplayDate(toDate) : 'To'}
          </Text>
        </TouchableOpacity>

        {hasFilter && (
          <TouchableOpacity style={s.clearBtn} onPress={clearFilters} activeOpacity={0.7}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Result count when filtering */}
      {hasFilter && !loading && (
        <View style={s.resultBanner}>
          <Text style={s.resultText}>
            {filtered.length} {filtered.length === 1 ? 'activity' : 'activities'} found
          </Text>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#E53935" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E53935" />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="time-outline" size={48} color="#E5E7EB" />
              <Text style={s.emptyTitle}>No activities</Text>
              <Text style={s.emptyText}>
                {hasFilter
                  ? 'No activities match this date range. Try adjusting the filter.'
                  : 'No activity has been recorded yet.'}
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {filtered.map((entry: any, idx: number) => {
                const isSos = entry.isSosAlert === true;
                const isLast = idx === filtered.length - 1;
                const verb = ACTION_LABEL[entry.action] ?? entry.action;
                const actorFirst = (entry.actorName as string ?? '').split(' ')[0] || entry.actorName;
                const initial = actorFirst.charAt(0).toUpperCase();

                return (
                  <View key={entry.id ?? idx} style={s.row}>
                    <View style={s.spineCol}>
                      <View style={[s.dot, isSos && s.dotSos]} />
                      {!isLast && <View style={s.line} />}
                    </View>

                    <View style={s.content}>
                      <View style={s.topRow}>
                        <View style={[s.avatar, isSos && s.avatarSos]}>
                          <Text style={[s.avatarText, isSos && s.avatarTextSos]}>
                            {isSos ? '🆘' : initial}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.time}>{formatEntryTime(entry.createdAt)}</Text>
                          <Text style={s.desc}>
                            <Text style={s.actor}>{actorFirst}</Text>
                            {' '}{verb}
                            {!isSos && entry.targetTitle
                              ? <>{' '}<Text style={s.target}>{entry.targetTitle}</Text></>
                              : null}
                            {'.'}
                          </Text>
                        </View>
                      </View>

                      {isSos && entry.note ? (
                        <View style={s.noteSos}>
                          <Text style={s.noteTextSos}>{entry.note}</Text>
                        </View>
                      ) : entry.note ? (
                        <View style={s.note}>
                          <Text style={s.noteText}>"{entry.note}"</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <DatePickerSheet
        visible={showFromPicker}
        value={fromDate ?? new Date()}
        title="From Date"
        onConfirm={(d) => { setFromDate(d); setShowFromPicker(false); }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DatePickerSheet
        visible={showToPicker}
        value={toDate ?? new Date()}
        title="To Date"
        onConfirm={(d) => { setToDate(d); setShowToPicker(false); }}
        onCancel={() => setShowToPicker(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },
  headerSub: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 1 },

  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  filterLabel: { fontSize: 13, fontFamily: F.m.semiBold, color: '#374151' },
  filterArrow: { fontSize: 14, color: '#D1D5DB' },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  filterPillActive: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  filterPillText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#6B7280' },
  filterPillTextActive: { color: '#E53935' },
  clearBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FEE2E2',
  },
  clearBtnText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#E53935' },

  resultBanner: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  resultText: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280' },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#374151' },
  emptyText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },

  list: {},
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  spineCol: { width: 22, alignItems: 'center', paddingTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935', flexShrink: 0 },
  dotSos: { backgroundColor: '#DC2626' },
  line: { flex: 1, width: 2, backgroundColor: '#F3F4F6', marginTop: 4, minHeight: 32 },

  content: { flex: 1, paddingLeft: 12, paddingBottom: 22 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarSos: { backgroundColor: '#FEE2E2' },
  avatarText: { fontSize: 14, fontFamily: F.m.bold, color: '#E53935' },
  avatarTextSos: { fontSize: 16 },
  time: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  desc: { fontSize: 13, fontFamily: F.i.regular, color: '#374151', lineHeight: 19 },
  actor: { fontFamily: F.m.bold, color: '#111' },
  target: { fontFamily: F.m.semiBold, color: '#111' },

  note: {
    marginTop: 8, backgroundColor: '#F9FAFB',
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#E5E7EB',
  },
  noteText: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 18 },
  noteSos: {
    marginTop: 8, backgroundColor: '#FEF2F2',
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#E53935',
  },
  noteTextSos: { fontSize: 12, fontFamily: F.i.regular, color: '#DC2626', lineHeight: 18 },
});

import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskItem {
  id: string; title: string; description?: string; category: string;
  scheduledTimes?: string[]; startDate?: string; endDate?: string;
  status: string; priority: string; frequency: string; createdAt?: string;
}
interface AppointmentItem {
  id: string; title: string; providerName?: string; location?: string;
  scheduledTimes?: string[]; startDate?: string; endDate?: string;
  status: string; priority: string;
}
type Tab = 'tasks' | 'medications' | 'appointments';
type TimeGroup = 'Morning' | 'Afternoon' | 'Evening';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekDays(center: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(center);
  start.setDate(start.getDate() - 3);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function parseHour(t: string): number {
  const [timePart, period = 'AM'] = t.trim().split(' ');
  const h = parseInt((timePart ?? '8').split(':')[0] ?? '8', 10);
  if (period === 'PM' && h !== 12) return h + 12;
  if (period === 'AM' && h === 12) return 0;
  return h;
}

function parseTimeMinutes(t: string): number {
  const [timePart, period = 'AM'] = t.trim().split(' ');
  const parts = (timePart ?? '8:00').split(':');
  let h = parseInt(parts[0] ?? '8', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function isDateToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isDateFuture(d: Date): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  return target > today;
}

function getGroup(t: string): TimeGroup {
  const h = parseHour(t);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const GROUP_META: Record<TimeGroup, { icon: string; color: string }> = {
  Morning:   { icon: '☀️', color: '#F97316' },
  Afternoon: { icon: '🌤', color: '#EAB308' },
  Evening:   { icon: '🌙', color: '#6366F1' },
};

function inRange(item: TaskItem | AppointmentItem, date: Date): boolean {
  const d = new Date(date); d.setHours(12, 0, 0, 0);
  // Use startDate if set, otherwise fall back to createdAt so items don't
  // appear on dates before they were created/started.
  const startStr = item.startDate ?? ('createdAt' in item ? item.createdAt : undefined);
  if (!startStr) return true;
  const start = new Date(startStr); start.setHours(0, 0, 0, 0);
  const end = item.endDate ? new Date(item.endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);
  return d >= start && (!end || d <= end);
}

function groupByTime<T extends { scheduledTimes?: string[] }>(items: T[]): Record<TimeGroup, T[]> {
  const g: Record<TimeGroup, T[]> = { Morning: [], Afternoon: [], Evening: [] };
  for (const item of items) {
    const t = item.scheduledTimes?.[0];
    const grp = t ? getGroup(t) : 'Morning';
    g[grp].push(item);
  }
  return g;
}

function firstTime(item: { scheduledTimes?: string[] }): string {
  return item.scheduledTimes?.[0] ?? '';
}

function descriptionFirstLine(desc?: string): string {
  if (!desc) return '';
  return desc.split('\n')[0] ?? '';
}

// ─── Progress Circle ──────────────────────────────────────────────────────────
function CircleProgress({ taken, total }: { taken: number; total: number }) {
  const SIZE = 64;
  const SW = 5;
  const pct = total > 0 ? Math.min(taken / total, 1) : 0;
  const angle = pct * 360;

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {/* Background ring */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: SIZE / 2, borderWidth: SW, borderColor: '#F0F0F0' }]} />

      {/* Right half (0–180°) */}
      <View style={{ position: 'absolute', right: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', right: 0, width: SIZE, height: SIZE,
          borderRadius: SIZE / 2, borderWidth: SW,
          borderTopColor: '#E53935', borderRightColor: '#E53935',
          borderBottomColor: angle > 90 ? '#E53935' : '#F0F0F0',
          borderLeftColor: 'transparent',
          transform: [{ rotate: `${Math.min(angle, 180) * 0.5 - 45}deg` }],
        }} />
      </View>

      {/* Left half (180–360°) */}
      {angle > 180 && (
        <View style={{ position: 'absolute', left: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' }}>
          <View style={{
            position: 'absolute', left: 0, width: SIZE, height: SIZE,
            borderRadius: SIZE / 2, borderWidth: SW,
            borderTopColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: '#E53935', borderLeftColor: '#E53935',
            transform: [{ rotate: `${(angle - 180) * 0.5 - 45}deg` }],
          }} />
        </View>
      )}

      {/* Center text */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 15, fontFamily: F.m.bold, color: '#111' }}>{taken}/{total}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MedicationScreen() {
  const router = useRouter();
  const { defaultTab } = useLocalSearchParams<{ defaultTab?: string }>();

  const goBack = useCallback(() => {
    router.replace('/(app)');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  const activeRole = useAuthStore(s => s.activeRole);
  const isCareReceiver = activeRole === 'CARE_RECEIVER';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(
    defaultTab === 'tasks' ? 'tasks' : defaultTab === 'appointments' ? 'appointments' : 'medications'
  );
  const [selectedDate, setSelectedDate] = useState(new Date());

  const days = weekDays(selectedDate);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      // Care receivers use /task/mine; caregivers use /task (VIEW_TASKS capability)
      const res = isCareReceiver
        ? await caregiverApi.getMyTasks()
        : await caregiverApi.getTasks();
      setTasks(res.success && res.data ? res.data as TaskItem[] : []);
    } catch { setTasks([]); }
    finally { setLoading(false); }
  }, [isCareReceiver]);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = isCareReceiver
        ? await caregiverApi.getMyAppointments()
        : await caregiverApi.getAppointments();
      setAppointments(res.success && res.data ? res.data as AppointmentItem[] : []);
    } catch { setAppointments([]); }
  }, [isCareReceiver]);

  useEffect(() => {
    fetchTasks();
    fetchAppointments();
  }, [fetchTasks, fetchAppointments]);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchTasks(), fetchAppointments()]).finally(() => setRefreshing(false));
  };

  const markTaken = async (taskId: string, taken: boolean) => {
    try {
      await caregiverApi.updateTaskStatus(taskId, taken ? 'COMPLETED' : 'CANCELLED');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: taken ? 'COMPLETED' : 'PENDING' } : t));
    } catch {
      Alert.alert('Error', 'Could not update status.');
    }
  };

  // ── Filtered items for selected date ──────────────────────────────────────
  // Medications: show all regardless of date range — a medication with a future startDate
  // is still relevant to the care receiver (shown as upcoming).
  // Tasks/appointments: respect the date range so the weekly picker is meaningful.
  const meds = tasks.filter(t => t.category === 'MEDICATION' && inRange(t, selectedDate));
  const nonMeds = tasks.filter(t => t.category !== 'MEDICATION' && inRange(t, selectedDate));
  const appts = appointments.filter(a => inRange(a, selectedDate));

  // Don't count future-date completions — those are stale from a previous day's action
  const takenMeds = isDateFuture(selectedDate) ? 0 : meds.filter(m => m.status === 'COMPLETED').length;
  const groupedMeds = groupByTime(meds);
  const groupedTasks = groupByTime(nonMeds);

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderMedCard = (item: TaskItem) => {
    const isFuture = isDateFuture(selectedDate);
    const isToday = isDateToday(selectedDate);

    // For future dates always show as pending regardless of stored status
    const taken = !isFuture && item.status === 'COMPLETED';

    // Checkbox is enabled only on today, and only from 15 min before the scheduled time
    let canCheck = false;
    if (isToday) {
      const t = item.scheduledTimes?.[0];
      if (!t) {
        canCheck = true;
      } else {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        canCheck = nowMins >= parseTimeMinutes(t) - 15;
      }
    }

    const dosage = descriptionFirstLine(item.description);
    return (
      <View key={item.id} style={s.medCard}>
        <View style={s.medIcon}>
          <Text style={s.medIconEmoji}>💊</Text>
        </View>
        <View style={s.medInfo}>
          <Text style={[s.medName, taken && s.medNameDone]}>{item.title}</Text>
          {dosage ? <Text style={s.medDosage}>{dosage}{firstTime(item) ? ` • ${firstTime(item)}` : ''}</Text> : null}
        </View>
        <TouchableOpacity
          style={[s.checkBtn, taken && s.checkBtnDone, !canCheck && s.checkBtnLocked]}
          onPress={() => canCheck && markTaken(item.id, !taken)}
          activeOpacity={canCheck ? 0.7 : 1}
        >
          {taken && <Text style={s.checkMark}>✓</Text>}
          {!canCheck && !taken && <Text style={s.lockIcon}>🔒</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderTaskCard = (item: TaskItem) => {
    const done = item.status === 'COMPLETED';
    return (
      <View key={item.id} style={s.medCard}>
        <View style={[s.medIcon, { backgroundColor: '#EEF2FF' }]}>
          <Text style={s.medIconEmoji}>📋</Text>
        </View>
        <View style={s.medInfo}>
          <Text style={[s.medName, done && s.medNameDone]}>{item.title}</Text>
          {item.description ? <Text style={s.medDosage}>{descriptionFirstLine(item.description)}</Text> : null}
        </View>
        <View style={[s.priorityBadge, item.priority === 'HIGH' && s.priorityHigh, item.priority === 'LOW' && s.priorityLow]}>
          <Text style={s.priorityText}>{item.priority}</Text>
        </View>
      </View>
    );
  };

  const renderApptCard = (item: AppointmentItem) => (
    <View key={item.id} style={s.medCard}>
      <View style={[s.medIcon, { backgroundColor: '#FFF7ED' }]}>
        <Text style={s.medIconEmoji}>🗓</Text>
      </View>
      <View style={s.medInfo}>
        <Text style={s.medName}>{item.title}</Text>
        <Text style={s.medDosage}>
          {[item.providerName, item.location, firstTime(item)].filter(Boolean).join(' • ')}
        </Text>
      </View>
      <View style={[s.priorityBadge, item.status === 'COMPLETED' && s.priorityLow]}>
        <Text style={s.priorityText}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <ScreenWrapper bg="#F5F5F7">
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {activeTab === 'tasks' ? 'Tasks' : activeTab === 'appointments' ? 'Appointments' : 'Medications'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(activeTab === 'tasks' ? '/(app)/add-task' : activeTab === 'appointments' ? '/(app)/add-appointment' : '/(app)/add-medication')}
          activeOpacity={0.8}
        >
          <Text style={s.addNew}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([['tasks', 'Tasks', nonMeds.length], ['medications', 'Medications', meds.length], ['appointments', 'Appointments', appts.length]] as [Tab, string, number][]).map(([tab, label, count]) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {label}
            </Text>
            {count > 0 && (
              <View style={[s.badge, activeTab === tab && s.badgeActive]}>
                <Text style={[s.badgeText, activeTab === tab && s.badgeTextActive]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E53935" />
        }
      >
        {/* Progress card — medications tab only */}
        {activeTab === 'medications' && (
          <View style={s.progressCard}>
            <View style={s.progressLeft}>
              <View style={s.progressBar} />
              <View style={s.progressText}>
                <Text style={s.progressLabel}>TODAY'S PROGRESS</Text>
                <Text style={s.progressValue}>{takenMeds} of {meds.length} Taken</Text>
              </View>
            </View>
            <CircleProgress taken={takenMeds} total={meds.length} />
          </View>
        )}

        {/* Refill banner — show when a medication's end date is within 7 days */}
        {activeTab === 'medications' && (() => {
          const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
          const refillMed = meds.find(m =>
            m.status !== 'COMPLETED' && m.endDate && new Date(m.endDate).getTime() <= soon
          );
          if (!refillMed) return null;
          const daysLeft = Math.max(0, Math.ceil((new Date(refillMed.endDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          const subText = daysLeft === 0 ? `${refillMed.title} runs out today` : `${refillMed.title} runs out in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
          return (
            <View style={s.refillBanner}>
              <View style={s.refillIcon}>
                <Text style={{ fontSize: 20 }}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.refillTitle}>Refill Needed</Text>
                <Text style={s.refillBody}>{subText}</Text>
              </View>
              <TouchableOpacity style={s.refillBtn} activeOpacity={0.8}>
                <Text style={s.refillBtnText}>Order</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Date Strip */}
        <Text style={s.monthLabel}>{MONTH_NAMES[selectedDate.getMonth()]}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateStrip}>
          {days.map((d) => {
            const isSelected = sameDay(d, selectedDate);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[s.dayTile, isSelected && s.dayTileSelected]}
                onPress={() => setSelectedDate(new Date(d))}
                activeOpacity={0.8}
              >
                <Text style={[s.dayName, isSelected && s.dayNameSelected]}>{DAY_NAMES[d.getDay()]}</Text>
                <Text style={[s.dayNum, isSelected && s.dayNumSelected]}>{d.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && tasks.length === 0 && appointments.length === 0 ? (
          <ActivityIndicator color="#E53935" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Medications tab */}
            {activeTab === 'medications' && (
              <>
                {meds.length === 0 ? (
                  <EmptyState message="No medications scheduled for this day." onAdd={() => router.push('/(app)/add-medication')} />
                ) : (
                  (['Morning', 'Afternoon', 'Evening'] as TimeGroup[]).map((grp) => {
                    const items = groupedMeds[grp];
                    if (items.length === 0) return null;
                    const meta = GROUP_META[grp];
                    const time = items[0] ? firstTime(items[0]) : '';
                    return (
                      <View key={grp} style={s.group}>
                        <View style={s.groupHeader}>
                          <Text style={s.groupIcon}>{meta.icon}</Text>
                          <Text style={[s.groupLabel, { color: meta.color }]}>{grp}</Text>
                          <Text style={s.groupTime}>{time}</Text>
                        </View>
                        {items.map(renderMedCard)}
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* Tasks tab */}
            {activeTab === 'tasks' && (
              <>
                {nonMeds.length === 0 ? (
                  <EmptyState message="No tasks scheduled for this day." onAdd={() => router.push('/(app)/add-task')} />
                ) : (
                  (['Morning', 'Afternoon', 'Evening'] as TimeGroup[]).map((grp) => {
                    const items = groupedTasks[grp];
                    if (items.length === 0) return null;
                    const meta = GROUP_META[grp];
                    return (
                      <View key={grp} style={s.group}>
                        <View style={s.groupHeader}>
                          <Text style={s.groupIcon}>{meta.icon}</Text>
                          <Text style={[s.groupLabel, { color: meta.color }]}>{grp}</Text>
                        </View>
                        {items.map(renderTaskCard)}
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* Appointments tab */}
            {activeTab === 'appointments' && (
              <>
                {appts.length === 0 ? (
                  <EmptyState message="No appointments scheduled for this day." onAdd={() => router.push('/(app)/add-appointment')} />
                ) : (
                  appts.map(renderApptCard)
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function EmptyState({ message, onAdd }: { message: string; onAdd: () => void }) {
  return (
    <View style={empty.wrap}>
      <Text style={empty.msg}>{message}</Text>
      <TouchableOpacity style={empty.btn} onPress={onAdd} activeOpacity={0.8}>
        <Text style={empty.btnText}>+ Add New</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  msg: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center' },
  btn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#E53935',
  },
  btnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#FFF' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F5F5F7',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },
  addNew: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E53935' },

  tabs: {
    flexDirection: 'row', backgroundColor: '#F5F5F7',
    paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 50, backgroundColor: '#EBEBEB',
  },
  tabActive: { backgroundColor: '#E53935' },
  tabText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#6B7280' },
  tabTextActive: { color: '#FFF' },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 11, fontFamily: F.m.bold, color: '#374151' },
  badgeTextActive: { color: '#FFF' },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  progressCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBar: { width: 5, height: 52, borderRadius: 3, backgroundColor: '#E53935' },
  progressText: { gap: 4 },
  progressLabel: { fontSize: 11, fontFamily: F.m.semiBold, color: '#9CA3AF', letterSpacing: 0.5 },
  progressValue: { fontSize: 18, fontFamily: F.m.bold, color: '#111' },

  refillBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginBottom: 16,
  },
  refillIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  refillTitle: { fontSize: 14, fontFamily: F.m.bold, color: '#111' },
  refillBody: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', marginTop: 2 },
  refillBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  refillBtnText: { fontSize: 13, fontFamily: F.m.bold, color: '#FFF' },

  monthLabel: { fontSize: 18, fontFamily: F.m.bold, color: '#111', marginBottom: 10 },
  dateStrip: { gap: 8, paddingBottom: 4, paddingRight: 4 },
  dayTile: {
    width: 56, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#FFF', alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  dayTileSelected: { backgroundColor: '#E53935' },
  dayName: { fontSize: 12, fontFamily: F.m.semiBold, color: '#9CA3AF' },
  dayNameSelected: { color: '#FFB3B3' },
  dayNum: { fontSize: 18, fontFamily: F.m.bold, color: '#111' },
  dayNumSelected: { color: '#FFF' },

  group: { marginTop: 20, gap: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  groupIcon: { fontSize: 16 },
  groupLabel: { fontSize: 16, fontFamily: F.m.bold, flex: 1 },
  groupTime: { fontSize: 13, fontFamily: F.m.semiBold, color: '#9CA3AF' },

  medCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  medIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  medIconEmoji: { fontSize: 22 },
  medInfo: { flex: 1, gap: 2 },
  medName: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  medNameDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  medDosage: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280' },

  checkBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  checkBtnDone: { backgroundColor: '#E53935', borderColor: '#E53935' },
  checkBtnLocked: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  checkMark: { fontSize: 14, color: '#FFF', fontFamily: F.m.bold },
  lockIcon: { fontSize: 10 },

  priorityBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
    backgroundColor: '#FEE2E2',
  },
  priorityHigh: { backgroundColor: '#FEE2E2' },
  priorityLow: { backgroundColor: '#DCFCE7' },
  priorityText: { fontSize: 11, fontFamily: F.m.semiBold, color: '#374151' },
});

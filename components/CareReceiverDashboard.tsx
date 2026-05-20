import { alertApi } from '@/lib/api/alert';
import { burnoutApi, WellnessPopupType } from '@/lib/api/burnout';
import { careReceiverApi } from '@/lib/api/careReceiver';
import { caregiverApi } from '@/lib/api/caregiver';
import WellnessPopup from '@/components/WellnessPopup';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useCareReceiverDashboardStore } from '@/lib/store/careReceiverDashboardStore';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Activity,
  ArrowRight,
  Heart,
  HeartAdd,
  People,
  TickCircle,
  Timer1,
  Weight,
} from 'iconsax-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskItem {
  id: string; title: string; description?: string; category: string;
  scheduledTimes: string[]; startDate?: string; endDate?: string;
  status: string; priority: string; frequency: string; createdAt?: string;
}
interface AppointmentItem {
  id: string; title: string; providerName?: string; location?: string;
  scheduledTimes: string[]; startDate?: string; endDate?: string; status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcProfileCompletion(user: any): number {
  const fields = [
    user?.fullName, user?.phone, user?.dateOfBirth, user?.gender,
    user?.country, user?.state, user?.city, user?.homeAddress,
    user?.timezone, user?.profileImageKey,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function parseTimeToDate(timeStr: string): Date | null {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  const p = match[3]!.toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function earliestScheduledTime(times: string[]): string {
  if (times.length === 0) return '';
  return times.reduce((best, cur) => {
    const a = parseTimeToDate(best);
    const b = parseTimeToDate(cur);
    if (!a) return cur;
    if (!b) return best;
    return b < a ? cur : best;
  });
}

function firstScheduledTime(task: TaskItem): string {
  return earliestScheduledTime(task.scheduledTimes);
}

function descriptionFirstLine(desc?: string) {
  return desc?.split('\n')[0] ?? '';
}

function isTimePast(timeStr: string): boolean {
  const d = parseTimeToDate(timeStr);
  return d ? Date.now() > d.getTime() : false;
}

function isMedMissed(med: TaskItem): boolean {
  if (med.status === 'MISSED') return true;
  if (med.status === 'COMPLETED') return false;
  const earliest = earliestScheduledTime(med.scheduledTimes);
  return earliest ? isTimePast(earliest) : false;
}

function isOverdue(task: TaskItem): boolean {
  if (task.status === 'COMPLETED') return false;
  const earliest = earliestScheduledTime(task.scheduledTimes);
  return earliest ? isTimePast(earliest) : false;
}

function minutesOverdue(task: TaskItem): number {
  const earliest = earliestScheduledTime(task.scheduledTimes);
  if (!earliest) return 0;
  const d = parseTimeToDate(earliest);
  if (!d) return 0;
  return Math.floor((Date.now() - d.getTime()) / 60_000);
}

// ─── Floating SOS Button ──────────────────────────────────────────────────────
function SosButton() {
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);

  const handleLongPress = async () => {
    Vibration.vibrate(400);

    // Removed the RNAlert modal — send SOS automatically
    setSending(true);

    try {
      await alertApi.triggerSos();
      // Optional: Show success feedback (you can remove this if you prefer silent send)
      RNAlert.alert('SOS Sent', 'Your caregiver has been notified.');
    } catch (error) {
      RNAlert.alert('Error', 'Could not send SOS. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <TouchableOpacity
      style={[shared.sos, { bottom: insets.bottom + 10 }]}
      activeOpacity={0.85}
      onLongPress={handleLongPress}
      delayLongPress={600}
      disabled={sending}
    >
      {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={shared.sosText}>SOS</Text>}
    </TouchableOpacity>
  );
}

// ─── Profile Gauge ────────────────────────────────────────────────────────────
const GAUGE_SIZE = 64;
const GAUGE_STROKE = 6;
const GAUGE_R = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_R;

function ProfileGauge({ pct }: { pct: number }) {
  const filled = GAUGE_CIRCUMFERENCE * (1 - pct / 100);
  return (
    <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
      <Circle cx={GAUGE_SIZE / 2} cy={GAUGE_SIZE / 2} r={GAUGE_R} stroke="#E5E7EB" strokeWidth={GAUGE_STROKE} fill="none" />
      <Circle
        cx={GAUGE_SIZE / 2} cy={GAUGE_SIZE / 2} r={GAUGE_R}
        stroke="#E53935" strokeWidth={GAUGE_STROKE} fill="none"
        strokeDasharray={`${GAUGE_CIRCUMFERENCE}`} strokeDashoffset={filled}
        strokeLinecap="round"
        transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
      />
    </Svg>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAddCaregiver, refreshControl }: { onAddCaregiver: () => void; refreshControl?: React.ReactElement<any> }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const completion = calcProfileCompletion(user);

  return (
    <ScrollView
      style={[e.screen, { paddingTop: insets.top }]}
      contentContainerStyle={e.container}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <TouchableOpacity style={e.profileBanner} onPress={() => router.push('/(auth)/complete-profile')} activeOpacity={0.85}>
        <View style={e.gaugeWrap}>
          <ProfileGauge pct={completion} />
          <Text style={e.gaugeText}>{completion}%</Text>
        </View>
        <View style={e.bannerText}>
          <Text style={e.bannerTitle}>Complete Your Profile</Text>
          <Text style={e.bannerSub}>Finish setting up your profile to unlock personalized care.</Text>
        </View>
        <View style={e.bannerArrow}>
          <ArrowRight size={16} color="#FFF" variant="Linear" />
        </View>
      </TouchableOpacity>

      <View style={e.illustrationWrap}>
        <View style={e.outerCircle}>
          <View style={e.innerCircle}>
            <Heart size={80} color="#E53935" variant="Bold" />
          </View>
        </View>
      </View>

      <Text style={e.emptyTitle}>Your Care Circle is{'\n'}empty</Text>
      <Text style={e.emptySub}>Add your first caregiver to start{'\n'}coordinating your care.</Text>

      <TouchableOpacity style={e.addBtn} onPress={onAddCaregiver} activeOpacity={0.85}>
        <People size={20} color="#FFF" variant="Linear" />
        <Text style={e.addBtnText}>Add Caregiver</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={e.learnLink}>LEARN HOW IT WORKS</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Health Card ──────────────────────────────────────────────────────────────
function HealthCard({ icon, bgColor, label, value, valueColor, tag, tagColor }: {
  icon: React.ReactNode; bgColor: string; label: string; value: string;
  valueColor?: string; tag: string; tagColor: string;
}) {
  return (
    <View style={p.healthCard}>
      <View style={[p.healthCardIcon, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={[p.healthCardTag2, { color: tagColor }]}>{tag}</Text>
      <Text style={p.healthCardLabel}>{label}</Text>
      <Text style={[p.healthCardValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Populated Dashboard ──────────────────────────────────────────────────────
function PopulatedDashboard({
  tasks, appointments, onMarkTaken, refreshControl,
}: {
  tasks: TaskItem[];
  appointments: AppointmentItem[];
  onMarkTaken: (taskId: string) => void;
  refreshControl?: React.ReactElement<any>;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const initial = (user?.fullName ?? 'U').charAt(0).toUpperCase();

  const meds = tasks.filter(t => t.category === 'MEDICATION');
  const nonMedTasks = tasks.filter(t => t.category !== 'MEDICATION');
  const todayMeds = meds; // already filtered by caller to today
  const takenCount = todayMeds.filter(m => m.status === 'COMPLETED').length;
  const missedCount = todayMeds.filter(m => isMedMissed(m)).length;

  // First overdue medication
  const overdueMed = todayMeds.find(m => isOverdue(m));

  // Med completion text
  const medCompletionText = todayMeds.length > 0 ? `${takenCount}/${todayMeds.length} COMPLETED` : null;

  // Medication status for Health Overview card
  const medStatus = todayMeds.length === 0
    ? 'None Today'
    : takenCount === todayMeds.length
      ? 'All Taken'
      : missedCount > 0
        ? `${missedCount} Missed`
        : 'On Track';
  const nextMed = todayMeds.find(m => m.status !== 'COMPLETED' && !isMedMissed(m));
  const nextMedTime = nextMed ? firstScheduledTime(nextMed) : '';

  // Task completion
  const doneTasks = nonMedTasks.filter(t => t.status === 'COMPLETED').length;
  const taskPct = nonMedTasks.length > 0 ? Math.round((doneTasks / nonMedTasks.length) * 100) : 0;

  // Preview lists
  const medPreview = todayMeds.slice(0, 3);
  const taskPreview = [...nonMedTasks, ...appointments.map(a => ({ ...a, category: '__appt__' } as any))].slice(0, 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F5F5F7' }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={refreshControl}
    >
      {/* Header */}
      <View style={[p.header, { paddingTop: insets.top + 12 }]}>
        <View style={p.avatarCircle}>
          <Text style={p.avatarInitial}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.greeting}>{getGreeting()},{'\n'}{firstName}</Text>
          <Text style={p.date}>{formatDate()}</Text>
        </View>
      </View>

      {/* Missed Medication Alert (only if there's an overdue med) */}
      {overdueMed && (
        <View style={p.alertCard}>
          <View style={p.alertIconWrap}>
            <HeartAdd size={28} color="#E53935" variant="Bold" />
          </View>
          <Text style={p.alertTitle}>
            Missed Medication:{'\n'}{overdueMed.title}
            {descriptionFirstLine(overdueMed.description) ? ` (${descriptionFirstLine(overdueMed.description)})` : ''}
          </Text>
          <Text style={p.alertSub}>
            You haven't taken your {firstScheduledTime(overdueMed)} dosage yet.
          </Text>
          <View style={p.alertBadge}>
            <Timer1 size={13} color="#6B7280" variant="Linear" />
            <Text style={p.alertBadgeText}>{minutesOverdue(overdueMed)} MINUTES OVERDUE</Text>
          </View>
          <TouchableOpacity onPress={() => onMarkTaken(overdueMed.id)} activeOpacity={0.8}>
            <Text style={p.alertAction}>Mark as Taken</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Health Overview */}
      <View style={p.sectionRow}>
        <Text style={p.sectionTitle}>Health Overview</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/health')} activeOpacity={0.7}>
          <Text style={p.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={p.healthGrid}>
        <HealthCard
          icon={<Activity size={20} color="#10B981" variant="Bold" />}
          bgColor="#ECFDF5" label="Mobility" value="80%"
          tag="+5% vs avg" tagColor="#10B981"
        />
        <HealthCard
          icon={<Heart size={20} color="#E53935" variant="Bold" />}
          bgColor="#FEF2F2" label="Heart Rate" value="80%"
          tag="+5% vs avg" tagColor="#10B981"
        />
        <HealthCard
          icon={<HeartAdd size={20} color="#3B82F6" variant="Bold" />}
          bgColor="#EFF6FF" label="Medication"
          value={medStatus} valueColor="#3B82F6"
          tag={nextMedTime ? `Next: ${nextMedTime}` : 'Up to date'}
          tagColor="#6B7280"
        />
        <HealthCard
          icon={<TickCircle size={20} color="#F59E0B" variant="Bold" />}
          bgColor="#FFFBEB" label="Task"
          value={nonMedTasks.length > 0 ? `${taskPct}%` : 'None'}
          tag={nonMedTasks.length > 0 ? `${doneTasks}/${nonMedTasks.length} done` : 'Add a task'}
          tagColor="#10B981"
        />
      </View>

      {/* Refill Needed — show when a medication's end date is within 7 days */}
      {(() => {
        const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const refillMed = meds.find(m =>
          m.status !== 'COMPLETED' && m.endDate && new Date(m.endDate).getTime() <= soon
        );
        if (!refillMed) return null;
        const daysLeft = Math.max(0, Math.ceil((new Date(refillMed.endDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        const subText = daysLeft === 0 ? `${refillMed.title} runs out today` : `${refillMed.title} runs out in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
        return (
          <View style={p.refillCard}>
            <View style={p.refillIconWrap}>
              <Weight size={22} color="#E53935" variant="Bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={p.refillTitle}>Refill Needed</Text>
              <Text style={p.refillSub}>{subText}</Text>
            </View>
            <TouchableOpacity style={p.orderBtn} activeOpacity={0.85}>
              <Text style={p.orderBtnText}>Order</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Medications */}
      <View style={p.sectionRow}>
        <Text style={p.sectionTitle}>Medications</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/medication', params: { from: '/(app)/index' } })} activeOpacity={0.7}>
          <Text style={p.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {todayMeds.length === 0 ? (
        <TouchableOpacity style={p.emptyMiniCard} onPress={() => router.push('/(app)/add-medication')} activeOpacity={0.8}>
          <Text style={p.emptyMiniText}>No medications today — tap to add one</Text>
        </TouchableOpacity>
      ) : (
        <View style={p.card}>
          {medCompletionText && (
            <View style={p.cardHeaderRow}>
              <View style={p.completedBadge}>
                <Text style={p.completedBadgeText}>{medCompletionText}</Text>
              </View>
            </View>
          )}
          {medPreview.map((med, idx) => {
            const taken = med.status === 'COMPLETED';
            const missed = !taken && isMedMissed(med);
            const dosage = descriptionFirstLine(med.description);
            const time = firstScheduledTime(med);
            return (
              <View key={med.id}>
                {idx > 0 && <View style={p.medDivider} />}
                <View style={p.medRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[p.medLabel, missed && { color: '#DC2626' }]}>
                      {taken ? 'TAKEN' : missed ? 'MISSED' : time ? `NEXT DOSE: ${time}` : 'ACTIVE'}
                    </Text>
                    <Text style={p.medName}>
                      {med.title}{dosage ? `  (${dosage})` : ''}
                    </Text>
                  </View>
                  {taken ? (
                    <View style={p.takenBadge}>
                      <Text style={p.takenBadgeText}>Taken</Text>
                    </View>
                  ) : missed ? (
                    <View style={p.missedBadge}>
                      <Text style={p.missedBadgeText}>Missed</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={p.logBtn} onPress={() => onMarkTaken(med.id)} activeOpacity={0.85}>
                      <Text style={p.logBtnText}>LOG</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          <TouchableOpacity style={p.viewAllMedsBtn} onPress={() => router.push({ pathname: '/(app)/medication', params: { from: '/(app)/index' } })} activeOpacity={0.85}>
            <Text style={p.viewAllMedsBtnText}>View All Medications</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tasks / Reminders */}
      <View style={p.sectionRow}>
        <Text style={p.sectionTitle}>Tasks / Reminders</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/medication', params: { from: '/(app)/index', defaultTab: 'tasks' } })} activeOpacity={0.7}>
          <Text style={p.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {taskPreview.length === 0 && appointments.length === 0 ? (
        <TouchableOpacity style={p.emptyMiniCard} onPress={() => router.push('/(app)/add-task')} activeOpacity={0.8}>
          <Text style={p.emptyMiniText}>No tasks today — tap to add one</Text>
        </TouchableOpacity>
      ) : (
        <View style={p.taskList}>
          {taskPreview.map((item: any) => {
            const isAppt = item.category === '__appt__';
            const done = item.status === 'COMPLETED' || item.status === 'DONE';
            const time = item.scheduledTimes?.[0] ?? '';
            const sub = isAppt
              ? `${time}${item.providerName ? ' · ' + item.providerName : ''}`
              : `${time ? time + ' · ' : ''}${done ? 'Done' : 'Upcoming'}`;
            return (
              <View key={item.id} style={[p.taskRow, !done && p.taskRowUpcoming]}>
                {done ? (
                  <TickCircle size={24} color="#10B981" variant="Bold" />
                ) : (
                  <View style={p.taskUpcomingIcon}>
                    {isAppt
                      ? <Weight size={22} color="#E53935" variant="Linear" />
                      : <TickCircle size={22} color="#E53935" variant="Linear" />
                    }
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={done ? p.taskNameDone : p.taskName}>{item.title}</Text>
                  <Text style={p.taskMeta}>{sub}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CareReceiverDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tasks, appointments, hasCareTeam, setData, isStale } = useCareReceiverDashboardStore();
  const [loading, setLoading] = useState(tasks.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [wellnessPopupType, setWellnessPopupType] = useState<WellnessPopupType | null>(null);
  const wellnessChecked = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!force && !isStale()) return;
    try {
      const [tasksRes, apptRes, caregiversRes] = await Promise.all([
        caregiverApi.getMyTasks(),
        caregiverApi.getMyAppointments(),
        careReceiverApi.getMyCaregivers(),
      ]);
      const newTasks = (tasksRes.success && tasksRes.data) ? tasksRes.data as TaskItem[] : tasks;
      const newAppts = (apptRes.success && apptRes.data) ? apptRes.data as AppointmentItem[] : appointments;
      const newHasCareTeam = (caregiversRes.data ?? []).length > 0;
      setData(newTasks, newAppts, newHasCareTeam);
    } catch (err: any) {
      console.error('[CareReceiverDashboard] load error:', err?.response?.data ?? err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStale, setData, tasks, appointments]);

  useFocusEffect(useCallback(() => {
    if (isStale()) {
      setLoading(tasks.length === 0);
      load();
    }

    if (!wellnessChecked.current) {
      wellnessChecked.current = true;
      burnoutApi.getCareReceiverWellnessPrompt()
        .then((res) => {
          if (res.success && res.data?.popupType) {
            setWellnessPopupType(res.data.popupType);
          }
        })
        .catch(() => { /* silent */ });
    }
  }, [load, isStale, tasks.length]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  const handleMarkTaken = async (taskId: string) => {
    try {
      await caregiverApi.updateTaskStatus(taskId, 'COMPLETED');
      const updatedTasks = tasks.map((t: TaskItem) => t.id === taskId ? { ...t, status: 'COMPLETED' } : t);
      setData(updatedTasks, appointments, hasCareTeam);
    } catch {
      RNAlert.alert('Error', 'Could not update medication status.');
    }
  };

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E53935" colors={['#E53935']} />
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <ActivityIndicator color="#E53935" />
      </View>
    );
  }

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const hasData = tasks.length > 0 || appointments.length > 0 || hasCareTeam;

  const wellnessPopup = wellnessPopupType ? (
    <WellnessPopup
      popupType={wellnessPopupType}
      firstName={firstName}
      isCareReceiver
      onDismiss={() => setWellnessPopupType(null)}
    />
  ) : null;

  if (!hasData) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState onAddCaregiver={() => router.push('/(app)/caregivers')} refreshControl={refreshControl} />
        <SosButton />
        {wellnessPopup}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PopulatedDashboard
        tasks={tasks}
        appointments={appointments}
        onMarkTaken={handleMarkTaken}
        refreshControl={refreshControl}
      />
      <SosButton />
      {wellnessPopup}
    </View>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const shared = StyleSheet.create({
  sos: {
    position: 'absolute', right: 16,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 999,
  },
  sosText: { fontSize: 13, fontFamily: F.m.bold, color: '#FFF' },
});

// ─── Empty State Styles ───────────────────────────────────────────────────────
const e = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },
  container: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 100 },
  profileBanner: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 16, marginBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  gaugeWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  gaugeText: { position: 'absolute', fontSize: 13, fontFamily: F.m.bold, color: '#111' },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#111', marginBottom: 3 },
  bannerSub: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', lineHeight: 17 },
  bannerArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
  },
  illustrationWrap: { marginBottom: 32 },
  outerCircle: {
    width: 260, height: 260, borderRadius: 130, backgroundColor: '#FECDD3',
    alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: {
    width: 180, height: 180, borderRadius: 90, backgroundColor: '#FCA5A5',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 30, fontFamily: F.m.xBold, color: '#111',
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 10,
  },
  emptySub: {
    fontSize: 15, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  addBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#E53935', paddingVertical: 16, borderRadius: 50, marginBottom: 16,
    shadowColor: '#E53935', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  addBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  learnLink: { fontSize: 13, fontFamily: F.m.bold, color: '#E53935', letterSpacing: 0.5 },
});

// ─── Populated Styles ─────────────────────────────────────────────────────────
const p = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20, gap: 12,
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontFamily: F.m.bold, color: '#FFF' },
  greeting: { fontSize: 20, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.4, lineHeight: 26 },
  date: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },

  alertCard: {
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: '#FEF2F2', borderRadius: 20, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#FECACA',
  },
  alertIconWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#E53935', shadowOpacity: 0.12, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  alertTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', textAlign: 'center', marginBottom: 6, lineHeight: 24 },
  alertSub: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF', borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  alertBadgeText: { fontSize: 11, fontFamily: F.m.semiBold, color: '#6B7280', letterSpacing: 0.3 },
  alertAction: { fontSize: 14, fontFamily: F.m.bold, color: '#E53935' },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },
  viewAll: { fontSize: 13, fontFamily: F.m.semiBold, color: '#E53935' },

  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  healthCard: {
    width: '47.5%', backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  healthCardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  healthCardTag2: { fontSize: 11, fontFamily: F.m.semiBold, marginBottom: 4 },
  healthCardLabel: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  healthCardValue: { fontSize: 22, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5 },

  refillCard: {
    marginHorizontal: 16, marginBottom: 20, backgroundColor: '#FEF2F2',
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  refillIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  refillTitle: { fontSize: 14, fontFamily: F.m.bold, color: '#111' },
  refillSub: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },
  orderBtn: { backgroundColor: '#E53935', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 50 },
  orderBtnText: { fontSize: 13, fontFamily: F.m.bold, color: '#FFF' },

  card: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  completedBadge: { backgroundColor: '#F3F4F6', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  completedBadgeText: { fontSize: 11, fontFamily: F.m.semiBold, color: '#6B7280', letterSpacing: 0.3 },

  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  medDivider: { height: 1, backgroundColor: '#F3F4F6' },
  medLabel: { fontSize: 10, fontFamily: F.m.semiBold, color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 3 },
  medName: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  logBtn: { borderWidth: 1.5, borderColor: '#E53935', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  logBtnText: { fontSize: 12, fontFamily: F.m.bold, color: '#E53935' },
  takenBadge: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  takenBadgeText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#10B981' },
  missedBadge: { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  missedBadgeText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#DC2626' },
  viewAllMedsBtn: { marginTop: 14, backgroundColor: '#E53935', borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  viewAllMedsBtnText: { fontSize: 14, fontFamily: F.m.bold, color: '#FFF' },

  emptyMiniCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed',
  },
  emptyMiniText: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },

  taskList: { paddingHorizontal: 16, gap: 10 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  taskRowUpcoming: { borderLeftWidth: 4, borderLeftColor: '#E53935', paddingLeft: 10 },
  taskUpcomingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  taskName: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  taskNameDone: { fontSize: 15, fontFamily: F.m.semiBold, color: '#9CA3AF', textDecorationLine: 'line-through' },
  taskMeta: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },
});

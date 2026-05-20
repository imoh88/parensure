import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { appointmentCache } from '@/lib/utils/appointmentCache';
import { taskCache } from '@/lib/utils/taskCache';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Building, Calendar, Clock, Hospital, Moon, Profile, Sun1, TickCircle } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// ─── Constants ────────────────────────────────────────────────────────────────
const TAB_LABELS = ['Tasks', 'Medications', 'Appointments'] as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY_IDX = 2;

function buildWeek() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i - TODAY_IDX));
    return { day: DAY_LABELS[d.getDay()] as string, date: d.getDate() };
  });
}
const WEEK = buildWeek();

function currentMonthName() {
  return new Date().toLocaleDateString('en-US', { month: 'long' });
}

function getDateForDayIndex(idx: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + (idx - TODAY_IDX));
  d.setHours(0, 0, 0, 0);
  return d;
}

function apptMatchesDay(appt: any, selected: Date): boolean {
  const freq: string = appt.frequency ?? 'ONE_TIME';
  const rawStart = appt.startDate ?? appt.createdAt;
  const start = rawStart ? new Date(rawStart) : null;
  if (start) start.setHours(0, 0, 0, 0);
  const end = appt.endDate ? new Date(appt.endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);
  if (start && selected < start) return false;
  if (end && selected > end) return false;
  if (freq === 'DAILY') return true;
  if (freq === 'WEEKLY') return start ? selected.getDay() === start.getDay() : true;
  // ONE_TIME: match exactly on start date
  return start ? selected.getTime() === start.getTime() : false;
}

function taskMatchesDay(task: any, selected: Date): boolean {
  const freq: string = task.frequency ?? 'ONE_TIME';
  const rawStart = task.startDate ?? task.createdAt;
  const start = rawStart ? new Date(rawStart) : null;
  if (start) start.setHours(0, 0, 0, 0);
  const end = task.endDate ? new Date(task.endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);
  if (start && selected < start) return false;
  if (end && selected > end) return false;
  if (freq === 'DAILY') return true;
  if (freq === 'WEEKLY') return start ? selected.getDay() === start.getDay() : true;
  if (freq === 'CUSTOM') return true;
  return start ? selected.getTime() === start.getTime() : true;
}

function selectedDayLabel(idx: number): string {
  const d = getDateForDayIndex(idx);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}


// ─── Task status helpers ───────────────────────────────────────────────────────
type StatusKey = 'ATTENTION_NEEDED' | 'NOT_STARTED' | 'COMPLETED' | 'MISSED';
const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string; border: string }> = {
  ATTENTION_NEEDED: { label: 'ATTENTION NEEDED', color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B' },
  NOT_STARTED:      { label: 'NOT STARTED',      color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  COMPLETED:        { label: 'COMPLETED',         color: '#10B981', bg: '#ECFDF5', border: '#10B981' },
  MISSED:           { label: 'MISSED',            color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
};

function parseScheduledTimeOnDate(timeStr: string, onDate: Date): Date | null {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  const p = match[3]!.toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  const d = new Date(onDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Returns the earliest time string from a scheduledTimes array. */
function earliestTime(times: string[]): string {
  if (times.length === 0) return '';
  return times.reduce((best, cur) => {
    const a = parseScheduledTimeOnDate(best, new Date());
    const b = parseScheduledTimeOnDate(cur, new Date());
    if (!a) return cur;
    if (!b) return best;
    return b < a ? cur : best;
  });
}

function taskStatus(item: any, refDate?: Date): StatusKey {
  if (item.status === 'COMPLETED') return 'COMPLETED';
  if (item.status === 'MISSED') return 'MISSED';
  // Detect overdue on the frontend: PENDING task whose earliest scheduled time has passed
  if (item.status === 'PENDING' && item.scheduledTimes?.length > 0) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ref = refDate ?? new Date();
    const refDay = new Date(ref); refDay.setHours(0, 0, 0, 0);
    if (refDay <= today) {
      const scheduled = parseScheduledTimeOnDate(earliestTime(item.scheduledTimes), refDay);
      if (scheduled && Date.now() > scheduled.getTime()) return 'MISSED';
    }
  }
  if (item.priority === 'HIGH' || item.status === 'OVERDUE') return 'ATTENTION_NEEDED';
  return 'NOT_STARTED';
}

// ─── Medication period helpers ─────────────────────────────────────────────────
const MED_PERIODS = [
  { key: 'morning',   label: 'Morning',   icon: Sun1,  time: '08:00 AM' },
  { key: 'afternoon', label: 'Afternoon', icon: Sun1,  time: '02:00 PM' },
  { key: 'evening',   label: 'Evening',   icon: Moon,  time: '08:00 PM' },
] as const;

function getPeriod(timeStr?: string): 'morning' | 'afternoon' | 'evening' {
  if (!timeStr) return 'morning';
  const upper = timeStr.trim().toUpperCase();
  let hour = parseInt(upper.split(':')[0] ?? '0', 10);
  if (upper.includes('PM') && hour !== 12) hour += 12;
  if (upper.includes('AM') && hour === 12) hour = 0;
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// ─── Circular gauge ────────────────────────────────────────────────────────────
function CircularGauge({ pct }: { pct: number }) {
  const size = 80, sw = 8;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#E53935" strokeWidth={sw} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={g.gaugePct}>{pct}%</Text>
    </View>
  );
}

// ─── Mini semicircle gauge (medications) ─────────────────────────────────────
function MiniGauge({ taken, total }: { taken: number; total: number }) {
  const size = 64, sw = 7;
  const r = (size - sw) / 2;
  const cx = size / 2, cy = size / 2;
  const pct = total > 0 ? taken / total : 0;
  const sweepDeg = 180 * pct;
  const rad = (d: number) => (d * Math.PI) / 180;
  const sx = cx - r, sy = cy;
  const ex = cx + r, ey = cy;
  const endAngle = 180 + sweepDeg;
  const px = cx + r * Math.cos(rad(endAngle));
  const py = cy + r * Math.sin(rad(endAngle));
  const laf = sweepDeg > 180 ? 1 : 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + sw / 2 + 2}>
        <Path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} stroke="#E5E7EB" strokeWidth={sw} fill="none" strokeLinecap="round" />
        {pct > 0 && (
          <Path
            d={`M ${sx} ${sy} A ${r} ${r} 0 ${laf} 1 ${px.toFixed(2)} ${py.toFixed(2)}`}
            stroke="#E53935" strokeWidth={sw} fill="none" strokeLinecap="round"
          />
        )}
      </Svg>
      <Text style={g.miniGaugeLabel}>{taken}/{total}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SnapshotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ careReceiverId?: string; defaultTab?: string }>();
  const careReceiverId = params.careReceiverId ?? '';

  const [activeTab, setActiveTab] = useState(parseInt(params.defaultTab ?? '0'));
  const [activeDay, setActiveDay] = useState(TODAY_IDX);
  const [tasks, setTasks] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!careReceiverId) return;
    setLoading(true);
    try {
      const res = await caregiverApi.getTasks(careReceiverId);
      setTasks(res.success && res.data ? res.data : []);
    } catch { setTasks([]); }
    finally { setLoading(false); }
  }, [careReceiverId]);

  const handleToggleTask = useCallback(async (taskId: string) => {
    setMarkingId(taskId);
    try {
      await caregiverApi.updateTaskStatus(taskId, 'COMPLETED');
      setTasks(prev => prev.map(t => (t._id ?? t.id) === taskId ? { ...t, status: 'COMPLETED' } : t));
    } catch { /* leave state unchanged on error */ }
    finally { setMarkingId(null); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!careReceiverId) return;
    setLoading(true);
    try {
      const res = await caregiverApi.getAppointments(careReceiverId);
      setAppointments(res.success && res.data ? res.data : []);
    } catch { setAppointments([]); }
    finally { setLoading(false); }
  }, [careReceiverId]);

  useEffect(() => {
    fetchTasks();
    fetchAppointments();
  }, [fetchTasks, fetchAppointments]);

  // ── Tab pills ──
  const renderTabs = () => {
    const selDate = getDateForDayIndex(activeDay);
    const filteredNonMed = tasks.filter((t: any) => t.category !== 'MEDICATION').filter((t) => taskMatchesDay(t, selDate));
    const medTasks = tasks.filter((t: any) => t.category === 'MEDICATION');
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
        {TAB_LABELS.map((label, i) => {
          const badge = i === 0 ? filteredNonMed.length : i === 1 ? medTasks.length : appointments.length;
          return (
            <TouchableOpacity key={i} style={[s.tabPill, activeTab === i && s.tabPillActive]} onPress={() => setActiveTab(i)}>
              <Text style={[s.tabLabel, activeTab === i && s.tabLabelActive]}>{label}</Text>
              <View style={[s.tabBadge, activeTab === i && s.tabBadgeActive]}>
                <Text style={[s.tabBadgeText, activeTab === i && s.tabBadgeTextActive]}>{badge}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // ── Calendar strip ──
  const renderCalendar = (showMonth = false) => (
    <View>
      {showMonth && <Text style={s.monthLabel}>{currentMonthName()}</Text>}
      <View style={s.dateRow}>
        {WEEK.map(({ day, date }, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dateItem, activeDay === i && s.dateItemActive]}
            onPress={() => setActiveDay(i)}
            activeOpacity={0.8}
          >
            <Text style={[s.dateDayLabel, activeDay === i && s.dateLabelActive]}>{day}</Text>
            <Text style={[s.dateDateLabel, activeDay === i && s.dateLabelActive]}>{date}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── TASKS VIEW ──
  const renderTasksView = () => {
    const selectedDate = getDateForDayIndex(activeDay);
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const isFutureDay = selectedDate > todayMidnight;
    const nonMedTasks = tasks
      .filter((t: any) => t.category !== 'MEDICATION')
      .filter((t) => taskMatchesDay(t, selectedDate));
    const completedCount = nonMedTasks.filter(t => taskStatus(t) === 'COMPLETED').length;
    const pct = nonMedTasks.length > 0 ? Math.round((completedCount / nonMedTasks.length) * 100) : 0;
    const isToday = activeDay === TODAY_IDX;

    return (
      <>
        {/* Focus row */}
        <View style={s.focusRow}>
          <View style={s.focusLeft}>
            <Text style={s.focusDate}>{selectedDayLabel(activeDay)}</Text>
            <Text style={s.focusTitle}>{isToday ? 'Focus on\nToday' : 'Tasks for\nThis Day'}</Text>
          </View>
          <View style={s.focusRight}>
            <CircularGauge pct={pct} />
            <Text style={s.focusDone}>DONE</Text>
          </View>
        </View>

        {/* Calendar strip */}
        {renderCalendar()}


        {/* Task cards */}
        {loading ? (
          <ActivityIndicator color="#E53935" style={{ marginTop: 32 }} />
        ) : nonMedTasks.length === 0 ? (
          <View style={s.empty}>
            <TickCircle size={40} color="#D1D5DB" variant="Linear" />
            <Text style={s.emptyText}>No tasks for this day</Text>
          </View>
        ) : (
          <View style={s.taskList}>
            {nonMedTasks.map((item) => {
              const taskId = item._id ?? item.id;
              const sk = taskStatus(item, selectedDate);
              const meta = STATUS_META[sk]!;
              const time = earliestTime(item.scheduledTimes ?? []);
              const dateLabel = item.startDate
                ? new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;
              const person = item.assignedTo ?? item.caregiverName ?? 'Primary Caregiver';
              const done = sk === 'COMPLETED';
              const isMissed = sk === 'MISSED';
              const isLocked = isFutureDay && !done && !isMissed;
              const isMarking = markingId === taskId;
              return (
                <View key={taskId} style={s.taskRow}>
                  <TouchableOpacity
                    style={[s.taskCard, { borderLeftColor: meta.border }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      taskCache.set(item);
                      router.push({ pathname: '/(app)/task-detail', params: { taskId } });
                    }}
                  >
                    <View style={[s.statusChip, { backgroundColor: meta.bg }]}>
                      <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={[s.taskTitle, (done || isMissed) && s.taskTitleDone]}>{item.title}</Text>
                    <View style={s.taskMeta}>
                      {time ? (
                        <View style={s.metaItem}>
                          <Clock size={13} color="#9CA3AF" variant="Linear" />
                          <Text style={s.metaText}>{time}</Text>
                        </View>
                      ) : null}
                      {dateLabel ? (
                        <View style={s.metaItem}>
                          <Calendar size={13} color="#9CA3AF" variant="Linear" />
                          <Text style={s.metaText}>{dateLabel}</Text>
                        </View>
                      ) : null}
                      <View style={s.metaItem}>
                        <Profile size={13} color="#9CA3AF" variant="Linear" />
                        <Text style={s.metaText}>{person}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={done ? s.taskCheckDone : isMissed ? s.taskCheckMissed : isLocked ? s.taskCheckLocked : s.taskCheckbox}
                    onPress={() => { if (!done && !isMissed && !isLocked && !isMarking) handleToggleTask(taskId); }}
                    activeOpacity={isMissed || isLocked ? 1 : 0.7}
                    disabled={done || isMissed || isLocked}
                  >
                    {isMarking ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : done ? (
                      <TickCircle size={18} color="#FFF" variant="Bold" />
                    ) : isMissed ? (
                      <Ionicons name="close" size={14} color="#DC2626" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed-outline" size={12} color="#D1D5DB" />
                    ) : null}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </>
    );
  };

  // ── MEDICATIONS VIEW ──
  const renderMedicationsView = () => {
    const medicationTasks = tasks.filter((t: any) => t.category === 'MEDICATION');
    const takenCount = medicationTasks.filter((t: any) => t.status === 'COMPLETED').length;
    const total = medicationTasks.length;

    if (loading) return <ActivityIndicator color="#E53935" style={{ marginTop: 40 }} />;

    if (total === 0) return (
      <View style={s.empty}>
        <Hospital size={40} color="#D1D5DB" variant="Linear" />
        <Text style={s.emptyText}>No medications yet</Text>
      </View>
    );

    return (
      <>
        {/* Progress card */}
        <View style={s.progressCard}>
          <View>
            <Text style={s.progressLabel}>TODAY'S PROGRESS</Text>
            <Text style={s.progressValue}>{takenCount} of {total} Taken</Text>
          </View>
          <MiniGauge taken={takenCount} total={total} />
        </View>

        {/* Month + calendar */}
        {renderCalendar(true)}

        {/* Time-grouped medications */}
        {MED_PERIODS.map(({ key, label, icon: Icon }) => {
          const periodMeds = medicationTasks.filter(
            (t: any) => getPeriod(earliestTime(t.scheduledTimes ?? [])) === key
          );
          if (periodMeds.length === 0) return null;
          const periodTime = earliestTime(periodMeds[0]?.scheduledTimes ?? []);
          return (
            <View key={key} style={s.medSection}>
              <View style={s.medPeriodRow}>
                <View style={s.medPeriodLeft}>
                  <Icon size={16} color="#E53935" variant="Linear" />
                  <Text style={s.medPeriodLabel}>{label}</Text>
                </View>
                <Text style={s.medPeriodTime}>{periodTime}</Text>
              </View>
              <View style={s.medGroup}>
                {periodMeds.map((med: any) => {
                  const medId = med._id ?? med.id;
                  const done = med.status === 'COMPLETED';
                  const isMarking = markingId === medId;
                  return (
                    <View key={medId} style={[s.medCard, done && s.medCardDone]}>
                      <View style={[s.medIconWrap, done && s.medIconDone]}>
                        <Hospital size={18} color={done ? '#D1D5DB' : '#E53935'} variant="Linear" />
                      </View>
                      <View style={s.medInfo}>
                        <Text style={[s.medName, done && s.medNameDone]}>{med.title}</Text>
                        {med.description ? (
                          <Text style={s.medDetail} numberOfLines={1}>{med.description}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => { if (!done && !isMarking) handleToggleTask(medId); }}
                        disabled={done || !!isMarking}
                        activeOpacity={0.7}
                      >
                        {isMarking ? (
                          <ActivityIndicator size="small" color="#E53935" />
                        ) : done ? (
                          <View style={s.medCheckDone}>
                            <TickCircle size={14} color="#E53935" variant="Bold" />
                          </View>
                        ) : (
                          <View style={s.medCheckbox} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </>
    );
  };

  // ── APPOINTMENTS VIEW ──
  const renderAppointmentsView = () => {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const selectedDate = getDateForDayIndex(activeDay);
    const isFutureDay = selectedDate > todayMidnight;
    const dayAppointments = appointments.filter((a: any) => apptMatchesDay(a, selectedDate));

    if (loading) return <ActivityIndicator color="#E53935" style={{ marginTop: 40 }} />;

    const renderApptCard = (item: any) => {
      const apptId = item._id ?? item.id;
      const done = item.status === 'COMPLETED';
      return (
        <View key={apptId} style={s.apptRow}>
          <TouchableOpacity
            style={[s.apptCard, done && s.apptCardDone]}
            activeOpacity={0.8}
            onPress={() => {
              appointmentCache.set(item);
              router.push({ pathname: '/(app)/appointment-detail', params: { from: '/(app)/activity' } });
            }}
          >
            <View style={s.apptLeft}>
              <Text style={[s.apptTitle, done && s.apptTitleDone]}>{item.title}</Text>
              {item.providerName ? (
                <View style={s.apptMeta}><Profile size={12} color="#9CA3AF" variant="Linear" /><Text style={s.apptMetaText}>{item.providerName}</Text></View>
              ) : null}
              {item.location ? (
                <View style={s.apptMeta}><Building size={12} color="#9CA3AF" variant="Linear" /><Text style={s.apptMetaText}>{item.location}</Text></View>
              ) : null}
            </View>
            <View style={s.apptRight}>
              <Text style={s.apptTime}>{item.scheduledTimes?.[0] ?? ''}</Text>
              <Text style={s.apptDateLabel}>{isFutureDay ? 'Upcoming' : 'Today'}</Text>
            </View>
          </TouchableOpacity>
          {done ? (
            <View style={s.checkDone}><TickCircle size={14} color="#E53935" variant="Bold" /></View>
          ) : isFutureDay ? (
            <View style={s.checkboxLocked}>
              <Ionicons name="lock-closed-outline" size={12} color="#D1D5DB" />
            </View>
          ) : (
            <View style={s.checkbox} />
          )}
        </View>
      );
    };

    return (
      <>
        {renderCalendar()}
        {dayAppointments.length === 0 ? (
          <View style={s.empty}>
            <Calendar size={40} color="#D1D5DB" variant="Linear" />
            <Text style={s.emptyText}>No appointments for this day</Text>
          </View>
        ) : (
          <View style={s.apptSection}>
            {dayAppointments.map((it) => renderApptCard(it))}
          </View>
        )}
      </>
    );
  };

  const headerTitle = activeTab === 1 ? 'Medication' : TAB_LABELS[activeTab] as string;

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {renderTabs()}
        {activeTab === 0 && renderTasksView()}
        {activeTab === 1 && renderMedicationsView()}
        {activeTab === 2 && renderAppointmentsView()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const g = StyleSheet.create({
  gaugePct:      { position: 'absolute', fontSize: 15, fontFamily: F.m.bold, color: '#111', alignSelf: 'center', top: 28 },
  miniGaugeLabel:{ fontSize: 14, fontFamily: F.m.bold, color: '#111', marginTop: 2 },
});

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#FFFFFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },

  scroll: { paddingBottom: 24 },

  // ── Tabs ──
  tabRow: { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 50, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', gap: 6,
  },
  tabPillActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  tabLabel: { fontSize: 13, fontFamily: F.m.semiBold, color: '#6B7280' },
  tabLabelActive: { color: '#FFF' },
  tabBadge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 11, fontFamily: F.m.bold, color: '#6B7280' },
  tabBadgeTextActive: { color: '#FFF' },

  // ── Tasks: Focus on Today ──
  focusRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 20,
  },
  focusLeft: { flex: 1 },
  focusDate: { fontSize: 12, fontFamily: F.m.semiBold, color: '#E53935', letterSpacing: 0.5, marginBottom: 6 },
  focusTitle: { fontSize: 32, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.8, lineHeight: 38 },
  focusRight: { alignItems: 'center', paddingTop: 4 },
  focusDone: { fontSize: 11, fontFamily: F.m.bold, color: '#9CA3AF', letterSpacing: 1, marginTop: 4 },

  // ── Tasks: filter pill ──
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF',
  },
  filterText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },

  // ── Tasks: cards ──
  taskList: { paddingHorizontal: 20, gap: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskCard: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, borderLeftWidth: 4,
    padding: 14, gap: 6,
  },
  statusChip: {
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 2,
  },
  statusText: { fontSize: 10, fontFamily: F.m.bold, letterSpacing: 0.4 },
  taskTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  taskTitleDone: { color: '#9CA3AF' },
  taskMeta: { flexDirection: 'row', gap: 16, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  taskCheckbox: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2.5, borderColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  taskCheckDone: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
  },
  taskCheckMissed: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2.5, borderColor: '#DC2626',
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  taskCheckLocked: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },

  // ── Medications: progress card ──
  progressCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderLeftWidth: 5, borderLeftColor: '#E53935',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  progressLabel: { fontSize: 10, fontFamily: F.m.bold, color: '#E53935', letterSpacing: 0.8, marginBottom: 4 },
  progressValue: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },

  // ── Medications: month + calendar ──
  monthLabel: { fontSize: 22, fontFamily: F.m.bold, color: '#111', paddingHorizontal: 20, marginBottom: 12, letterSpacing: -0.3 },
  dateRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, gap: 8, marginBottom: 20,
  },
  dateItem: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  dateItemActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  dateDayLabel: { fontSize: 12, fontFamily: F.m.medium, color: '#9CA3AF' },
  dateDateLabel: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },
  dateLabelActive: { color: '#FFF' },

  // ── Medications: refill card ──
  refillCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#FFF0F0', borderRadius: 14, padding: 14,
  },
  refillIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  refillTitle: { fontSize: 14, fontFamily: F.m.bold, color: '#111' },
  refillSub: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', marginTop: 2 },
  orderBtn: {
    backgroundColor: '#E53935', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  orderText: { fontSize: 13, fontFamily: F.m.bold, color: '#FFF' },

  // ── Medications: time sections ──
  medSection: { marginBottom: 20, paddingHorizontal: 20 },
  medPeriodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  medPeriodLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medPeriodLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  medPeriodTime: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },
  medGroup: { backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  medCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  medCardDone: { opacity: 0.5 },
  medIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  medIconDone: { backgroundColor: '#F3F4F6' },
  medInfo: { flex: 1, gap: 2 },
  medName: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
  medNameDone: { color: '#9CA3AF' },
  medDetail: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  medCheckbox: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#D1D5DB',
  },
  medCheckDone: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#FCA5A5',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2',
  },

  // ── Appointments ──
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  apptSection: { marginBottom: 24, paddingHorizontal: 20, gap: 12 },
  apptSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  apptSectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },
  apptSectionRange: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  apptCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, borderLeftWidth: 4, borderLeftColor: '#3B82F6',
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  apptCardDone: { opacity: 0.55 },
  apptCardLocked: { opacity: 0.55 },
  apptLeft: { flex: 1, gap: 5 },
  apptTitle: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  apptTitleDone: { color: '#9CA3AF' },
  apptMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  apptMetaText: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  apptRight: { alignItems: 'center', gap: 10 },
  apptTime: { fontSize: 13, fontFamily: F.m.semiBold, color: '#111' },
  apptDateLabel: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF' },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#E5E7EB' },
  checkboxLocked: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  checkDone: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#FCA5A5',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2',
  },

  // ── Empty ──
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },
});
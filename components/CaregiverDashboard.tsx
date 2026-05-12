import { ProfileSidebar } from '@/components/ProfileSidebar';
import WellnessPopup from '@/components/WellnessPopup';
import { burnoutApi, WellnessPopupType } from '@/lib/api/burnout';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useCaregiverDashboardStore } from '@/lib/store/caregiverDashboardStore';
import { appointmentCache } from '@/lib/utils/appointmentCache';
import { taskCache } from '@/lib/utils/taskCache';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// ─── Gauge ────────────────────────────────────────────────────────────────────
const G_SIZE = 64;
const G_SW   = 6;
const G_R    = (G_SIZE - G_SW) / 2;
const G_CIRC = 2 * Math.PI * G_R;

function ProgressGauge({ percentage }: { percentage: number }) {
  const dashOffset = G_CIRC * (1 - percentage / 100);
  return (
    <View style={{ width: G_SIZE, height: G_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={G_SIZE} height={G_SIZE}>
        <Circle
          cx={G_SIZE / 2} cy={G_SIZE / 2} r={G_R}
          stroke="#E5E7EB" strokeWidth={G_SW} fill="none"
        />
        <Circle
          cx={G_SIZE / 2} cy={G_SIZE / 2} r={G_R}
          stroke="#E53935" strokeWidth={G_SW} fill="none"
          strokeDasharray={`${G_CIRC}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${G_SIZE / 2} ${G_SIZE / 2})`}
        />
      </Svg>
      <Text style={gaugeLabel}>{percentage}%</Text>
    </View>
  );
}

const gaugeLabel: import('react-native').TextStyle = {
  position: 'absolute',
  fontFamily: F.m.bold, fontSize: 13, color: '#111',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface CareReceiverUser {
  id: string;
  fullName: string;
  profileImageKey?: string;
  relationship?: string;
}

interface BookingWithReceiver {
  id: string;
  careReceiverId: string;
  status: string;
  careReceiver: {
    id: string;
    userId: string;
    user: CareReceiverUser | null;
  } | null;
}

// ─── Static placeholder data ──────────────────────────────────────────────────
const HEALTH_METRICS = [
  { icon: 'walk-outline' as const, color: '#fff', bg: '#F8FFF6', cardBg: '#F8FFF6', iconBg: '#72BD5D', label: 'Mobility',   value: '80%', badge: '+5% vs avg',  badgeColor: '#00800099' },
  { icon: 'heart-outline' as const, color: '#fff', bg: '#FFF7F6', cardBg: '#FFF7F6', iconBg: '#E53935', label: 'Heart Rate', value: '80%', badge: '+5% vs avg',  badgeColor: '#00800099' },
  { icon: 'medical-outline' as const, color: '#fff', bg: '#F4F9FF', cardBg: '#F4F9FF',iconBg: '#5D8CBD', label: 'Medication', value: 'On Track', badge: 'On track', badgeColor: '#00800099', sub: 'Next: 10:00 AM', valueSmall: true },
  { icon: 'checkmark-circle-outline' as const, color: '#fff', bg: '#FFF9E9', cardBg: '#FFF9E9', iconBg: '#F6C745', label: 'Task', value: '80%', badge: '+5% vs avg', badgeColor: '#00800099' },
];

const ACTIVITY_TAB_LABELS = ['Tasks', 'Medications', 'Appointments'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY_INDEX = 2; // today is always in the middle (index 2 of 5)

function buildWeek() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i - TODAY_INDEX));
    return { day: DAY_LABELS[d.getDay()] as string, date: d.getDate() };
  });
}

const WEEK = buildWeek();

const TAG_META: Record<string, { color: string; bg: string; border: string }> = {
  MEDICATION: { color: '#10B981', bg: '#ECFDF5', border: '#10B981' },
  CHECK_IN:   { color: '#3B82F6', bg: '#EFF6FF', border: '#3B82F6' },
  HEALTH:     { color: '#14B8A6', bg: '#F0FDFA', border: '#14B8A6' },
  EXERCISE:   { color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B' },
  OTHER:      { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CaregiverDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { bookings, setBookings, isStale } = useCaregiverDashboardStore();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [activeDay, setActiveDay] = useState(TODAY_INDEX);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loadingBookings, setLoadingBookings] = useState(bookings.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [wellnessPopupType, setWellnessPopupType] = useState<WellnessPopupType | null>(null);
  const wellnessChecked = useRef(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const profilePct = 80;
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  const fetchBookings = useCallback(async (force = false) => {
    if (!force && !isStale()) return;
    setLoadingBookings(bookings.length === 0);
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) {
        setBookings(res.data as BookingWithReceiver[]);
      }
    } catch {
      // silently fail — empty state will show
    } finally {
      setLoadingBookings(false);
    }
  }, [isStale, setBookings, bookings.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) setBookings(res.data as BookingWithReceiver[]);
    } catch { }
    finally { setRefreshing(false); }
  }, [setBookings]);

  useFocusEffect(useCallback(() => {
    if (isStale()) fetchBookings();

    // Show wellness popup once per session when screen is focused
    if (!wellnessChecked.current) {
      wellnessChecked.current = true;
      burnoutApi.getWellnessPrompt()
        .then((res) => {
          if (res.success && res.data?.popupType) {
            setWellnessPopupType(res.data.popupType);
          }
        })
        .catch(() => { /* silent */ });
    }
  }, [fetchBookings, isStale]));

  const fetchTasks = useCallback(async (careReceiverId: string) => {
    setLoadingTasks(true);
    try {
      const res = await caregiverApi.getTasks(careReceiverId);
      if (res.success && res.data) setTasks(res.data);
      else setTasks([]);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const handleToggleTask = useCallback(async (taskId: string) => {
    setMarkingId(taskId);
    try {
      await caregiverApi.updateTaskStatus(taskId, 'COMPLETED');
      setTasks(prev => prev.map(t => (t._id ?? t.id) === taskId ? { ...t, status: 'COMPLETED' } : t));
    } catch { }
    finally { setMarkingId(null); }
  }, []);

  useEffect(() => {
    const careReceiverId = bookings[selectedIdx]?.careReceiverId;
    if (careReceiverId) fetchTasks(careReceiverId);
    else setTasks([]);
  }, [selectedIdx, bookings, fetchTasks]);

  const fetchAppointments = useCallback(async (careReceiverId: string) => {
    setLoadingAppointments(true);
    try {
      const res = await caregiverApi.getAppointments(careReceiverId);
      if (res.success && res.data) setAppointments(res.data);
      else setAppointments([]);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    const careReceiverId = bookings[selectedIdx]?.careReceiverId;
    if (careReceiverId) fetchAppointments(careReceiverId);
    else setAppointments([]);
  }, [selectedIdx, bookings, fetchAppointments]);

  const fetchActivityLog = useCallback(async (careReceiverId: string) => {
    setLoadingActivity(true);
    try {
      const res = await caregiverApi.getActivityLog(careReceiverId, 3);
      setActivityLog(res.success && res.data ? res.data.slice(0, 3) : []);
    } catch {
      setActivityLog([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    const careReceiverId = bookings[selectedIdx]?.careReceiverId;
    if (careReceiverId) fetchActivityLog(careReceiverId);
    else setActivityLog([]);
  }, [selectedIdx, bookings, fetchActivityLog]);

  const hasReceivers = bookings.length > 0;
  const selectedBooking = bookings[selectedIdx] ?? null;
  const selectedName = selectedBooking?.careReceiver?.user?.fullName ?? '';
  const selectedFirstName = selectedName.split(' ')[0] ?? '';

  // ─── Header (shared between both states) ─────────────────────────────────
  const renderHeader = () => (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Image
        source={require('@/assets/images/parensure-logo.png')}
        style={s.logo}
        resizeMode="contain"
      />
      <View style={s.greetingRow}>
        <View>
          <Text style={s.greetingTitle}>Hi {firstName}</Text>
          <Text style={s.greetingSubtitle}>Here's what's happening today</Text>
        </View>
        <TouchableOpacity
          style={s.dotsBtn}
          activeOpacity={0.7}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Dropdown menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={s.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.menuCard}>
                <TouchableOpacity
                  style={s.menuRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push('/(app)/profile');
                  }}
                >
                  <View style={[s.menuIconWrap, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="share-outline" size={18} color="#E53935" />
                  </View>
                  <Text style={s.menuLabel}>Sharing Preferences</Text>
                </TouchableOpacity>

                <View style={s.menuDivider} />

                <TouchableOpacity
                  style={s.menuRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    Alert.alert(
                      'Delete Profile',
                      'Are you sure you want to delete your profile? This action cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => {} },
                      ]
                    );
                  }}
                >
                  <View style={[s.menuIconWrap, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="trash-outline" size={18} color="#E53935" />
                  </View>
                  <Text style={s.menuLabel}>Delete Profile</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );

  // ─── Profile completion card ───────────────────────────────────────────────
  const renderCompletionCard = () => (
    <TouchableOpacity
      style={s.completionCard}
      onPress={() => router.push({ pathname: '/(app)/edit-profile', params: { from: 'dashboard' } })}
      activeOpacity={0.85}
    >
      <Image
        source={require('@/assets/images/parensure-logo.png')}
        style={s.watermarkLogo}
        resizeMode="contain"
      />
      <View style={s.gaugeWrapper}>
        <ProgressGauge percentage={profilePct} />
      </View>
      <View style={s.completionTextBlock}>
        <Text style={s.completionTitle}>Complete Your Profile</Text>
        <Text style={s.completionSub}>
          Finish setting up your profile to unlock more personalized follow-ups.
        </Text>
      </View>
      <View style={s.arrowBtn}>
        <Ionicons name="arrow-forward" size={16} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  // ─── Empty state ───────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <>
      <View style={s.emptyIllustration}>
        <View style={s.heartOuter}>
          <Ionicons name="heart" size={64} color="#E84545" />
        </View>
      </View>
      <View style={s.emptyTextBlock}>
        <Text style={s.emptyTitle}>You haven't added{'\n'}anyone yet</Text>
        <Text style={s.emptySub}>
          Add a loved one to start managing their care and stay on top of tasks, medications, and alerts.
        </Text>
      </View>
      <TouchableOpacity
        style={s.addBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/(app)/carecircle')}
      >
        <Ionicons name="person-add-outline" size={18} color="#FFF" />
        <Text style={s.addBtnText}>Add Care Receiver</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.learnMoreBtn}>
        <Text style={s.learnMoreText}>LEARN MORE ABOUT CARE CIRCLE</Text>
      </TouchableOpacity>
    </>
  );

  // ─── Care receivers horizontal list ───────────────────────────────────────
  const renderCareReceivers = () => (
    <View style={s.receiversSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.receiversScroll}
      >
        {bookings.map((booking, idx) => {
          const rcvUser = booking.careReceiver?.user;
          const name = rcvUser?.fullName ?? 'Unknown';
          const relationship = rcvUser?.relationship;
          const initial = name.charAt(0).toUpperCase();
          const selected = idx === selectedIdx;

          return (
            <TouchableOpacity
              key={booking.id}
              style={s.receiverItem}
              onPress={() => setSelectedIdx(idx)}
              activeOpacity={0.8}
            >
              <View style={[s.receiverAvatarWrap, selected && s.receiverAvatarSelected]}>
                <View style={s.receiverAvatar}>
                  <Text style={s.receiverInitial}>{initial}</Text>
                </View>
              </View>
              {relationship ? (
                <Text style={[s.receiverRelationship, selected && s.receiverRelationshipSelected]}>
                  {relationship}
                </Text>
              ) : null}
              <Text style={s.receiverName} numberOfLines={1}>
                {name.split(' ').slice(0, 2).join('\n')}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Add button */}
        <TouchableOpacity
          style={s.receiverItem}
          onPress={() => router.push('/(app)/carecircle')}
          activeOpacity={0.8}
        >
          <View style={s.receiverAddWrap}>
            <Ionicons name="add" size={26} color="#9CA3AF" />
          </View>
          <Text style={s.receiverAddLabel}>Add Loved{'\n'}One</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ─── Health overview ───────────────────────────────────────────────────────
  const renderHealthOverview = () => (
    <View style={s.healthSection}>
      <View style={s.healthHeader}>
        <Text style={s.healthTitle}>Health Overview</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={s.healthManage}>Manage</Text>
        </TouchableOpacity>
      </View>
      <View style={s.metricsGrid}>
        {HEALTH_METRICS.map((m, i) => (
          <View key={i} style={[s.metricCard, { backgroundColor: m.cardBg }]}>
            <View style={s.metricTop}>
              <View style={[s.metricIconWrap, { backgroundColor: m.iconBg }]}>
                <Ionicons name={m.icon} size={18} color={m.color} />
              </View>
              <View style={[s.metricBadge, { backgroundColor: m.bg }]}>
                <Text style={[s.metricBadgeText, { color: m.badgeColor }]}>{m.badge}</Text>
              </View>
            </View>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={[s.metricValue, m.valueSmall && s.metricValueGreen]}>{m.value}</Text>
            {m.sub ? <Text style={s.metricSub}>{m.sub}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );

  // ─── Activity tabs ─────────────────────────────────────────────────────────
  const renderActivityTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.tabRow}
    >
      {ACTIVITY_TAB_LABELS.map((label, i) => {
        const badge = i === 0 ? nonMedicationTasks.length : i === 1 ? medicationTasks.length : appointments.length;
        return (
          <TouchableOpacity
            key={i}
            style={[s.tabPill, activeTab === i && s.tabPillActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[s.tabLabel, activeTab === i && s.tabLabelActive]}>{label}</Text>
            <View style={[s.tabBadge, activeTab === i && s.tabBadgeActive]}>
              <Text style={[s.tabBadgeText, activeTab === i && s.tabBadgeTextActive]}>{badge}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ─── Date picker ───────────────────────────────────────────────────────────
  const renderDatePicker = () => (
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
  );

  // ─── Task items ────────────────────────────────────────────────────────────
  const nonMedicationTasks = tasks.filter((t: any) => t.category !== 'MEDICATION');
  const medicationTasks = tasks.filter((t: any) => t.category === 'MEDICATION');

  const renderTaskItems = (items = nonMedicationTasks, emptyLabel = 'No tasks yet.') => {
    if (loadingTasks) return <ActivityIndicator color="#E53935" style={{ marginTop: 20 }} />;
    if (items.length === 0) return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' }}>{emptyLabel}</Text>
      </View>
    );
    return (
      <View style={s.taskList}>
        {items.map((item: any) => {
          const meta = TAG_META[item.category as string] ?? TAG_META['OTHER']!;
          const timeLabel = item.scheduledTimes?.[0] ?? '';
          const taskId = item._id ?? item.id;
          const done = item.status === 'COMPLETED' || item.completed === true;
          const isMarking = markingId === taskId;
          return (
            <View key={taskId} style={s.taskRow}>
              <TouchableOpacity
                style={[s.taskCard, { borderLeftColor: meta.border }, done && s.taskCardDone]}
                activeOpacity={0.8}
                onPress={() => {
                  taskCache.set(item);
                  router.push({ pathname: '/(app)/task-detail', params: { taskId: taskId } });
                }}
              >
                <View style={s.taskCardInner}>
                  <View style={s.taskTop}>
                    <View style={[s.tagChip, { backgroundColor: meta.bg }]}>
                      <Text style={[s.tagText, { color: meta.color }]}>{item.category}</Text>
                    </View>
                    {item.priority === 'HIGH' && (
                      <View style={s.criticalChip}>
                        <Text style={s.criticalText}>HIGH</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.taskTitle, done && s.taskTitleDone]}>{item.title}</Text>
                  {item.description ? (
                    <Text style={s.taskSub} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  {timeLabel ? (
                    <View style={s.taskTime}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={s.taskTimeText}>{timeLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={s.taskAvatar}>
                  <Text style={s.taskAvatarText}>
                    {selectedFirstName ? selectedFirstName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={done ? s.taskCheckDone : s.taskCheckbox}
                onPress={() => { if (!done && !isMarking) handleToggleTask(taskId); }}
                activeOpacity={0.7}
                disabled={done}
              >
                {isMarking ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : done ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : null}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Appointment items ─────────────────────────────────────────────────────
  const renderAppointmentItems = () => {
    if (loadingAppointments) return <ActivityIndicator color="#E53935" style={{ marginTop: 20 }} />;
    if (appointments.length === 0) return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' }}>No appointments yet.</Text>
      </View>
    );
    return (
      <View style={s.taskList}>
        {appointments.map((item: any) => {
          const apptId = item._id ?? item.id;
          const timeLabel = item.scheduledTimes?.[0] ?? '';
          return (
            <View key={apptId} style={s.taskRow}>
              <TouchableOpacity
                style={[s.taskCard, { borderLeftColor: '#3B82F6' }]}
                activeOpacity={0.8}
                onPress={() => {
                  appointmentCache.set(item);
                  router.push({ pathname: '/(app)/appointment-detail', params: { from: '/(app)/index' } });
                }}
              >
                <View style={s.taskCardInner}>
                  <View style={s.taskTop}>
                    <View style={[s.tagChip, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[s.tagText, { color: '#3B82F6' }]}>APPOINTMENT</Text>
                    </View>
                    {item.priority === 'HIGH' && (
                      <View style={s.criticalChip}>
                        <Text style={s.criticalText}>HIGH</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.taskTitle}>{item.title}</Text>
                  {item.providerName ? (
                    <Text style={s.taskSub} numberOfLines={1}>{item.providerName}</Text>
                  ) : null}
                  {item.location ? (
                    <Text style={s.taskSub} numberOfLines={1}>{item.location}</Text>
                  ) : null}
                  {timeLabel ? (
                    <View style={s.taskTime}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={s.taskTimeText}>{timeLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={s.taskAvatar}>
                  <Text style={s.taskAvatarText}>
                    {selectedFirstName ? selectedFirstName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={s.taskCheckbox} />
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Activity log ──────────────────────────────────────────────────────────
  const ACTION_LABEL: Record<string, string> = {
    TASK_CREATED:       'created task',
    TASK_COMPLETED:     'marked as complete',
    TASK_CANCELLED:     'cancelled task',
    APPOINTMENT_CREATED:'added appointment',
  };

  const formatActivityTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${time}`;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
  };

  const renderRecentActivity = () => (
    <View style={s.activitySection}>
      <View style={s.activityHeader}>
        <Text style={s.activityTitle}>Recent Activity</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push({
            pathname: '/(app)/activity',
            params: {
              careReceiverId: selectedBooking?.careReceiverId ?? '',
              receiverName: selectedName,
            },
          })}
        >
          <Text style={s.activityViewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {loadingActivity ? (
        <ActivityIndicator color="#E53935" style={{ marginVertical: 20 }} />
      ) : activityLog.length === 0 ? (
        <View style={s.activityEmpty}>
          <Text style={s.activityEmptyText}>No activity yet.</Text>
        </View>
      ) : (
        <View style={s.activityList}>
          {activityLog.map((entry: any, idx: number) => {
            const isLast = idx === activityLog.length - 1;
            const firstName = (entry.actorName as string).split(' ')[0] ?? entry.actorName;
            const initial = firstName.charAt(0).toUpperCase();
            const verb = ACTION_LABEL[entry.action as string] ?? entry.action;
            return (
              <View key={entry.id ?? idx} style={s.activityRow}>
                {/* Timeline spine */}
                <View style={s.activitySpineCol}>
                  <View style={s.activityDot} />
                  {!isLast && <View style={s.activityLine} />}
                </View>

                <View style={s.activityContent}>
                  <View style={s.activityTopRow}>
                    <View style={s.activityAvatar}>
                      <Text style={s.activityAvatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityTime}>{formatActivityTime(entry.createdAt)}</Text>
                      <Text style={s.activityDesc}>
                        <Text style={s.activityActor}>{firstName}</Text>
                        {' '}
                        <Text style={s.activityVerb}>{verb}</Text>
                        {' '}
                        <Text style={s.activityTarget}>{entry.targetTitle}</Text>
                        {'.' }
                      </Text>
                    </View>
                  </View>
                  {entry.note ? (
                    <View style={s.activityNote}>
                      <Text style={s.activityNoteText}>"{entry.note}"</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F7" />
      <ProfileSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {wellnessPopupType && (
        <WellnessPopup
          popupType={wellnessPopupType}
          firstName={firstName}
          onDismiss={() => setWellnessPopupType(null)}
        />
      )}

      {loadingBookings ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#E53935" size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E53935" colors={['#E53935']} />
          }
        >
          {renderHeader()}
          {renderCompletionCard()}

          {hasReceivers ? (
            <>
              {renderCareReceivers()}
              {renderHealthOverview()}

              {/* Activity Snapshot header */}
              <View style={s.snapshotRow}>
                <Text style={s.snapshotTitle}>Activity Snapshot</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/snapshot',
                      params: {
                        careReceiverId: selectedBooking?.careReceiverId ?? '',
                        receiverName: selectedName,
                        defaultTab: String(activeTab),
                      },
                    })
                  }
                >
                  <Text style={s.snapshotViewAll}>View All</Text>
                </TouchableOpacity>
              </View>

              {renderActivityTabs()}
              {renderDatePicker()}
              {activeTab === 0 && renderTaskItems()}
              {activeTab === 1 && renderTaskItems(medicationTasks, 'No medications yet.')}
              {activeTab === 2 && renderAppointmentItems()}

              {renderRecentActivity()}
            </>
          ) : (
            renderEmptyState()
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },
  scroll: { paddingBottom: 24 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Header ──
  header: {
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  logo: { width: 42, height: 42, marginBottom: 10 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  greetingTitle: {
    fontSize: 26,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsBtn: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 20,
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: F.m.medium,
    color: '#111827',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  // ── Profile completion card ──
  completionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  watermarkLogo: {
    position: 'absolute',
    right: -18,
    top: '50%',
    marginTop: -50,
    width: 110,
    height: 110,
    opacity: 0.07,
  },
  gaugeWrapper: { alignItems: 'center' },
  completionTextBlock: { flex: 1, gap: 4 },
  completionTitle: { fontSize: 14, fontFamily: F.m.bold, color: '#111' },
  completionSub: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', lineHeight: 17 },
  arrowBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E84545',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Empty state ──
  emptyIllustration: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32, marginTop: 8,
  },
  heartOuter: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#F4DDDD',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTextBlock: {
    alignItems: 'center', paddingHorizontal: 32, marginBottom: 28, gap: 10,
  },
  emptyTitle: {
    fontSize: 30, fontFamily: F.m.xBold, color: '#111',
    textAlign: 'center', letterSpacing: -0.75, lineHeight: 32,
  },
  emptySub: {
    fontSize: 16, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 21,
  },
  addBtn: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#E84545', borderRadius: 50, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 14 },
  learnMoreBtn: { alignItems: 'center', marginBottom: 28 },
  learnMoreText: {
    color: '#E84545', fontSize: 14, fontFamily: F.m.bold, letterSpacing: 0.35,
  },

  // ── Care receivers ──
  receiversSection: { marginBottom: 8 },
  receiversScroll: { paddingHorizontal: 20, gap: 16, paddingVertical: 8 },
  receiverItem: { alignItems: 'center', width: 72 },
  receiverAvatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2.5, borderColor: 'transparent',
    padding: 2,
    marginBottom: 4,
  },
  receiverAvatarSelected: { borderColor: '#E53935' },
  receiverAvatar: {
    flex: 1, borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  receiverInitial: { fontSize: 22, fontFamily: F.m.bold, color: '#E53935' },
  receiverRelationship: {
    fontSize: 12, fontFamily: F.m.semiBold, color: '#9CA3AF',
    textAlign: 'center',
  },
  receiverRelationshipSelected: { color: '#E53935' },
  receiverName: {
    fontSize: 11, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 15,
  },
  receiverAddWrap: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  receiverAddLabel: {
    fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF',
    textAlign: 'center', lineHeight: 15,
  },

  // ── Health overview ──
  healthSection: { marginHorizontal: 20, marginBottom: 20 },
  healthHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  healthTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },
  healthManage: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '47.5%', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  metricTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  metricIconWrap: {
    width: 34, height: 34, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  metricBadge: {
    borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2,
  },
  metricBadgeText: { fontSize: 10, fontFamily: F.m.semiBold },
  metricLabel: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 4 },
  metricValue: { fontSize: 24, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5 },
  metricValueGreen: { fontSize: 18, color: '#5D8CBD' },
  metricSub: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },

  // ── Activity snapshot header ──
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  snapshotTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },
  snapshotViewAll: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  // ── Activity tabs ──
  tabRow: { paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 50, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E5E7EB', gap: 6,
  },
  tabPillActive: { backgroundColor: '#E84545', borderColor: '#E84545' },
  tabLabel: { fontSize: 13, fontFamily: F.m.semiBold, color: '#6B7280' },
  tabLabelActive: { color: '#FFF' },
  tabBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 11, fontFamily: F.m.bold, color: '#6B7280' },
  tabBadgeTextActive: { color: '#FFF' },

  // ── Date picker ──
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  dateItem: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#FFF', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  dateItemActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  dateDayLabel: { fontSize: 12, fontFamily: F.m.medium, color: '#9CA3AF' },
  dateDateLabel: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },
  dateLabelActive: { color: '#FFF' },

  // ── Task items ──
  taskList: { paddingHorizontal: 20, gap: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14,
    borderLeftWidth: 4, borderLeftColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  taskCardDone: { opacity: 0.6 },
  taskCardInner: { flex: 1, padding: 14, gap: 4 },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  tagChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontFamily: F.m.bold, letterSpacing: 0.3 },
  criticalChip: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
  },
  criticalText: { fontSize: 10, fontFamily: F.m.bold, color: '#EF4444', letterSpacing: 0.3 },
  taskTitle: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  taskSub: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280' },
  taskTime: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  taskTimeText: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF' },
  taskAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEE2E2', marginRight: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  taskAvatarText: { fontSize: 14, fontFamily: F.m.bold, color: '#E53935' },
  taskCheckbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  taskCheckDone: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Recent Activity ──
  activitySection: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activityTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },
  activityViewAll: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  activityEmpty: { paddingVertical: 20, alignItems: 'center' },
  activityEmptyText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' },

  activityList: { gap: 0 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  activitySpineCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 6,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  activityLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#F3F4F6',
    marginTop: 4,
    minHeight: 32,
  },
  activityContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityAvatarText: { fontSize: 13, fontFamily: F.m.bold, color: '#E53935' },
  activityTime: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  activityDesc: { fontSize: 13, fontFamily: F.i.regular, color: '#374151', lineHeight: 19 },
  activityActor: { fontFamily: F.m.bold, color: '#111' },
  activityVerb: { fontFamily: F.i.regular, color: '#374151' },
  activityTarget: { fontFamily: F.m.semiBold, color: '#111' },
  activityNote: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
  },
  activityNoteText: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 18 },

});

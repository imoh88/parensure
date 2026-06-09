import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { authApi } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { storage } from '@/lib/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Add, ArrowLeft, Calendar, ClipboardText, Health } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelfTask {
  id: string;
  title: string;
  category: string;
  status: string;
  scheduledTimes: string[];
  priority: string;
  frequency: string;
}

interface SelfAppointment {
  id: string;
  title: string;
  status: string;
  scheduledTimes: string[];
  priority: string;
  providerName?: string;
  location?: string;
  reminderMinutes?: number;
}

// ─── Setup banner (no care receiver profile yet) ──────────────────────────────

function SetupBanner({ onSetup }: { onSetup: () => void }) {
  return (
    <View style={s.setupCard}>
      <View style={s.setupIconWrap}>
        <Ionicons name="person-add-outline" size={36} color="#E53935" />
      </View>
      <Text style={s.setupTitle}>Set Up Your Care Profile</Text>
      <Text style={s.setupBody}>
        Create a personal care profile so you can track your own tasks, medications, and appointments — just like a care receiver.
      </Text>
      <TouchableOpacity style={s.setupBtn} onPress={onSetup} activeOpacity={0.85}>
        <Text style={s.setupBtnText}>Create My Care Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#DC2626',
  NORMAL: '#E53935',
  LOW: '#9CA3AF',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  COMPLETED: '#22C55E',
  MISSED: '#DC2626',
  CANCELLED: '#9CA3AF',
};

function TaskRow({ task }: { task: SelfTask }) {
  return (
    <View style={s.itemCard}>
      <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority] ?? '#E53935' }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.itemTitle}>{task.title}</Text>
        <Text style={s.itemMeta}>
          {task.category} · {task.scheduledTimes.join(', ') || 'No time set'}
        </Text>
      </View>
      <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[task.status] + '22' }]}>
        <Text style={[s.statusText, { color: STATUS_COLOR[task.status] ?? '#9CA3AF' }]}>
          {task.status}
        </Text>
      </View>
    </View>
  );
}

function ApptRow({ appt }: { appt: SelfAppointment }) {
  return (
    <View style={s.itemCard}>
      <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLOR[appt.priority] ?? '#E53935' }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.itemTitle}>{appt.title}</Text>
        <Text style={s.itemMeta}>
          {appt.providerName ? `${appt.providerName} · ` : ''}
          {appt.scheduledTimes.join(', ') || 'No time set'}
          {appt.location ? ` · ${appt.location}` : ''}
        </Text>
      </View>
      <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[appt.status] + '22' }]}>
        <Text style={[s.statusText, { color: STATUS_COLOR[appt.status] ?? '#9CA3AF' }]}>
          {appt.status}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ManageSelfScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser, setSelfCareReceiverId, selfCareReceiverId, syncProfile } = useAuthStore();

  const hasLinkedCR =
    selfCareReceiverId !== null ||
    user?.linkedAccountTypes?.includes('CARE_RECEIVER') === true;

  const [settingUp, setSettingUp] = useState(false);
  const [tasks, setTasks] = useState<SelfTask[]>([]);
  const [appointments, setAppointments] = useState<SelfAppointment[]>([]);
  const [loading, setLoading] = useState(hasLinkedCR);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSelfData = useCallback(async () => {
    try {
      // Both CAREGIVER and CARE_RECEIVER have VIEW_OWN_TASKS / VIEW_OWN_APPOINTMENTS,
      // so no X-Active-Role switch is needed here.
      const [tRes, aRes] = await Promise.all([
        apiClient.get('/task/mine'),
        apiClient.get('/appointment/mine'),
      ]);
      if (tRes.data?.success) setTasks(tRes.data.data ?? []);
      if (aRes.data?.success) setAppointments(aRes.data.data ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    if (hasLinkedCR) {
      setLoading(true);
      fetchSelfData().finally(() => setLoading(false));
    }
  }, [hasLinkedCR, fetchSelfData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSelfData();
    setRefreshing(false);
  }, [fetchSelfData]);

  const handleSetup = async () => {
    setSettingUp(true);
    try {
      const res = await authApi.addLinkedProfile('CARE_RECEIVER');
      if (res.success && res.data) {
        const { token, user: updatedUser, careReceiverId } = res.data;
        // Swap token so future requests have linkedAccountTypes in JWT
        if (token) await storage.setToken(token);
        if (updatedUser) await updateUser(updatedUser as any);
        if (careReceiverId) await setSelfCareReceiverId(careReceiverId);
        setLoading(true);
        await fetchSelfData();
        setLoading(false);
      }
    } catch (err: any) {
      const status: number = err.response?.status;
      const msg: string = err.response?.data?.message ?? err.message ?? '';
      if (status === 400 && msg.includes('already have')) {
        // Profile already exists — sync selfCareReceiverId from server then load data
        await syncProfile();
        setLoading(true);
        await fetchSelfData();
        setLoading(false);
        return;
      }
      Alert.alert('Error', msg || 'Could not create profile.');
    } finally {
      setSettingUp(false);
    }
  };

  const myName = user?.fullName ?? 'Me';
  const initial = myName.charAt(0).toUpperCase();

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <ArrowLeft size={22} color="#111" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.title}>My Care Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          hasLinkedCR ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E53935"
              colors={['#E53935']}
            />
          ) : undefined
        }
      >
        {/* Profile pill */}
        <View style={s.profileRow}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{myName}</Text>
            <Text style={s.profileSub}>
              {hasLinkedCR ? 'Care Receiver (self)' : 'Caregiver'}
            </Text>
          </View>
        </View>

        {!hasLinkedCR ? (
          // ── Setup flow
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            {settingUp ? (
              <View style={s.loadingCard}>
                <ActivityIndicator color="#E53935" size="large" />
                <Text style={s.loadingText}>Creating your care profile…</Text>
              </View>
            ) : (
              <SetupBanner onSetup={handleSetup} />
            )}
          </View>
        ) : loading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator color="#E53935" size="large" />
          </View>
        ) : (
          // ── Data view
          <View style={{ paddingHorizontal: 20 }}>
            {/* Quick-add row */}
            <View style={s.quickAddRow}>
              <TouchableOpacity
                style={s.quickAddBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/add-task',
                    params: { selfCareReceiverId: selfCareReceiverId ?? '' },
                  })
                }
              >
                <ClipboardText size={18} color="#E53935" variant="Bold" />
                <Text style={s.quickAddText}>Add Task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.quickAddBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/add-appointment',
                    params: { selfCareReceiverId: selfCareReceiverId ?? '' },
                  })
                }
              >
                <Calendar size={18} color="#E53935" variant="Bold" />
                <Text style={s.quickAddText}>Add Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.quickAddBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/add-task',
                    params: { selfCareReceiverId: selfCareReceiverId ?? '', category: 'MEDICATION' },
                  })
                }
              >
                <Health size={18} color="#E53935" variant="Bold" />
                <Text style={s.quickAddText}>Add Medication</Text>
              </TouchableOpacity>
            </View>

            {/* Tasks */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>My Tasks</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/add-task',
                      params: { selfCareReceiverId: selfCareReceiverId ?? '' },
                    })
                  }
                >
                  <Add size={20} color="#E53935" variant="Linear" />
                </TouchableOpacity>
              </View>
              {tasks.length === 0 ? (
                <Text style={s.emptyText}>No tasks yet. Add your first task above.</Text>
              ) : (
                tasks.map((t) => <TaskRow key={t.id} task={t} />)
              )}
            </View>

            {/* Medications (tasks with category MEDICATION) */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>My Medications</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/add-task',
                      params: { selfCareReceiverId: selfCareReceiverId ?? '', category: 'MEDICATION' },
                    })
                  }
                >
                  <Add size={20} color="#E53935" variant="Linear" />
                </TouchableOpacity>
              </View>
              {tasks.filter((t) => t.category === 'MEDICATION').length === 0 ? (
                <Text style={s.emptyText}>No medications tracked yet.</Text>
              ) : (
                tasks
                  .filter((t) => t.category === 'MEDICATION')
                  .map((t) => <TaskRow key={t.id} task={t} />)
              )}
            </View>

            {/* Appointments */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>My Appointments</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/add-appointment',
                      params: { selfCareReceiverId: selfCareReceiverId ?? '' },
                    })
                  }
                >
                  <Add size={20} color="#E53935" variant="Linear" />
                </TouchableOpacity>
              </View>
              {appointments.length === 0 ? (
                <Text style={s.emptyText}>No appointments yet.</Text>
              ) : (
                appointments.map((a) => <ApptRow key={a.id} appt={a} />)
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  title: { fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E53935',
  },
  avatarText: { fontSize: 22, fontFamily: F.m.bold, color: '#E53935' },
  profileName: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },
  profileSub: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },

  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' },

  setupCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  setupIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginBottom: 4,
  },
  setupTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', textAlign: 'center' },
  setupBody: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  setupBtn: {
    backgroundColor: '#E53935',
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 4,
  },
  setupBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 14 },

  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    marginTop: 8,
  },
  quickAddBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  quickAddText: { fontSize: 11, fontFamily: F.m.semiBold, color: '#E53935', textAlign: 'center' },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  itemTitle: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111', marginBottom: 2 },
  itemMeta: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: F.m.bold },

  emptyText: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF', paddingVertical: 8 },
});

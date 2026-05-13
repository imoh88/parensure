import { alertApi } from '@/lib/api/alert';
import { F } from '@/lib/fonts';
import { Alert, AlertType } from '@/lib/types';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'Crisis' | 'Attention Needed' | 'Resolved';

const TABS: Tab[] = ['Crisis', 'Attention Needed', 'Resolved'];

function isCritical(a: Alert) {
  return a.severity === 'CRITICAL';
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just Now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case 'SOS_TRIGGERED': return 'SOS TRIGGERED';
    case 'FALL_DETECTED': return 'FALL DETECTED';
    case 'MISSED_MEDICATION': return 'MISSED MEDICATION';
    case 'LOW_ACTIVITY': return 'LOW ACTIVITY';
    case 'UPCOMING_MEDICATION': return 'UPCOMING MEDICATION';
    case 'DEVICE_OFFLINE': return 'DEVICE OFFLINE';
  }
}

function alertTypeColor(type: AlertType): string {
  switch (type) {
    case 'SOS_TRIGGERED':
    case 'FALL_DETECTED':
    case 'MISSED_MEDICATION':
      return '#E53935';
    case 'DEVICE_OFFLINE':
      return '#E53935';
    case 'LOW_ACTIVITY':
    case 'UPCOMING_MEDICATION':
      return '#F6A623';
  }
}

function cardBg(type: AlertType): string {
  switch (type) {
    case 'SOS_TRIGGERED':
    case 'FALL_DETECTED':
    case 'MISSED_MEDICATION':
    case 'DEVICE_OFFLINE':
      return '#FFF0F0';
    case 'LOW_ACTIVITY':
    case 'UPCOMING_MEDICATION':
      return '#FFF8E7';
  }
}

function timeBadgeColor(type: AlertType): string {
  switch (type) {
    case 'SOS_TRIGGERED':
    case 'FALL_DETECTED':
    case 'MISSED_MEDICATION':
    case 'DEVICE_OFFLINE':
      return '#E53935';
    default:
      return '#F6A623';
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={es.wrap}>
      <View style={es.circle}>
        <View style={es.innerCircle}>
          <Ionicons name="checkmark" size={28} color="#fff" />
        </View>
      </View>
      <Text style={es.title}>All clear</Text>
      <Text style={es.body}>No alerts right now. Your loved ones are{'\n'}doing well.</Text>
    </View>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert;
  onCheckIn: () => void;
  onResolve: () => void;
  onPress: () => void;
  loading: boolean;
}

function AlertCard({ alert, onCheckIn, onResolve, onPress, loading }: AlertCardProps) {
  const receiverName = alert.careReceiver?.user?.fullName ?? 'Care Receiver';
  const typeColor = alertTypeColor(alert.type);
  const bg = cardBg(alert.type);
  const timeColor = timeBadgeColor(alert.type);
  const isResolved = alert.status === 'RESOLVED';

  return (
    <TouchableOpacity style={[c.card, { borderLeftColor: typeColor }]} activeOpacity={0.85} onPress={onPress}>
      {/* Header */}
      <View style={c.header}>
        <View style={c.receiverRow}>
          <View style={c.avatar}>
            {alert.careReceiver?.user?.profileImageKey ? (
              <Image source={{ uri: alert.careReceiver.user.profileImageKey }} style={c.avatarImg} />
            ) : (
              <View style={[c.avatarImg, c.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color="#ccc" />
              </View>
            )}
          </View>
          <View>
            <Text style={c.receiverName}>{receiverName}</Text>
            <Text style={[c.typeLabel, { color: typeColor }]}>{alertTypeLabel(alert.type)}</Text>
          </View>
        </View>
        <Text style={[c.time, { color: timeColor }]}>{formatTime(alert.createdAt)}</Text>
      </View>

      {/* Message bubble */}
      <View style={[c.bubble, { backgroundColor: bg }]}>
        <Text style={c.bubbleText}>{alert.message}</Text>
      </View>

      {/* Actions */}
      {!isResolved && (
        <View style={c.actions}>
          <TouchableOpacity
            style={c.btnCheckIn}
            onPress={onCheckIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={c.btnCheckInText}>Check In</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={c.btnResolve}
            onPress={onResolve}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={c.btnResolveText}>Resolved</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Response Protocol Banner ─────────────────────────────────────────────────

function ProtocolBanner({ tab }: { tab: Tab }) {
  if (tab === 'Resolved') return null;
  const isCrit = tab === 'Crisis';
  return (
    <View style={pb.wrap}>
      <Ionicons name="information-circle-outline" size={18} color="#888" style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={pb.title}>RESPONSE PROTOCOL</Text>
        <Text style={pb.body}>
          {isCrit
            ? 'Crisis alerts require immediate action. Please respond to SOS and fall alerts without delay to ensure the safety of your care receiver.'
            : 'Amber alerts indicate a deviation from regular patterns. Please acknowledge or resolve these alerts within the hour to ensure continuity of care.'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Crisis');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // only used for resolve

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await alertApi.getAll();
      setAlerts(res.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Filter alerts by tab
  const filtered = alerts.filter((a) => {
    if (activeTab === 'Resolved') return a.status === 'RESOLVED';
    if (activeTab === 'Crisis') return a.status !== 'RESOLVED' && isCritical(a);
    return a.status !== 'RESOLVED' && !isCritical(a);
  });

  const handleCheckIn = (alertId: string) => {
    router.push({ pathname: '/(app)/alert-detail', params: { id: alertId } });
  };

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      const res = await alertApi.resolve(alertId);
      if (res.data) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? res.data! : a)));
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Alerts</Text>
        <Text style={s.sub}>Needs your attention</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#E53935" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAlerts(true)} tintColor="#E53935" />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {filtered.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  loading={actionLoading === alert.id}
                  onCheckIn={() => handleCheckIn(alert.id)}
                  onResolve={() => handleResolve(alert.id)}
                  onPress={() => router.push({ pathname: '/(app)/alert-detail', params: { id: alert.id } })}
                />
              ))}
              <ProtocolBanner tab={activeTab} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5 },
  sub: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EBEBEB',
  },
  tabActive: { backgroundColor: '#E53935' },
  tabText: { fontSize: 13, fontFamily: F.m.medium, color: '#555' },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  receiverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  receiverName: { fontSize: 14, fontFamily: F.m.bold, color: '#111' },
  typeLabel: { fontSize: 11, fontFamily: F.m.bold, letterSpacing: 0.3, marginTop: 1 },
  time: { fontSize: 12, fontFamily: F.i.medium },
  bubble: { borderRadius: 10, padding: 12 },
  bubbleText: { fontSize: 13, fontFamily: F.i.regular, color: '#444', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10 },
  btnCheckIn: {
    flex: 1, backgroundColor: '#E53935', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  btnCheckInText: { fontSize: 14, fontFamily: F.m.bold, color: '#fff' },
  btnResolve: {
    flex: 1, borderWidth: 1.5, borderColor: '#E53935', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  btnResolveText: { fontSize: 14, fontFamily: F.m.bold, color: '#E53935' },
});

const pb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  title: { fontSize: 11, fontFamily: F.m.bold, color: '#555', letterSpacing: 0.4 },
  body: { fontSize: 12, fontFamily: F.i.regular, color: '#888', marginTop: 3, lineHeight: 17 },
});

const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48 },
  circle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#EDF7EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  innerCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2E9B40',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontFamily: F.m.xBold, color: '#111', marginBottom: 10 },
  body: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});

import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { notificationApi } from '@/lib/api/notification';
import { F } from '@/lib/fonts';
import { Notification } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupNotifications(items: Notification[]): { label: string; items: Notification[] }[] {
  const map = new Map<string, Notification[]>();
  for (const n of items) {
    const label = groupLabel(n.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getAll();
      if (res.success && res.data) setNotifications(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async (groupLabel: string) => {
    setMarkingAll(groupLabel);
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      Alert.alert('Error', 'Could not mark notifications as read.');
    } finally {
      setMarkingAll(null);
    }
  };

  const groups = groupNotifications(notifications);

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => router.push('/(app)/notification-settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color="#E53935" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#E53935" size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E53935"
              colors={['#E53935']}
            />
          }
        >
          {groups.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyText}>No notifications yet</Text>
            </View>
          )}

          {groups.map((group) => (
            <View key={group.label} style={s.group}>
              {/* Group header */}
              <View style={s.groupHeader}>
                <Text style={s.groupLabel}>{group.label}</Text>
                <TouchableOpacity
                  onPress={() => handleMarkAllRead(group.label)}
                  activeOpacity={0.7}
                  disabled={markingAll === group.label}
                >
                  <Text style={s.markAllText}>
                    {markingAll === group.label ? 'Marking…' : 'Mark All Read'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Notification items */}
              {group.items.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={s.item}
                  onPress={() => !n.isRead && handleMarkRead(n.id)}
                  activeOpacity={0.8}
                >
                  <View style={s.dotCol}>
                    {!n.isRead && <View style={s.dot} />}
                  </View>
                  <View style={s.itemContent}>
                    <Text style={[s.itemTitle, !n.isRead && s.itemTitleUnread]}>
                      {n.title}
                    </Text>
                    <Text style={s.itemBody}>{n.body}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },

  group: { marginBottom: 28 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  groupLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  markAllText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  item: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },
  dotCol: { width: 10, paddingTop: 5, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E53935' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: F.m.semiBold, color: '#374151', marginBottom: 3 },
  itemTitleUnread: { fontFamily: F.m.bold, color: '#111' },
  itemBody: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 20 },
});

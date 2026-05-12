import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { BackendConversation } from '@/lib/types';
import { Messages } from 'iconsax-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <View style={[avatarStyles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[avatarStyles.initial, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  fallback: { backgroundColor: '#7B61F8', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFF', fontFamily: F.m.bold },
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<BackendConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.getConversations();
      if (res.success && res.data) setConversations(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openChat = (conversationId: string, participantName: string) => {
    router.push({
      pathname: '/(app)/chat-room',
      params: { conversationId, userName: participantName, from: '/(app)/chat' },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#7B61F8" style={{ marginTop: 60 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Messages size={64} color="#D1D5DB" variant="Linear" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyBody}>
            Your conversations with caregivers and care receivers will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const other = item.participants.find((p) => p.userId !== user?.id);
            const name = other?.user.fullName ?? 'Unknown';
            const lastMsg = item.messages[0]?.content ?? '';
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => openChat(item.id, name)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarWrapper}>
                  <Avatar name={name} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{name}</Text>
                    <Text style={styles.rowTime}>{timeAgo(item.updatedAt)}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.rowPreview} numberOfLines={1}>{lastMsg}</Text>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontFamily: F.m.xBold, color: '#111' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: F.m.bold, color: '#111', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  avatarWrapper: { marginRight: 14 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  rowTime: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  rowBottom: { flexDirection: 'row', alignItems: 'center' },
  rowPreview: { flex: 1, fontSize: 13, fontFamily: F.i.regular, color: '#6B7280' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7B61F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: { fontSize: 11, fontFamily: F.m.bold, color: '#FFF' },
  separator: { height: 1, backgroundColor: '#F5F5FA', marginLeft: 82 },
});

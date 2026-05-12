import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { BackendMessage } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send2 } from 'iconsax-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const QUICK_REPLIES = ["I'm feeling good", 'Took my meds', 'Call me?'];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `TODAY, ${time.toUpperCase()}`;
  if (d.toDateString() === yesterday.toDateString()) return `YESTERDAY, ${time.toUpperCase()}`;
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase() + `, ${time.toUpperCase()}`;
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const { conversationId, userName, from } = useLocalSearchParams<{
    conversationId: string;
    userName: string;
    from?: string;
  }>();
  const { user } = useAuthStore();

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (from) router.push(from as any);
      else router.back();
      return true;
    });
    return () => sub.remove();
  }, [router, from]));

  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const res = await chatApi.getMessages(conversationId);
    if (res.success && res.data) setMessages(res.data);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  useEffect(() => {
    if (conversationId) chatApi.markRead(conversationId).catch(() => {});
  }, [conversationId]);

  const send = async (content?: string) => {
    const msg = (content ?? text).trim();
    if (!msg || !conversationId) return;
    if (!content) setText('');
    setSending(true);
    try {
      const res = await chatApi.sendMessage(conversationId, msg);
      if (res.success && res.data) setMessages(prev => [...prev, res.data!]);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date — insert a single date header per day
  const grouped: (BackendMessage | { type: 'date'; label: string; key: string })[] = [];
  let lastDate = '';
  for (const m of messages) {
    const d = new Date(m.createdAt).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: 'date', label: formatDateHeader(m.createdAt), key: `date-${m.createdAt}` });
      lastDate = d;
    }
    grouped.push(m);
  }

  const nameInitial = (userName ?? 'U').charAt(0).toUpperCase();

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => from ? router.push(from as any) : router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={s.headerAvatarWrap}>
            <View style={s.headerAvatar}>
              <Text style={s.headerInitial}>{nameInitial}</Text>
            </View>
            <View style={s.onlineDot} />
          </View>
          <View>
            <Text style={s.headerName}>{userName}</Text>
            <Text style={s.headerStatus}>Online</Text>
          </View>
        </View>

        {/* <View style={s.headerActions}>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Video size={20} color="#E53935" variant="Linear" />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Call size={20} color="#E53935" variant="Linear" />
          </TouchableOpacity>
        </View> */}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        {loading ? (
          <ActivityIndicator color="#E53935" style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={grouped}
            keyExtractor={(item) => ('id' in item ? item.id : item.key)}
            style={{ flex: 1 }}
            contentContainerStyle={s.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              if ('type' in item) {
                return (
                  <View style={s.dateSeparator}>
                    <Text style={s.dateLabel}>{item.label}</Text>
                  </View>
                );
              }
              const mine = item.senderId === user?.id;
              return (
                <View style={[s.bubbleWrap, mine ? s.bubbleWrapMine : s.bubbleWrapTheirs]}>
                  <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                    <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{item.content}</Text>
                  </View>
                  <Text style={[s.bubbleTime, mine ? s.bubbleTimeMine : s.bubbleTimeTheirs]}>
                    {formatTime(item.createdAt)}
                    {mine ? (item.isRead ? '  ✓✓' : '  ✓') : ''}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Quick replies + input bar pinned to bottom */}
        <View style={s.bottomArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.quickRow}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_REPLIES.map((qr) => (
            <TouchableOpacity key={qr} style={s.quickChip} onPress={() => send(qr)} activeOpacity={0.75}>
              <Text style={s.quickChipText}>{qr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={[s.inputBar, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
          <TouchableOpacity style={s.plusBtn} activeOpacity={0.7}>
            <Text style={s.plusText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#C4C4C4"
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!text.trim() || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Send2 size={18} color="#FFF" variant="Bold" />
            )}
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
  },
  headerInitial: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF',
  },
  headerName: { fontSize: 16, fontFamily: F.m.bold, color: '#E53935', letterSpacing: -0.2 },
  headerStatus: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingHorizontal: 16, paddingVertical: 16, gap: 2 },

  dateSeparator: { alignItems: 'center', marginVertical: 16 },
  dateLabel: {
    fontSize: 11,
    fontFamily: F.m.semiBold,
    color: '#6B7280',
    paddingHorizontal: 14, 
    paddingVertical: 5,
    borderRadius: 20,
    letterSpacing: 0.3,
  },

  bubbleWrap: { marginVertical: 3, maxWidth: '80%' },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleMine: {
    backgroundColor: '#E53935',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, fontFamily: F.i.regular, color: '#111', lineHeight: 22 },
  bubbleTextMine: { color: '#FFF' },
  bubbleTime: { fontSize: 11, fontFamily: F.i.regular, marginTop: 4, paddingHorizontal: 4 },
  bubbleTimeMine: { color: '#9CA3AF', textAlign: 'right' },
  bubbleTimeTheirs: { color: '#9CA3AF' },

  bottomArea: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  quickRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 50, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    alignSelf: 'flex-start',
  },
  quickChipText: { fontSize: 13, fontFamily: F.m.medium, color: '#374151' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 6,
    backgroundColor: '#FFF',
  },
  plusBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  plusText: { fontSize: 22, color: '#6B7280', lineHeight: 26 },
  input: {
    flex: 1, backgroundColor: '#F3F4F6',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, fontFamily: F.i.regular, color: '#111',
    maxHeight: 120, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#F3A7A7' },
});

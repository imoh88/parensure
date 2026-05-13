import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Message, Trash } from 'iconsax-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  PRIMARY_CAREGIVER: 'Primary Caregiver',
  PROFESSIONAL_CAREGIVER: 'Professional Caregiver',
  FAMILY_OBSERVER: 'Family Observer',
  FRIEND_NEIGHBOR: 'Friend/Neighbor',
  EMERGENCY_CONTACT: 'Emergency Contact',
};

interface TeamMember {
  bookingId: string;
  caregiverProfileId: string;
  caregiverRole?: string;
  isPrimary?: boolean;
  isCurrentUser: boolean;
  caregiver: {
    id: string;
    userId: string;
    user: { id: string; fullName: string; profileImageKey?: string; isOnline?: boolean; lastSeen?: string } | null;
  } | null;
}

export default function ManageCareCircleScreen() {
  const router = useRouter();
  const { careReceiverId, receiverName } = useLocalSearchParams<{
    careReceiverId: string;
    receiverName?: string;
  }>();

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.push('/(app)/carecircle');
      return true;
    });
    return () => sub.remove();
  }, [router]));

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!careReceiverId) return;
    setLoading(true);
    try {
      const res = await caregiverApi.getCareReceiverTeam(careReceiverId);
      if (res.success && res.data) setTeam(res.data as TeamMember[]);
    } catch { }
    finally { setLoading(false); }
  }, [careReceiverId]);

  useFocusEffect(useCallback(() => { fetchTeam(); }, [fetchTeam]));

  const openChat = async (member: TeamMember) => {
    const userId = member.caregiver?.userId;
    const name = member.caregiver?.user?.fullName ?? 'Caregiver';
    if (!userId) return;
    try {
      const res = await chatApi.getOrCreateConversation(userId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/manage-carecircle' },
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  const confirmRemove = (member: TeamMember) => {
    const name = member.caregiver?.user?.fullName ?? 'this caregiver';
    Alert.alert(
      'Remove Caregiver',
      `Remove ${name} from this care circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleRemove(member),
        },
      ]
    );
  };

  const handleRemove = async (member: TeamMember) => {
    setRemovingId(member.bookingId);
    try {
      await caregiverApi.removeBooking(member.bookingId);
      setTeam(prev => prev.filter(m => m.bookingId !== member.bookingId));
    } catch {
      Alert.alert('Error', 'Could not remove caregiver.');
    } finally {
      setRemovingId(null);
    }
  };


  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.push('/(app)/carecircle')} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Care Circle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Care Circle</Text>
          {team.find((m) => m.isCurrentUser)?.isPrimary === true && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push({ pathname: '/(app)/add-care-receiver', params: { from: '/(app)/manage-carecircle', careReceiverId, receiverName } })}>
              <Text style={s.addNew}>Add New</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#E53935" style={{ marginTop: 40 }} />
        ) : team.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No caregivers assigned yet.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {team.map((member) => {
              const name = member.caregiver?.user?.fullName ?? 'Unknown';
              const initial = name.charAt(0).toUpperCase();
              const online = member.caregiver?.user?.isOnline ?? false;
              const isRemoving = removingId === member.bookingId;
              const roleLabel = member.isCurrentUser ? 'You' : (ROLE_LABELS[member.caregiverRole ?? ''] ?? 'Caregiver');
              const currentUserIsPrimary = team.find((m) => m.isCurrentUser)?.isPrimary === true;

              return (
                <View key={member.bookingId} style={s.card}>
                  <View style={s.memberAvatarWrap}>
                    <View style={s.memberAvatar}>
                      <Text style={s.memberInitial}>{initial}</Text>
                    </View>
                    <View style={[s.onlineDot, online ? s.onlineDotGreen : s.onlineDotGray]} />
                  </View>
                  <View style={s.memberInfo}>
                    <View style={s.nameRow}>
                      <Text style={s.memberName}>{name}</Text>
                      <View style={[s.availBadge, online ? s.availGreen : s.availGray]}>
                        <Text style={[s.availText, online ? s.availTextGreen : s.availTextGray]}>
                          {online ? 'Online' : 'Offline'}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.memberRole}>{roleLabel}</Text>
                  </View>

                  <TouchableOpacity
                    style={s.chatBtn}
                    onPress={() => openChat(member)}
                    activeOpacity={0.7}
                    disabled={member.isCurrentUser}
                  >
                    <Message size={18} color={member.isCurrentUser ? '#D1D5DB' : '#E53935'} variant="Linear" />
                  </TouchableOpacity>

                  {!member.isCurrentUser && currentUserIsPrimary && (
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => confirmRemove(member)}
                      activeOpacity={0.7}
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <ActivityIndicator size="small" color="#E53935" />
                      ) : (
                        <Trash size={18} color="#E53935" variant="Linear" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingBottom: 24 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 16, marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3 },
  addNew: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  list: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F3F4F6', borderRadius: 18, padding: 14,
  },
  memberAvatarWrap: { position: 'relative' },
  memberAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  memberInitial: { fontSize: 20, fontFamily: F.m.bold, color: '#6B7280' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#F3F4F6',
  },
  onlineDotGreen: { backgroundColor: '#10B981' },
  onlineDotGray: { backgroundColor: '#D1D5DB' },
  memberInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  memberName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  memberRole: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },

  availBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    borderWidth: 1,
  },
  availGreen: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  availGray: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  availText: { fontSize: 11, fontFamily: F.m.semiBold },
  availTextGreen: { color: '#10B981' },
  availTextGray: { color: '#6B7280' },

  chatBtn: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },
});

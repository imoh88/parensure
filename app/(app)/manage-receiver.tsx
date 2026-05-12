import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Message, Share, Trash } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TeamMember {
  bookingId: string;
  caregiverProfileId: string;
  isPrimary: boolean;
  isCurrentUser: boolean;
  caregiver: {
    id: string;
    userId: string;
    user: { id: string; fullName: string; profileImageKey?: string } | null;
  } | null;
}

export default function ManageReceiverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { careReceiverId, receiverName, relationship, status, from } = useLocalSearchParams<{
    careReceiverId: string;
    receiverName: string;
    relationship?: string;
    status?: string;
    from?: string;
  }>();

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (from) router.push(from as any);
      else router.back();
      return true;
    });
    return () => sub.remove();
  }, [router, from]));

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [vitalsAccess, setVitalsAccess] = useState(true);
  const [medicationLog, setMedicationLog] = useState(true);
  const [gpsLocation, setGpsLocation] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!careReceiverId) return;
    setLoading(true);
    try {
      const res = await caregiverApi.getCareReceiverTeam(careReceiverId);
      if (res.success && res.data) setTeam(res.data as TeamMember[]);
    } catch { }
    finally { setLoading(false); }
  }, [careReceiverId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const openChat = async (member: TeamMember) => {
    const userId = member.caregiver?.userId;
    const name = member.caregiver?.user?.fullName ?? 'Caregiver';
    if (!userId) return;
    try {
      const res = await chatApi.getOrCreateConversation(userId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/manage-receiver' },
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  const handleTransferTo = async (member: TeamMember) => {
    const name = member.caregiver?.user?.fullName ?? 'this caregiver';
    Alert.alert(
      'Transfer Primary Ownership',
      `Transfer primary caregiver role to ${name}? You will no longer be the primary caregiver for ${receiverName ?? 'this care receiver'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            setTransferring(true);
            setTransferModal(false);
            try {
              const res = await caregiverApi.transferPrimaryOwnership(
                careReceiverId,
                member.caregiverProfileId.toString(),
              );
              if (!res.success) throw new Error(res.message || 'Transfer failed');
              Alert.alert('Success', `Primary ownership transferred to ${name}.`);
              await fetchTeam();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not transfer ownership.');
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteProfile = () => {
    setDotMenuOpen(false);
    Alert.alert(
      'Remove Care Receiver',
      `Are you sure you want to remove ${receiverName ?? 'this care receiver'}? This will permanently disconnect you from their care circle.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const ownBooking = team.find(m => m.isCurrentUser);
            if (!ownBooking) return;
            setDeletingProfile(true);
            try {
              const res = await caregiverApi.removeBooking(ownBooking.bookingId);
              if (!res.success) throw new Error(res.message || 'Failed to remove');
              if (from) router.push(from as any);
              else router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove care receiver.');
            } finally {
              setDeletingProfile(false);
            }
          },
        },
      ]
    );
  };

  const initial = (receiverName ?? 'U').charAt(0).toUpperCase();
  const isNeedsAttention = (status ?? '') === 'NEEDS_ATTENTION';

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      <View style={[s.header]}>
        <TouchableOpacity style={s.backBtn} onPress={() => from ? router.push(from as any) : router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage</Text>
        <TouchableOpacity style={s.menuBtn} onPress={() => setDotMenuOpen(true)} activeOpacity={0.7}>
          <View style={s.menuDot} /><View style={s.menuDot} /><View style={s.menuDot} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Profile */}
        <View style={s.profileSection}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
          </View>
          <Text style={s.receiverName}>{receiverName ?? 'Unknown'}</Text>
          {relationship ? (
            <Text style={s.receiverMeta}>
              <Text style={s.relationshipTag}>({relationship})</Text>{'  '}
              <Text style={s.ageText}>82 Years Old</Text>
            </Text>
          ) : null}
          <View style={s.statusRow}>
            <View style={[s.statusBadge, isNeedsAttention ? s.statusRed : s.statusGreen]}>
              <View style={[s.statusDot, isNeedsAttention ? s.dotRed : s.dotGreen]} />
              <Text style={[s.statusText, isNeedsAttention ? s.statusTextRed : s.statusTextGreen]}>
                {isNeedsAttention ? 'NEEDS ATTENTION' : 'STABLE CONDITION'}
              </Text>
            </View>
            <View style={s.checkInRow}>
              <Clock size={14} color="#9CA3AF" variant="Linear" />
              <Text style={s.checkInText}>Last check-in: 2h ago</Text>
            </View>
          </View>
        </View>

        {/* Care Summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Care Summary</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{team.length}</Text>
              <Text style={s.summaryLabel}>Active{'\n'}Caregivers</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Dementia{'\n'}Care</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Next Appt:{'\n'}Tue</Text>
            </View>
          </View>
        </View>

        {/* Care Circle */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Care Circle</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(app)/manage-carecircle',
                params: { careReceiverId, receiverName },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={s.manageLink}>Manage</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#E53935" style={{ marginVertical: 20 }} />
        ) : (
          <View style={s.memberList}>
            {team.filter(m => !m.isCurrentUser).map((member) => {
              const name = member.caregiver?.user?.fullName ?? 'Unknown';
              const memberInitial = name.charAt(0).toUpperCase();
              return (
                <View key={member.bookingId} style={s.memberCard}>
                  <View style={s.memberAvatar}>
                    <Text style={s.memberInitial}>{memberInitial}</Text>
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{name}</Text>
                    <Text style={s.memberRole}>Primary Caregiver</Text>
                  </View>
                  <TouchableOpacity style={s.chatBtn} onPress={() => openChat(member)} activeOpacity={0.7}>
                    <Message size={20} color="#E53935" variant="Linear" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {team.filter(m => !m.isCurrentUser).length === 0 && (
              <Text style={s.emptyTeam}>No other caregivers assigned yet.</Text>
            )}
          </View>
        )}

        {/* Privacy & Permissions */}
        <Text style={s.sectionTitle2}>Privacy &amp; Permissions</Text>
        <View style={s.permCard}>
          <PermRow
            icon="❤️"
            title="Vitals Access"
            subtitle="Real-time health monitoring data"
            value={vitalsAccess}
            onChange={setVitalsAccess}
          />
          <View style={s.permDivider} />
          <PermRow
            icon="💊"
            title="Medication Log"
            subtitle="View and confirm daily prescriptions"
            value={medicationLog}
            onChange={setMedicationLog}
          />
          <View style={s.permDivider} />
          <PermRow
            icon="📍"
            title="GPS Location"
            subtitle="Active tracking and geo-fencing alerts"
            value={gpsLocation}
            onChange={setGpsLocation}
          />
        </View>

        {/* Account Management */}
        <Text style={s.sectionTitle2}>Account Management</Text>
        <View style={s.accountCard}>
          <TouchableOpacity style={s.accountRow} activeOpacity={0.7} onPress={() => setTransferModal(true)}>
            <Text style={s.accountRowText}>Transfer Primary Ownership</Text>
            <Text style={s.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={s.permDivider} />
          <TouchableOpacity style={s.accountRow} activeOpacity={0.7}>
            <Text style={[s.accountRowText, { color: '#E53935' }]}>Archive Profile</Text>
            <Text style={[s.accountRowChevron, { color: '#E53935' }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dot Menu Dropdown */}
      <Modal visible={dotMenuOpen} transparent animationType="fade" onRequestClose={() => setDotMenuOpen(false)}>
        <Pressable style={s.dotMenuOverlay} onPress={() => setDotMenuOpen(false)}>
          <Pressable style={s.dotMenuCard} onPress={() => {}}>
            <TouchableOpacity style={s.dotMenuItem} activeOpacity={0.7} onPress={() => setDotMenuOpen(false)}>
              <Share size={18} color="#374151" variant="Linear" />
              <Text style={s.dotMenuText}>Sharing Preferences</Text>
            </TouchableOpacity>
            <View style={s.dotMenuDivider} />
            <TouchableOpacity
              style={s.dotMenuItem}
              activeOpacity={0.7}
              onPress={handleDeleteProfile}
              disabled={deletingProfile}
            >
              {deletingProfile
                ? <ActivityIndicator size="small" color="#E53935" />
                : <Trash size={18} color="#E53935" variant="Linear" />
              }
              <Text style={[s.dotMenuText, { color: '#E53935' }]}>Delete Profile</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Transfer Primary Ownership Modal */}
      <Modal visible={transferModal} transparent animationType="slide" onRequestClose={() => setTransferModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setTransferModal(false)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Transfer Primary Ownership</Text>
            <Text style={s.modalSubtitle}>Select a caregiver to become the new primary caregiver for {receiverName ?? 'this care receiver'}.</Text>

            {team.filter(m => !m.isCurrentUser).length === 0 ? (
              <Text style={s.emptyTeam}>No other caregivers are assigned to transfer to.</Text>
            ) : (
              team.filter(m => !m.isCurrentUser).map((member) => {
                const name = member.caregiver?.user?.fullName ?? 'Unknown';
                const memberInitial = name.charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    key={member.bookingId}
                    style={s.transferRow}
                    activeOpacity={0.7}
                    onPress={() => handleTransferTo(member)}
                    disabled={transferring}
                  >
                    <View style={s.memberAvatar}>
                      <Text style={s.memberInitial}>{memberInitial}</Text>
                    </View>
                    <View style={s.memberInfo}>
                      <Text style={s.memberName}>{name}</Text>
                      {member.isPrimary && (
                        <Text style={s.primaryBadge}>Current Primary</Text>
                      )}
                    </View>
                    <Text style={s.accountRowChevron}>›</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setTransferModal(false)} activeOpacity={0.7}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

function PermRow({
  icon, title, subtitle, value, onChange,
}: {
  icon: string; title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.permRow}>
      <View style={s.permIcon}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={s.permInfo}>
        <Text style={s.permTitle}>{title}</Text>
        <Text style={s.permSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: '#E53935' }}
        thumbColor="#FFF"
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },
  menuBtn: { flexDirection: 'row', gap: 3, width: 40, alignItems: 'center', justifyContent: 'center' },
  menuDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#374151' },

  scroll: { paddingBottom: 24 },

  profileSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20 },
  avatarWrap: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: '#E53935',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontFamily: F.m.bold, color: '#6B7280' },
  receiverName: { fontSize: 20, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3, marginBottom: 4 },
  receiverMeta: { fontSize: 14, marginBottom: 10 },
  relationshipTag: { fontFamily: F.m.semiBold, color: '#E53935' },
  ageText: { fontFamily: F.i.regular, color: '#6B7280' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusRed: { backgroundColor: '#FEF2F2' },
  statusGreen: { backgroundColor: '#ECFDF5' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotRed: { backgroundColor: '#E53935' },
  dotGreen: { backgroundColor: '#10B981' },
  statusText: { fontSize: 11, fontFamily: F.m.bold, letterSpacing: 0.3 },
  statusTextRed: { color: '#E53935' },
  statusTextGreen: { color: '#10B981' },
  checkInRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkInText: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },

  card: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16,
  },
  cardTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', marginBottom: 14, letterSpacing: -0.2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 22, fontFamily: F.m.xBold, color: '#E53935' },
  summaryLabel: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', textAlign: 'center', lineHeight: 16 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },
  manageLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  memberList: { paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F3F4F6', borderRadius: 16, padding: 14,
  },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  memberInitial: { fontSize: 18, fontFamily: F.m.bold, color: '#6B7280' },
  memberInfo: { flex: 1, gap: 3 },
  memberName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  memberRole: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  chatBtn: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTeam: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  sectionTitle2: { fontSize: 16, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2, paddingHorizontal: 16, marginBottom: 12 },

  permCard: {
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden',
  },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  permIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  permInfo: { flex: 1, gap: 2 },
  permTitle: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
  permSubtitle: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280' },
  permDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 14 },

  accountCard: {
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  accountRowText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  accountRowChevron: { fontSize: 20, color: '#9CA3AF' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 20, lineHeight: 19 },

  transferRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F3F4F6', borderRadius: 16, padding: 14, marginBottom: 10,
  },
  primaryBadge: { fontSize: 11, fontFamily: F.m.bold, color: '#E53935', marginTop: 2 },

  dotMenuOverlay: {
    flex: 1,
  },
  dotMenuCard: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 4,
    minWidth: 200,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dotMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dotMenuText: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#374151',
  },
  dotMenuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },

  cancelBtn: {
    marginTop: 8, borderRadius: 50, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  cancelBtnText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#6B7280' },
});

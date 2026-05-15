import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { careReceiverApi } from '@/lib/api/careReceiver';
import { caregiverApi } from '@/lib/api/caregiver';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useCareCircleStore } from '@/lib/store/careCircleStore';
import { useCaregiverDashboardStore } from '@/lib/store/caregiverDashboardStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Add, Clock, Message, Notification, Trash } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Care Receiver View ───────────────────────────────────────────────────────

function CareReceiverCircle() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { invites, setInvites, isStale } = useCareCircleStore();
  const [loading, setLoading] = useState(invites.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const fetchInvites = useCallback(async (force = false) => {
    if (!force && !isStale()) return; // cache is fresh — skip fetch
    try {
      const res = await careReceiverApi.getMyCaregivers();
      if (res.success && res.data) setInvites(res.data as any[]);
    } catch {}
  }, [isStale, setInvites]);

  useFocusEffect(
    useCallback(() => {
      if (isStale()) {
        setLoading(invites.length === 0); // show spinner only on first load
        fetchInvites().finally(() => setLoading(false));
      }
    }, [fetchInvites, isStale, invites.length])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInvites(true);
    setRefreshing(false);
  }, [fetchInvites]);

  const openChat = async (invite: any) => {
    const caregiverUserId: string | undefined =
      invite.caregiverProfile?.userId ?? invite.caregiverProfile?.user?.id;
    if (!caregiverUserId) return;
    setOpeningChat(invite.id);
    try {
      const res = await chatApi.getOrCreateConversation(caregiverUserId);
      if (res.success && res.data) {
        const name =
          invite.caregiverProfile?.user?.fullName ??
          invite.caregiverProfile?.fullName ??
          'Caregiver';
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/carecircle' },
        });
      }
    } catch {
    } finally {
      setOpeningChat(null);
    }
  };

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* Header */}
      <View style={[cr.header, { paddingTop: insets.top + 12 }]}>
        <Text style={cr.title}>Care Circle</Text>
        <Text style={cr.subtitle}>
          Your circle is here for you, {firstName}. Who would you like to speak with today?
        </Text>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#E53935" size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E53935"
              colors={['#E53935']}
            />
          }
        >
          {/* ── Family Members section ── */}
          <View style={cr.sectionWrap}>
            <View style={cr.sectionHeader}>
              <Text style={cr.sectionTitle}>Family Members</Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/add-care-receiver')}
                activeOpacity={0.7}
                style={cr.sectionAction}
              >
                <Add size={14} color="#E53935" variant="Linear" />
                <Text style={cr.sectionActionText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {/* Family members list — placeholder (no API data yet) */}
            <View style={cr.emptySection}>
              <Text style={cr.emptySectionText}>No family members added yet.</Text>
            </View>
          </View>

          <View style={cr.divider} />

          {/* ── Care Circle section ── */}
          <View style={cr.sectionWrap}>
            <View style={cr.sectionHeader}>
              <Text style={cr.sectionTitle}>Care Circle</Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/chat')}
                activeOpacity={0.7}
              >
                <Text style={cr.sectionActionText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {invites.length === 0 ? (
              <View style={cr.emptySection}>
                <Text style={cr.emptySectionText}>
                  Your accepted caregivers will appear here once they join your care circle.
                </Text>
              </View>
            ) : (
              invites.map((invite) => {
                const fullName =
                  invite.caregiverProfile?.user?.fullName ??
                  invite.caregiverProfile?.fullName ??
                  'Caregiver';
                const name = fullName.split(' ')[0] ?? fullName;
                const initial = name.charAt(0).toUpperCase();
                const isOnline = invite.caregiverProfile?.user?.isOnline ?? false;
                const isPrimary = invite.isFirstInvite ?? false;
                const roleLabel = isPrimary
                  ? 'Primary Caregiver'
                  : (ROLE_LABELS[invite.caregiverRole ?? ''] ?? invite.caregiverRole ?? 'Caregiver');
                const isLoading = openingChat === invite.id;

                return (
                  <TouchableOpacity
                    key={invite.id}
                    style={cr.row}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/caregiver-detail',
                        params: {
                          inviteId: invite.id,
                          caregiverUserId:
                            invite.caregiverProfile?.userId ??
                            invite.caregiverProfile?.user?.id ??
                            '',
                          name: fullName,
                          email: invite.caregiverProfile?.user?.email ?? '',
                          phone: invite.caregiverProfile?.user?.phoneNumber ?? '',
                          isPrimary: String(isPrimary),
                          isOnline: String(isOnline),
                          from: '/(app)/carecircle',
                        },
                      })
                    }
                  >
                    {/* Avatar */}
                    <View style={cr.avatarWrap}>
                      <View style={cr.avatar}>
                        <Text style={cr.avatarInitial}>{initial}</Text>
                      </View>
                      <View style={[cr.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#D1D5DB' }]} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={cr.rowName}>{name}</Text>
                        <View style={[cr.availBadge, { backgroundColor: isOnline ? '#DCFCE7' : '#F3F4F6' }]}>
                          <View style={[cr.availDot, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
                          <Text style={[cr.availText, { color: isOnline ? '#15803D' : '#6B7280' }]}>
                            {isOnline ? 'Available' : 'Unavailable'}
                          </Text>
                        </View>
                      </View>
                      <Text style={cr.roleLabel}>{roleLabel}</Text>
                    </View>

                    {/* Action icons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={cr.iconBtn}
                        onPress={() => openChat(invite)}
                        disabled={isLoading}
                        activeOpacity={0.7}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#E53935" />
                        ) : (
                          <Message size={18} color="#E53935" variant="Linear" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={cr.iconBtn} activeOpacity={0.7}>
                        <Ionicons name="call-outline" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Caregiver View ───────────────────────────────────────────────────────────

interface BookingWithReceiver {
  id: string;
  careReceiverId: string;
  status: string;
  careReceiver: {
    id: string;
    userId: string;
    medicalNotes?: string;
    user: {
      id: string;
      fullName: string;
      profileImageKey?: string;
      relationship?: string;
      isOnline?: boolean;
      lastSeen?: string;
      lastLoginAt?: string;
    } | null;
  } | null;
}

function formatLastSeen(
  isOnline?: boolean,
  lastSeen?: string,
  lastLoginAt?: string
): string {
  if (isOnline) return 'Online now';
  const ts = lastSeen ?? lastLoginAt;
  if (!ts) return 'Never logged in';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ROLE_LABELS: Record<string, string> = {
  PRIMARY_CAREGIVER: 'Primary Caregiver',
  PROFESSIONAL_CAREGIVER: 'Professional Caregiver',
  FAMILY_OBSERVER: 'Family Observer',
  FRIEND_NEIGHBOR: 'Friend/Neighbor',
  EMERGENCY_CONTACT: 'Emergency Contact',
  OTHER: 'Other',
};

interface TeamMember {
  bookingId: string;
  caregiverProfileId: string;
  caregiverRole?: string;
  isPrimary: boolean;
  receiveSosAlerts?: boolean;
  isCurrentUser: boolean;
  caregiver: {
    id: string;
    userId: string;
    user: { id: string; fullName: string; email?: string; phone?: string; dateOfBirth?: string; gender?: string; profileImageKey?: string } | null;
  } | null;
}

function PermRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
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

function CaregiverCircle() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    bookings, setBookings, isStale,
    getTeam, setTeam: storeSetTeam, isTeamStale,
  } = useCaregiverDashboardStore();

  const [loadingBookings, setLoadingBookings] = useState(bookings.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // selectedIdx: 0 = "Me", 1..n = bookings[idx-1]
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Per-selected-receiver state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const [vitalsAccess, setVitalsAccess] = useState(true);
  const [medicationLog, setMedicationLog] = useState(true);
  const [gpsLocation, setGpsLocation] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const fetchBookings = useCallback(async (force = false) => {
    if (!force && !isStale()) return;
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) setBookings(res.data as BookingWithReceiver[]);
    } catch {}
  }, [isStale, setBookings]);

  useFocusEffect(
    useCallback(() => {
      if (isStale()) {
        setLoadingBookings(bookings.length === 0);
        fetchBookings().finally(() => setLoadingBookings(false));
      }
    }, [fetchBookings, isStale, bookings.length])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings(true);
    setRefreshing(false);
  }, [fetchBookings]);

  const selectedBooking = selectedIdx > 0 ? bookings[selectedIdx - 1] : null;

  const fetchTeam = useCallback(async (careReceiverId: string, force = false) => {
    if (!force && !isTeamStale(careReceiverId)) {
      // Serve from cache — no loading flash
      setTeam(getTeam(careReceiverId) as TeamMember[]);
      return;
    }
    setTeamLoading(true);
    try {
      const res = await caregiverApi.getCareReceiverTeam(careReceiverId);
      const members = (res.success && res.data) ? res.data as TeamMember[] : [];
      storeSetTeam(careReceiverId, members);
      setTeam(members);
    } catch {
      setTeam([]);
    } finally {
      setTeamLoading(false);
    }
  }, [isTeamStale, getTeam, storeSetTeam]);

  const fetchActivityLog = useCallback(async (careReceiverId: string) => {
    setLoadingActivity(true);
    try {
      const res = await caregiverApi.getActivityLog(careReceiverId, 3);
      setActivityLog(res.success && res.data ? res.data : []);
    } catch {
      setActivityLog([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // Load team when selected receiver changes
  useEffect(() => {
    if (!selectedBooking) { setTeam([]); setActivityLog([]); return; }
    setVitalsAccess(true);
    setMedicationLog(true);
    setGpsLocation(false);
    fetchTeam(selectedBooking.careReceiverId);
    fetchActivityLog(selectedBooking.careReceiverId);
  }, [selectedBooking?.careReceiverId, fetchTeam, fetchActivityLog]);

  // On screen focus, refresh team only if stale
  useFocusEffect(
    useCallback(() => {
      if (selectedBooking?.careReceiverId) {
        fetchTeam(selectedBooking.careReceiverId);
      }
    }, [selectedBooking?.careReceiverId, fetchTeam])
  );

  const [openingReceiverChat, setOpeningReceiverChat] = useState(false);

  const openReceiverChat = async (booking: BookingWithReceiver) => {
    const userId = booking.careReceiver?.userId;
    const name = booking.careReceiver?.user?.fullName ?? 'Care Receiver';
    if (!userId) return;
    setOpeningReceiverChat(true);
    try {
      const res = await chatApi.getOrCreateConversation(userId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/carecircle' },
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    } finally {
      setOpeningReceiverChat(false);
    }
  };

  const openChat = async (member: TeamMember) => {
    const userId = member.caregiver?.userId;
    const name = member.caregiver?.user?.fullName ?? 'Caregiver';
    if (!userId) return;
    setOpeningChat(member.bookingId);
    try {
      const res = await chatApi.getOrCreateConversation(userId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/carecircle' },
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    } finally {
      setOpeningChat(null);
    }
  };

  const handleTransferTo = async (member: TeamMember) => {
    if (!selectedBooking) return;
    const name = member.caregiver?.user?.fullName ?? 'this caregiver';
    const receiverName = selectedBooking.careReceiver?.user?.fullName ?? 'this care receiver';
    Alert.alert(
      'Transfer Primary Ownership',
      `Transfer primary caregiver role to ${name}? You will no longer be the primary caregiver for ${receiverName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            setTransferring(true);
            setTransferModal(false);
            try {
              await caregiverApi.transferPrimaryOwnership(
                selectedBooking.careReceiverId,
                member.caregiverProfileId.toString()
              );
              Alert.alert('Success', `Primary ownership transferred to ${name}.`);
              const res = await caregiverApi.getCareReceiverTeam(selectedBooking.careReceiverId);
              if (res.success && res.data) {
                storeSetTeam(selectedBooking.careReceiverId, res.data as TeamMember[]);
                setTeam(res.data as TeamMember[]);
              }
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

  const myName = user?.fullName ?? 'Me';
  const myInitial = myName.charAt(0).toUpperCase();

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={s.title}>Care Circle</Text>
          <Text style={s.subtitle}>Here's what's happening today</Text>
        </View>
        <TouchableOpacity
          style={s.messagesBtn}
          // onPress={() => router.push('/(app)/chat')}
          activeOpacity={0.8}
        >
          <Text style={[s.messagesBtnText]}>Manage</Text>
        </TouchableOpacity>
      </View>

      {loadingBookings ? (
        <View style={s.loadingWrap}>
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
          {/* ── Story strip ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.stripRow}
          >
            {/* Me */}
            <TouchableOpacity
              style={s.stripItem}
              onPress={() => setSelectedIdx(0)}
              activeOpacity={0.8}
            >
              <View style={[s.stripAvatarRing, selectedIdx === 0 && s.stripAvatarRingActive]}>
                <View style={s.stripAvatar}>
                  <Text style={s.stripInitial}>{myInitial}</Text>
                </View>
              </View>
              <Text style={[s.stripRelationship, selectedIdx === 0 && s.stripRelationshipActive]}>
                Me
              </Text>
              <Text style={s.stripName} numberOfLines={2}>
                {myName.split(' ').slice(0, 2).join('\n')}
              </Text>
            </TouchableOpacity>

            {/* Care receivers */}
            {bookings.map((booking, idx) => {
              const name = booking.careReceiver?.user?.fullName ?? 'Unknown';
              const relationship = booking.careReceiver?.user?.relationship;
              const initial = name.charAt(0).toUpperCase();
              const itemIdx = idx + 1;
              const selected = itemIdx === selectedIdx;
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={s.stripItem}
                  onPress={() => setSelectedIdx(itemIdx)}
                  activeOpacity={0.8}
                >
                  <View style={[s.stripAvatarRing, selected && s.stripAvatarRingActive]}>
                    <View style={s.stripAvatar}>
                      <Text style={s.stripInitial}>{initial}</Text>
                    </View>
                  </View>
                  {relationship ? (
                    <Text
                      style={[s.stripRelationship, selected && s.stripRelationshipActive]}
                      numberOfLines={1}
                    >
                      {relationship}
                    </Text>
                  ) : null}
                  <Text style={s.stripName} numberOfLines={2}>
                    {name.split(' ').slice(0, 2).join('\n')}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add */}
            <TouchableOpacity
              style={s.stripItem}
              onPress={() => router.push('/(app)/add-care-receiver')}
              activeOpacity={0.8}
            >
              <View style={s.stripAddRing}>
                <Add size={22} color="#9CA3AF" variant="Linear" />
              </View>
              <Text style={s.stripAddLabel}>Add Love</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={s.divider} />

          {/* ── "Me" selected: show empty / profile prompt ── */}
          {selectedIdx === 0 && (
            <View style={s.mePanel}>
              <Text style={s.mePanelTitle}>Welcome, {myName.split(' ')[0]}</Text>
              <Text style={s.mePanelBody}>
                Select a care receiver above to view their care summary, circle, and settings.
              </Text>
              {bookings.length === 0 && (
                <TouchableOpacity
                  style={s.addFirstBtn}
                  onPress={() => router.push('/(app)/add-care-receiver')}
                  activeOpacity={0.85}
                >
                  <Text style={s.addFirstBtnText}>Add Care Receiver</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Receiver detail panel ── */}
          {selectedIdx > 0 && selectedBooking && (() => {
            const receiverName = selectedBooking.careReceiver?.user?.fullName ?? 'Unknown';
            const sortedTeam = [...team].sort((a, b) => (a.isCurrentUser ? -1 : b.isCurrentUser ? 1 : 0));
            const viewerIsPrimary = sortedTeam.find((m) => m.isCurrentUser)?.isPrimary === true;

            const rawNotes = selectedBooking.careReceiver?.medicalNotes ?? '';
            const conditions = (rawNotes.split('\n')[0] ?? '')
              .split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);

            return (
              <View style={{ paddingBottom: 24 }}>

                {/* ── Big Chat button ── */}
                <View style={s.chatSection}>
                  <TouchableOpacity
                    style={s.chatBigBtn}
                    onPress={() => openReceiverChat(selectedBooking)}
                    disabled={openingReceiverChat}
                    activeOpacity={0.85}
                  >
                    {openingReceiverChat ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Message size={18} color="#FFF" variant="Linear" />
                        <Text style={s.chatBigBtnText}>Chat</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <View style={s.checkInRow}>
                    <Clock size={12} color="#9CA3AF" variant="Linear" />
                    <Text style={s.checkInText}>
                      Last check-in: {formatLastSeen(
                        selectedBooking.careReceiver?.user?.isOnline,
                        selectedBooking.careReceiver?.user?.lastSeen,
                        selectedBooking.careReceiver?.user?.lastLoginAt,
                      )}
                    </Text>
                  </View>
                </View>

                {/* ── Care Summary ── */}
                <View style={s.card}>
                  <Text style={s.cardTitle}>Care Summary</Text>
                  <View style={s.summaryRow}>
                    <View style={s.summaryItem}>
                      <Text style={s.summaryValue}>{team.length}</Text>
                      <Text style={s.summaryLabel}>Active{'\n'}Caregivers</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryItem}>
                      <Text style={s.summaryValue}>{conditions.length}</Text>
                      <Text style={s.summaryLabel}>Health{'\n'}Conditions</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryItem}>
                      <Text style={s.summaryValue}>{activityLog.length}</Text>
                      <Text style={s.summaryLabel}>Current{'\n'}Activities</Text>
                    </View>
                  </View>
                </View>

                {/* ── Care Circle ── */}
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Care Circle</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/add-care-receiver')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.addNewLink}>Add New</Text>
                  </TouchableOpacity>
                </View>

                {teamLoading ? (
                  <ActivityIndicator color="#E53935" style={{ marginVertical: 16 }} />
                ) : (
                  <View style={s.memberList}>
                    {sortedTeam.length === 0 ? (
                      <Text style={s.emptyTeam}>No caregivers assigned yet.</Text>
                    ) : (
                      sortedTeam.map((member) => {
                        const mName = member.isCurrentUser
                          ? (user?.fullName ?? 'Me')
                          : (member.caregiver?.user?.fullName ?? 'Unknown');
                        const mInitial = mName.charAt(0).toUpperCase();
                        const isLoading = openingChat === member.bookingId;
                        const roleLabel = member.isPrimary
                          ? 'Primary Caregiver'
                          : (ROLE_LABELS[member.caregiverRole ?? ''] ?? 'Caregiver');
                        const mPhoto = member.isCurrentUser
                          ? (user as any)?.profileImageKey
                          : member.caregiver?.user?.profileImageKey;
                        return (
                          <TouchableOpacity
                            key={member.bookingId}
                            style={s.memberCard}
                            activeOpacity={member.isCurrentUser ? 1 : 0.8}
                            onPress={() => {
                              if (member.isCurrentUser) return;
                              router.push({
                                pathname: '/(app)/caregiver-detail',
                                params: {
                                  caregiverUserId: member.caregiver?.userId ?? '',
                                  name: mName,
                                  email: member.caregiver?.user?.email ?? '',
                                  phone: member.caregiver?.user?.phone ?? '',
                                  dob: member.caregiver?.user?.dateOfBirth ?? '',
                                  gender: member.caregiver?.user?.gender ?? '',
                                  isPrimary: String(member.isPrimary ?? false),
                                  caregiverRole: member.caregiverRole ?? '',
                                  receiveSosAlerts: String(member.receiveSosAlerts ?? false),
                                  bookingId: member.bookingId,
                                  careReceiverId: selectedBooking.careReceiverId,
                                  viewerIsPrimary: String(viewerIsPrimary),
                                  from: '/(app)/carecircle',
                                },
                              });
                            }}
                          >
                            <View style={s.memberAvatar}>
                              {mPhoto ? (
                                <Image source={{ uri: mPhoto }} style={s.memberAvatarImg} />
                              ) : (
                                <Text style={s.memberInitial}>{mInitial}</Text>
                              )}
                            </View>
                            <View style={s.memberInfo}>
                              <View style={s.memberNameRow}>
                                <Text style={s.memberName}>
                                  {mName}{member.isCurrentUser ? ' (You)' : ''}
                                </Text>
                              </View>
                              <Text style={s.memberRole}>{roleLabel}</Text>
                            </View>
                            {!member.isCurrentUser && (
                              <TouchableOpacity
                                style={s.chatIconBtn}
                                onPress={() => openChat(member)}
                                disabled={isLoading}
                                activeOpacity={0.7}
                              >
                                {isLoading ? (
                                  <ActivityIndicator size="small" color="#E53935" />
                                ) : (
                                  <Message size={20} color="#E53935" variant="Linear" />
                                )}
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {/* ── Account Management — primary caregiver only ── */}
                {viewerIsPrimary && (
                  <>
                    <Text style={s.sectionTitle2}>Account Management</Text>
                    <View style={s.accountCardList}>
                      <TouchableOpacity
                        style={s.accountCardRow}
                        activeOpacity={0.7}
                        onPress={() => router.push({
                          pathname: '/(app)/alerts-safety',
                          params: { careReceiverId: selectedBooking.careReceiverId, receiverName },
                        })}
                      >
                        <View style={s.accountIconWrap}>
                          <Notification size={20} color="#6B7280" variant="Bold" />
                        </View>
                        <Text style={s.accountRowTextNeutral}>Alerts and Safety</Text>
                        <Text style={s.accountRowChevron}>›</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={s.accountCardRow} activeOpacity={0.7}>
                        <View style={s.accountIconWrap}>
                          <Trash size={20} color="#E53935" variant="Bold" />
                        </View>
                        <Text style={[s.accountRowTextNeutral, { color: '#E53935' }]}>Delete Profile</Text>
                        <Text style={[s.accountRowChevron, { color: '#E53935' }]}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Recent Activity */}
                <View style={s.activitySection}>
                  <View style={s.activityHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} color="#E53935" variant="Bold" />
                      <Text style={s.sectionTitle2NoMargin}>Recent Activity</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push({
                        pathname: '/(app)/activity',
                        params: {
                          careReceiverId: selectedBooking.careReceiverId,
                          receiverName,
                        },
                      })}
                    >
                      <Text style={s.manageLink}>View All</Text>
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
                      {activityLog.slice(0, 3).map((entry: any, idx: number) => {
                        const displayed = activityLog.slice(0, 3);
                        const isLast = idx === displayed.length - 1;
                        const actorFirst = (entry.actorName as string ?? '').split(' ')[0] ?? entry.actorName;
                        const initial = actorFirst.charAt(0).toUpperCase();
                        const ACTION_LABEL: Record<string, string> = {
                          TASK_CREATED: 'created task',
                          TASK_COMPLETED: 'marked as complete',
                          TASK_CANCELLED: 'cancelled task',
                          APPOINTMENT_CREATED: 'added appointment',
                          SOS_TRIGGERED: 'triggered an SOS alert',
                          FALL_DETECTED: 'triggered a fall alert',
                        };
                        const isSos = entry.isSosAlert === true;
                        const verb = ACTION_LABEL[entry.action] ?? entry.action;

                        const d = new Date(entry.createdAt);
                        const now = new Date();
                        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        const timeStr = isToday ? `Today, ${time}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;

                        return (
                          <View key={entry.id ?? idx} style={s.activityRow}>
                            <View style={s.activitySpineCol}>
                              <View style={[s.activityDot, isSos && s.activityDotSos]} />
                              {!isLast && <View style={s.activityLine} />}
                            </View>
                            <View style={s.activityContent}>
                              <View style={s.activityTopRow}>
                                <View style={[s.activityAvatar, isSos && s.activityAvatarSos]}>
                                  <Text style={[s.activityAvatarText, isSos && s.activityAvatarTextSos]}>
                                    {isSos ? '🆘' : initial}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={s.activityTime}>{timeStr}</Text>
                                  <Text style={s.activityDesc}>
                                    <Text style={s.activityActor}>{actorFirst}</Text>
                                    {' '}{verb}
                                    {!isSos && <>{' '}<Text style={s.activityTarget}>{entry.targetTitle}</Text></>}
                                    {'.'}
                                  </Text>
                                </View>
                              </View>
                              {isSos && entry.note ? (
                                <View style={s.activityNoteSos}>
                                  <Text style={s.activityNoteTextSos}>{entry.note}</Text>
                                </View>
                              ) : entry.note ? (
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
              </View>
            );
          })()}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Transfer Modal */}
      <Modal
        visible={transferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setTransferModal(false)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Transfer Primary Ownership</Text>
            <Text style={s.modalSubtitle}>
              Select a caregiver to become the new primary caregiver for{' '}
              {selectedBooking?.careReceiver?.user?.fullName ?? 'this care receiver'}.
            </Text>
            {team.filter((m) => !m.isCurrentUser).length === 0 ? (
              <Text style={s.emptyTeam}>No other caregivers are assigned to transfer to.</Text>
            ) : (
              team
                .filter((m) => !m.isCurrentUser)
                .map((member) => {
                  const name = member.caregiver?.user?.fullName ?? 'Unknown';
                  const mInitial = name.charAt(0).toUpperCase();
                  return (
                    <TouchableOpacity
                      key={member.bookingId}
                      style={s.transferRow}
                      activeOpacity={0.7}
                      onPress={() => handleTransferTo(member)}
                      disabled={transferring}
                    >
                      <View style={s.memberAvatar}>
                        <Text style={s.memberInitial}>{mInitial}</Text>
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
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setTransferModal(false)}
              activeOpacity={0.7}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CareCircleScreen() {
  const { activeRole } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';
  return isCareReceiver ? <CareReceiverCircle /> : <CaregiverCircle />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 4 },

  addCaregiverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 50,
  },
  addCaregiverBtnText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#E53935' },
  messagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messagesBtnText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#E53935' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 24 },

  // ── Care receiver (CARE_RECEIVER role) view ──
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111' },
  emptyBody: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  addFirstBtn: {
    backgroundColor: '#E53935',
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 8,
  },
  addFirstBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 14 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: F.m.semiBold,
    color: '#9CA3AF',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  caregiverList: { paddingHorizontal: 20, paddingTop: 20 },
  caregiverCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    gap: 16,
  },
  caregiverTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontFamily: F.m.bold, color: '#FFF' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#F9FAFB',
  },
  caregiverName: { fontSize: 17, fontFamily: F.m.bold, color: '#111', marginBottom: 3 },
  caregiverSpecialty: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { fontSize: 11, fontFamily: F.m.bold, color: '#10B981', letterSpacing: 0.4 },
  cardActions: { flexDirection: 'row', gap: 10 },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#E53935',
    borderRadius: 50,
    paddingVertical: 12,
  },
  chatBtnText: { fontSize: 14, fontFamily: F.m.bold, color: '#FFF' },

  chatSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 },
  chatBigBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#E53935', borderRadius: 20, paddingVertical: 14,
    paddingHorizontal: 64, alignSelf: 'center',
  },
  chatBigBtnText: { fontSize: 15, fontFamily: F.m.bold, color: '#FFF' },
  checkInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // ── Story strip ──
  stripRow: { paddingHorizontal: 20, paddingVertical: 20, gap: 20 },
  stripItem: { alignItems: 'center', gap: 4, width: 72 },
  stripAvatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripAvatarRingActive: { borderColor: '#E53935' },
  stripAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripInitial: { fontSize: 22, fontFamily: F.m.bold, color: '#6B7280' },
  stripRelationship: {
    fontSize: 11,
    fontFamily: F.m.semiBold,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  stripRelationshipActive: { color: '#E53935' },
  stripName: {
    fontSize: 11,
    fontFamily: F.i.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 15,
  },
  stripAddRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripAddLabel: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 20 },

  // ── Me panel ──
  mePanel: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 48, gap: 10 },
  mePanelTitle: { fontSize: 20, fontFamily: F.m.bold, color: '#111' },
  mePanelBody: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Check-in bar ──
  checkInBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  checkInLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checkInText: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  needsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  needsDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E53935' },
  needsText: { fontSize: 10, fontFamily: F.m.bold, color: '#E53935', letterSpacing: 0.3 },
  receiverMsgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  receiverMsgBtnText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#E53935' },

  // ── Care Summary card ──
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', marginBottom: 14, letterSpacing: -0.2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 22, fontFamily: F.m.xBold, color: '#E53935' },
  summaryLabel: {
    fontSize: 12,
    fontFamily: F.i.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  summaryMeta: { fontSize: 11, fontFamily: F.m.semiBold, color: '#E53935', marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },

  // ── Care Circle section ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },
  manageLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  addNewLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  memberList: { paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 14,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  memberInitial: { fontSize: 18, fontFamily: F.m.bold, color: '#6B7280' },
  memberInfo: { flex: 1, gap: 3 },
  memberName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  memberRole: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  chatIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTeam: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  // ── Privacy & Permissions ──
  sectionTitle2: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#111',
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  permCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    overflow: 'hidden',
  },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permInfo: { flex: 1, gap: 2 },
  permTitle: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
  permSubtitle: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280' },
  permDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 14 },

  // ── Account Management ──
  accountCardList: {
  paddingHorizontal: 16,
  gap: 10,
  marginBottom: 24,
},
accountCardRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
  backgroundColor: '#F3F4F6',
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 16,
},
accountIconWrap: {
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
accountIcon: {
  fontSize: 18,
},
accountRowTextNeutral: {
  flex: 1,
  fontSize: 15,
  fontFamily: F.m.semiBold,
  color: '#111',
},

  accountCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  accountRowText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  accountRowChevron: { fontSize: 20, color: '#9CA3AF' },

  // ── Transfer modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', marginBottom: 6 },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 19,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  primaryBadge: { fontSize: 11, fontFamily: F.m.bold, color: '#E53935', marginTop: 2 },
  cancelBtn: {
    marginTop: 8,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cancelBtnText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#6B7280' },

  // ── Recent Activity ──
  activitySection: { paddingHorizontal: 16, marginTop: 8, marginBottom: 24 },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle2NoMargin: { fontSize: 16, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },
  activityEmpty: { paddingVertical: 16, alignItems: 'center' },
  activityEmptyText: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },
  activityList: {},
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 52 },
  activitySpineCol: { width: 20, alignItems: 'center', paddingTop: 6 },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935' },
  activityLine: { flex: 1, width: 2, backgroundColor: '#F3F4F6', marginTop: 4, minHeight: 28 },
  activityContent: { flex: 1, paddingLeft: 12, paddingBottom: 18 },
  activityTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activityAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  activityAvatarText: { fontSize: 13, fontFamily: F.m.bold, color: '#E53935' },
  activityTime: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  activityDesc: { fontSize: 13, fontFamily: F.i.regular, color: '#374151', lineHeight: 19 },
  activityActor: { fontFamily: F.m.bold, color: '#111' },
  activityTarget: { fontFamily: F.m.semiBold, color: '#111' },
  activityNote: {
    marginTop: 8, backgroundColor: '#F9FAFB',
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#E5E7EB',
  },
  activityNoteText: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 18 },
  activityDotSos: { backgroundColor: '#DC2626' },
  activityAvatarSos: { backgroundColor: '#FEE2E2' },
  activityAvatarTextSos: { fontSize: 14 },
  activityNoteSos: {
    marginTop: 8, backgroundColor: '#FEF2F2',
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#E53935',
  },
  activityNoteTextSos: { fontSize: 12, fontFamily: F.i.regular, color: '#DC2626', lineHeight: 18 },
});

// ─── Care Receiver Circle Styles ──────────────────────────────────────────────

const cr = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', lineHeight: 20 },

  sectionWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#E53935' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20 },

  emptySection: { paddingVertical: 16, paddingHorizontal: 4 },
  emptySectionText: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF', lineHeight: 19 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontFamily: F.m.bold, color: '#FFF' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },

  rowName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },

  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontFamily: F.m.semiBold },

  roleLabel: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
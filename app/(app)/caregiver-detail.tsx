import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { useCareCircleStore } from '@/lib/store/careCircleStore';
import { useCaregiverDashboardStore } from '@/lib/store/caregiverDashboardStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Call, DocumentDownload, Location, Message, Notification, Profile, Sms, Trash } from 'iconsax-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ROLES = [
  { value: 'PROFESSIONAL_CAREGIVER', label: 'Professional Caregiver' },
  { value: 'FAMILY_OBSERVER', label: 'Family Observer' },
  { value: 'FRIEND_NEIGHBOR', label: 'Friend/Neighbor' },
  { value: 'EMERGENCY_CONTACT', label: 'Emergency Contact' },
  { value: 'OTHER', label: 'Other' },
];

export default function CaregiverDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    caregiverUserId: string;
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    address?: string;
    certifications?: string;
    profileImageKey?: string;
    caregiverRole?: string;
    isPrimary?: string;
    isOnline?: string;
    bookingId?: string;
    careReceiverId?: string;
    viewerIsPrimary?: string;
    receiveSosAlerts?: string;
  }>();

  const {
    caregiverUserId,
    name = 'Caregiver',
    email,
    phone,
    dob,
    gender,
    address,
    certifications,
    profileImageKey,
    caregiverRole,
    isPrimary,
    isOnline,
    bookingId,
    careReceiverId,
    viewerIsPrimary,
    receiveSosAlerts,
  } = params;

  const { invalidateTeam } = useCaregiverDashboardStore();
  const { clearCareCircle } = useCareCircleStore();

  const [openingChat, setOpeningChat] = useState(false);
  const [vitalsAccess, setVitalsAccess] = useState(true);
  const [medicationLog, setMedicationLog] = useState(true);
  const [gpsLocation, setGpsLocation] = useState(false);
  const [sosAlerts, setSosAlerts] = useState(receiveSosAlerts === 'true');
  const [togglingsos, setTogglingsos] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [pendingRole, setPendingRole] = useState<{ value: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const initial = name.charAt(0).toUpperCase();
  const online = isOnline === 'true';
  const primary = isPrimary === 'true';
  const canManage = viewerIsPrimary === 'true';
  const currentRoleLabel = primary
    ? 'Primary Caregiver'
    : (ROLES.find((r) => r.value === caregiverRole)?.label ?? 'Caregiver');

  const handleToggleSos = async (enabled: boolean) => {
    if (!careReceiverId || !bookingId) return;
    setTogglingsos(true);
    try {
      const res = await caregiverApi.toggleSosAlerts(careReceiverId, bookingId, enabled);
      if (res.success) {
        setSosAlerts(enabled);
      } else {
        Alert.alert('Error', 'Could not update SOS alert setting.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update SOS alert setting.');
    } finally {
      setTogglingsos(false);
    }
  };

  const openChat = async () => {
    if (!caregiverUserId) return;
    setOpeningChat(true);
    try {
      const res = await chatApi.getOrCreateConversation(caregiverUserId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/caregiver-detail' },
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    } finally {
      setOpeningChat(false);
    }
  };

  const handleDeleteProfile = () => {
    if (!bookingId) return;
    Alert.alert(
      'Remove Caregiver',
      `Remove ${name} from this care receiver's team? They will no longer have access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await caregiverApi.removeBooking(bookingId);
              if (res.success) {
                router.push('/(app)/carecircle');
              } else {
                Alert.alert('Error', 'Could not remove caregiver.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove caregiver.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Step 1: user picks a role → show confirmation popup
  const handleRoleSelect = (role: string) => {
    const found = ROLES.find((r) => r.value === role);
    if (!found) return;
    setPendingRole(found);
  };

  // Step 2: user confirms → call API
  const handleConfirmRole = async () => {
    if (!pendingRole || !bookingId || !careReceiverId) return;
    setSavingRole(true);
    try {
      const res = await caregiverApi.updateMemberRole(careReceiverId, bookingId, pendingRole.value);
      if (res.success) {
        // Bust the cache so care circle re-fetches on next focus
        invalidateTeam(careReceiverId);
        clearCareCircle();
        setPendingRole(null);
        setRoleModal(false);
        Alert.alert('Role Updated', `Role changed to ${pendingRole.label}.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update role.');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <ScreenWrapper bg="#F5F5F5" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push('/(app)/carecircle')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Care Circle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Profile Hero */}
        <View style={s.heroSection}>
          <View style={s.avatarWrap}>
            {profileImageKey ? (
              <Image source={{ uri: profileImageKey }} style={s.avatarCircle} />
            ) : (
              <View style={s.avatarCircle}>
                <Text style={s.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={[s.onlineDot, online ? s.onlineDotGreen : s.onlineDotGray]} />
          </View>
          <View style={s.heroNameRow}>
            <Text style={s.heroName}>{name}</Text>
            <View style={[s.availBadge, online ? s.availBadgeGreen : s.availBadgeGray]}>
              <Text style={[s.availText, online ? s.availTextGreen : s.availTextGray]}>
                {online ? 'Available' : 'Offline'}
              </Text>
            </View>
          </View>
          <Text style={s.heroRole}>{currentRoleLabel}</Text>
          {primary && <Text style={s.heroPrimary}>(Primary Caregiver)</Text>}
          <TouchableOpacity
            style={s.chatBtn}
            onPress={openChat}
            disabled={openingChat}
            activeOpacity={0.85}
          >
            {openingChat ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Message size={18} color="#FFF" variant="Linear" />
                <Text style={s.chatBtnText}>Chat</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Basic Information</Text>
          <InfoRow icon={<Profile size={18} color="#E53935" variant="Bold" />} label="Name" value={name} />
          {email ? <InfoRow icon={<Sms size={18} color="#E53935" variant="Bold" />} label="Personal" value={email} /> : null}
          {phone ? <InfoRow icon={<Call size={18} color="#E53935" variant="Bold" />} label="Phone Number" value={phone} /> : null}
          {dob ? <InfoRow icon={<Calendar size={18} color="#E53935" variant="Bold" />} label="Date of Birth" value={dob} /> : null}
          {gender ? <InfoRow icon={<Profile size={18} color="#6B7280" variant="Linear" />} label="Gender" value={gender} /> : null}
        </View>

        {address ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Location Information</Text>
            <InfoRow icon={<Location size={18} color="#E53935" variant="Bold" />} label="Full Address" value={address} />
          </View>
        ) : null}

        {certifications ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Certifications</Text>
            <View style={s.certRow}>
              <View style={s.certIcon}>
                <Text style={{ fontSize: 16 }}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.certName} numberOfLines={1}>{certifications}</Text>
                <Text style={s.certSize}>Document</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} style={s.certDownload}>
                <DocumentDownload size={20} color="#6B7280" variant="Linear" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Privacy & Permissions — primary caregiver only */}
        {canManage && (
          <>
            <Text style={s.sectionLabel}>Privacy &amp; Permissions</Text>
            <View style={s.permCard}>
              <PermRow icon="❤️" title="Vitals Access" subtitle="Real-time health monitoring data" value={vitalsAccess} onChange={setVitalsAccess} />
              <View style={s.permDivider} />
              <PermRow icon="💊" title="Medication Log" subtitle="View and confirm daily prescriptions" value={medicationLog} onChange={setMedicationLog} />
              <View style={s.permDivider} />
              <PermRow icon="📍" title="GPS Location" subtitle="Active tracking and geo-fencing alerts" value={gpsLocation} onChange={setGpsLocation} />
              {!primary && (
                <>
                  <View style={s.permDivider} />
                  <PermRow
                    icon="🆘"
                    title="SOS Alerts"
                    subtitle="Receive immediate alerts when triggered"
                    value={sosAlerts}
                    onChange={handleToggleSos}
                    disabled={togglingsos}
                  />
                </>
              )}
            </View>
          </>
        )}

        {/* Account Management — primary caregiver only */}
        {canManage && (
          <>
            <Text style={s.sectionLabel}>Account Management</Text>
            <TouchableOpacity style={s.accountRow} activeOpacity={0.7} onPress={() => setRoleModal(true)}>
              <View style={s.accountIconWrap}>
                <Notification size={18} color="#111" variant="Bold" />
              </View>
              <Text style={s.accountRowText}>Change Role</Text>
              <Text style={s.accountRowChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.accountRow} activeOpacity={0.7} onPress={handleDeleteProfile} disabled={deleting}>
              <View style={[s.accountIconWrap, s.accountIconRed]}>
                {deleting ? <ActivityIndicator size="small" color="#E53935" /> : <Trash size={18} color="#E53935" variant="Bold" />}
              </View>
              <Text style={[s.accountRowText, { color: '#E53935' }]}>Delete Profile</Text>
              <Text style={[s.accountRowChevron, { color: '#E53935' }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.accountRow} activeOpacity={0.7} onPress={handleDeleteProfile} disabled={deleting}>
              <View style={[s.accountIconWrap, s.accountIconRed]}>
                {deleting ? <ActivityIndicator size="small" color="#E53935" /> : <Trash size={18} color="#E53935" variant="Bold" />}
              </View>
              <Text style={[s.accountRowText, { color: '#E53935' }]}>Remove from Care Team</Text>
              <Text style={[s.accountRowChevron, { color: '#E53935' }]}>›</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change Role Modal */}
      <Modal visible={roleModal} transparent animationType="slide" onRequestClose={() => setRoleModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setRoleModal(false)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Role</Text>
              <TouchableOpacity style={s.modalClose} onPress={() => setRoleModal(false)} activeOpacity={0.7}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {savingRole ? (
              <ActivityIndicator color="#E53935" style={{ marginVertical: 32 }} />
            ) : (
              <View style={s.roleList}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={s.roleItem}
                    activeOpacity={0.7}
                    onPress={() => handleRoleSelect(role.value)}
                  >
                    <Text style={s.roleLabel}>{role.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Switch Role Confirmation Modal */}
      <Modal
        visible={!!pendingRole}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingRole(null)}
      >
        <Pressable style={s.confirmOverlay} onPress={() => setPendingRole(null)}>
          <Pressable style={s.confirmCard} onPress={() => {}}>
            <Text style={s.confirmTitle}>Switch Caregiver{'\n'}Role?</Text>
            <Text style={s.confirmBody}>
              This will switch the{' '}
              <Text style={s.confirmRoleText}>{currentRoleLabel}</Text>
              {' '}to the{' '}
              <Text style={s.confirmRoleText}>{pendingRole?.label}</Text>
              {' '}role
            </Text>
            <TouchableOpacity
              style={s.confirmBtn}
              onPress={handleConfirmRole}
              disabled={savingRole}
              activeOpacity={0.85}
            >
              {savingRole ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.confirmBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.confirmCancelBtn}
              onPress={() => setPendingRole(null)}
              activeOpacity={0.7}
            >
              <Text style={s.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function CustomToggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value]);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackBg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#E5E7EB', '#E53935'] });
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[tog.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[tog.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const tog = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});

function PermRow({ icon, title, subtitle, value, onChange, disabled }: {
  icon: string; title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={s.permRow}>
      <View style={s.permIconWrap}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={s.permInfo}>
        <Text style={s.permTitle}>{title}</Text>
        <Text style={s.permSubtitle}>{subtitle}</Text>
      </View>
      <CustomToggle value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap:8,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingBottom: 24 },

  heroSection: { backgroundColor: '#FFF', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FEE2E2',
    overflow: 'hidden',
  },
  avatarInitial: { fontSize: 36, fontFamily: F.m.bold, color: '#6B7280' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFF' },
  onlineDotGreen: { backgroundColor: '#10B981' },
  onlineDotGray: { backgroundColor: '#D1D5DB' },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroName: { fontSize: 20, fontFamily: F.m.bold, color: '#111' },
  heroRole: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 15 },
  heroPrimary: { fontSize: 13, fontFamily: F.i.regular, color: '#E53935', marginBottom: 16 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  availBadgeGreen: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  availBadgeGray: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  availText: { fontSize: 11, fontFamily: F.m.semiBold },
  availTextGreen: { color: '#10B981' },
  availTextGray: { color: '#6B7280' },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 14, alignSelf: 'stretch',
  },
  chatBtnText: { fontSize: 15, fontFamily: F.m.bold, color: '#FFF' },

  card: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, paddingVertical: 16, paddingHorizontal: 16 },
  cardTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },

  certRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  certIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  certName: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
  certSize: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },
  certDownload: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111', marginHorizontal: 16, marginBottom: 8, marginTop: 4 },

  permCard: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 16 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  permIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  permInfo: { flex: 1 },
  permTitle: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
  permSubtitle: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 2 },
  permDivider: { height: 1, backgroundColor: '#F3F4F6' },

  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6',
    borderRadius: 16, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 16,
  },
  accountIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  accountIconRed: { backgroundColor: '#FEE2E2' },
  accountRowText: { flex: 1, fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  accountRowChevron: { fontSize: 22, color: '#9CA3AF' },

  // Change Role Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 24, paddingHorizontal: 20, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontFamily: F.m.bold, color: '#111', flex: 1, textAlign: 'center' },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: '#6B7280', fontFamily: F.m.semiBold },

  roleList: { paddingHorizontal: 16, gap: 10, marginTop: 8 },
  roleItem: {
    backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6',
  },
  roleLabel: { fontSize: 16, fontFamily: F.m.medium, color: '#111' },

  // Switch Role Confirmation
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmCard: {
    width: '100%', backgroundColor: '#FFF',
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  confirmTitle: {
    fontSize: 22, fontFamily: F.m.xBold, color: '#111',
    textAlign: 'center', lineHeight: 30, marginBottom: 14,
  },
  confirmBody: {
    fontSize: 14, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  confirmRoleText: { fontFamily: F.m.bold, color: '#E53935' },
  confirmBtn: {
    width: '100%', height: 52, borderRadius: 26,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#E53935', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  confirmBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  confirmCancelBtn: { paddingVertical: 8 },
  confirmCancelText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E53935' },
});

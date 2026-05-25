import { caregiverApi } from '@/lib/api/caregiver';
import { chatApi } from '@/lib/api/chat';
import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageFromDob(dob?: string): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} Years Old`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon as any} size={18} color="#E53935" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CareReceiverDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { careReceiverId } = useLocalSearchParams<{ careReceiverId: string }>();

  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);

  const openChat = async (targetUserId: string, name: string) => {
    setOpeningChat(true);
    try {
      const res = await chatApi.getOrCreateConversation(targetUserId);
      if (res.success && res.data) {
        router.push({
          pathname: '/(app)/chat-room',
          params: { conversationId: res.data.id, userName: name, from: '/(app)/care-receiver-detail' },
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    } finally {
      setOpeningChat(false);
    }
  };

  useEffect(() => {
    if (!careReceiverId) return;
    caregiverApi.getCareReceiverProfile(careReceiverId)
      .then((res) => setProfile(res.data ?? null))
      .finally(() => setLoading(false));
  }, [careReceiverId]);

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }, s.center]}>
        <ActivityIndicator color="#E53935" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }, s.center]}>
        <Text style={s.notFound}>Care receiver not found.</Text>
      </View>
    );
  }

  const user = profile.user ?? {};
  const age = ageFromDob(user.dateOfBirth);
  const initial = (user.fullName ?? '?').charAt(0).toUpperCase();
  const location = [user.city, user.state].filter(Boolean).join(', ') || user.homeAddress;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Care Receiver</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero */}
        <View style={s.hero}>
          <View style={s.avatarRing}>
            {user.profileImageKey ? (
              <Image source={{ uri: user.profileImageKey }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatarImg, s.avatarPlaceholder]}>
                <Text style={s.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          {profile.isPrimary && (
            <View style={s.primaryBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#E53935" />
              <Text style={s.primaryBadgeText}>Primary Care Receiver</Text>
            </View>
          )}

          <Text style={s.heroName}>{user.fullName ?? 'Care Receiver'}</Text>

          {(user.relationship || age) ? (
            <Text style={s.heroMeta}>
              {user.relationship ? <Text style={s.heroRelationship}>({user.relationship})</Text> : null}
              {user.relationship && age ? '  ' : null}
              {age ?? null}
            </Text>
          ) : null}

          <TouchableOpacity
            style={s.chatBtn}
            onPress={() => openChat(user.id, user.fullName ?? 'Care Receiver')}
            disabled={openingChat}
            activeOpacity={0.85}
          >
            {openingChat ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
                <Text style={s.chatBtnText}>Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <Card title="Basic Information">
          <InfoRow icon="person-outline" label="Full Name" value={user.fullName} />
          <InfoRow icon="mail-outline" label="Email" value={user.email} />
          <InfoRow icon="call-outline" label="Phone Number" value={user.phone} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={user.dateOfBirth ? formatDate(user.dateOfBirth) : undefined} />
          <InfoRow icon="transgender-outline" label="Gender" value={user.gender} />
        </Card>

        {/* Location */}
        {(location || profile.address) ? (
          <Card title="Location">
            <InfoRow icon="location-outline" label="Address" value={profile.address ?? location} />
          </Card>
        ) : null}

        {/* Medical Notes */}
        {profile.medicalNotes ? (
          <Card title="Medical Notes">
            <View style={s.notesWrap}>
              <Text style={s.notesText}>{profile.medicalNotes}</Text>
            </View>
          </Card>
        ) : null}

        {/* Emergency Contact */}
        {profile.emergencyContact ? (() => {
          let ec: { name?: string; email?: string; phone?: string; relationship?: string } = {};
          try { ec = typeof profile.emergencyContact === 'string' ? JSON.parse(profile.emergencyContact) : profile.emergencyContact; } catch {}
          return (
            <Card title="Emergency Contact">
              <InfoRow icon="person-outline"   label="Name"         value={ec.name} />
              <InfoRow icon="heart-outline"     label="Relationship" value={ec.relationship} />
              <InfoRow icon="call-outline"      label="Phone"        value={ec.phone} />
              <InfoRow icon="mail-outline"      label="Email"        value={ec.email} />
            </Card>
          );
        })() : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, fontFamily: F.i.regular, color: '#888' },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: F.m.bold, color: '#111' },

  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  // Hero
  hero: {
    backgroundColor: '#FFF', borderRadius: 20,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
  },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: '#E53935',
    overflow: 'hidden', marginBottom: 14,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontFamily: F.m.bold, color: '#6B7280' },

  primaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF2F2', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  primaryBadgeText: { fontSize: 11, fontFamily: F.m.semiBold, color: '#E53935' },

  heroName: { fontSize: 22, fontFamily: F.m.xBold, color: '#111', marginBottom: 6 },
  heroMeta: { fontSize: 15, fontFamily: F.i.regular, color: '#555' },
  heroRelationship: { color: '#E53935', fontFamily: F.m.medium },

  // Card
  card: {
    backgroundColor: '#FFF', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  cardTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#111', marginBottom: 14 },

  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },

  // Notes
  notesWrap: {
    backgroundColor: '#FFF8F0', borderRadius: 12,
    padding: 14,
  },
  notesText: { fontSize: 14, fontFamily: F.i.regular, color: '#444', lineHeight: 21 },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, backgroundColor: '#E53935',
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 24,
  },
  chatBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#FFF' },
});

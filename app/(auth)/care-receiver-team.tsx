import { careReceiverApi } from '@/lib/api/careReceiver';
import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingInvite {
  id: string;
  name: string;
  role: string;
  sentAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return `sent ${d}d ago`;
  if (h >= 1) return `sent ${h}h ago`;
  return 'sent just now';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CareReceiverTeamScreen() {
  const router = useRouter();
  const { careReceiverId: _careReceiverId } = useLocalSearchParams<{ careReceiverId: string }>();

  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleSendInvite = async () => {
    if (!query.trim()) return;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
    if (!isEmail) {
      Alert.alert('Invalid', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      await careReceiverApi.inviteCaregiverByEmail(query.trim());
      setPendingInvites((prev) => [
        ...prev,
        { id: Date.now().toString(), name: query.trim(), role: 'Caregiver', sentAt: new Date().toISOString() },
      ]);
      setQuery('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to send invite.');
    } finally {
      setSending(false);
    }
  };

  const handleInviteBySms = () => {
    Alert.alert('Invite By SMS', 'SMS invite feature coming soon.');
  };

  const handleRevoke = (inviteId: string) => {
    Alert.alert('Revoke Invite', 'Are you sure you want to revoke this invite?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setRevoking(inviteId);
          try {
            setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
          } finally {
            setRevoking(null);
          }
        },
      },
    ]);
  };

  const handleFinish = () => {
    router.replace('/(app)');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add a Care Receiver</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.progressTrack}>
        <View style={s.progressFill} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Add your care team</Text>
        <Text style={s.subtitle}>
          Invite family or professionals to help with care.{'\n'}Collaborative care leads to better outcomes and more peace of mind.
        </Text>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search by email or Phone number"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="send"
            onSubmitEditing={handleSendInvite}
          />
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[s.sendBtn, (!query.trim() || sending) && { opacity: 0.5 }]}
          onPress={handleSendInvite}
          disabled={!query.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? <ActivityIndicator color="#FFF" /> : <Text style={s.sendBtnText}>Send Invite</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.smsBtn} onPress={handleInviteBySms} activeOpacity={0.7}>
          <Text style={s.smsBtnText}>Invite By SMS</Text>
        </TouchableOpacity>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <View style={s.pendingSection}>
            <Text style={s.pendingTitle}>Pending Invites</Text>
            {pendingInvites.map((invite, i) => (
              <View key={invite.id}>
                {i > 0 && <View style={s.dashedDivider} />}
                <View style={s.inviteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inviteName}>{invite.name}</Text>
                    <Text style={s.inviteMeta}>{invite.role} · {timeAgo(invite.sentAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.revokeBtn, revoking === invite.id && { opacity: 0.5 }]}
                    onPress={() => handleRevoke(invite.id)}
                    disabled={revoking === invite.id}
                    activeOpacity={0.7}
                  >
                    <Text style={s.revokeBtnText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer actions */}
        <View style={s.footer}>
          <TouchableOpacity style={s.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={s.finishBtnText}>Finish Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinish} activeOpacity={0.7}>
            <Text style={s.skipText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111827' },
  progressTrack: { height: 3, backgroundColor: '#F3F4F6' },
  progressFill: { height: '100%', width: '100%', backgroundColor: '#E53935' },

  scroll: { paddingHorizontal: 24, paddingBottom: 56, paddingTop: 20 },

  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111827', lineHeight: 40, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, marginBottom: 28 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F3F4F6', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.i.regular, color: '#111827', padding: 0 },

  sendBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  sendBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },

  smsBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  smsBtnText: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111827' },

  pendingSection: { marginBottom: 12 },
  pendingTitle: { fontSize: 18, fontFamily: F.m.xBold, color: '#111827', marginBottom: 16 },

  dashedDivider: {
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed', marginVertical: 4,
  },

  inviteRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  inviteName: { fontSize: 16, fontFamily: F.m.bold, color: '#111827', marginBottom: 3 },
  inviteMeta: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },

  revokeBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1.5, borderColor: '#E53935',
  },
  revokeBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  footer: { marginTop: 28, gap: 12 },
  finishBtn: { height: 56, borderRadius: 28, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center' },
  finishBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
  skipText: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111827', textAlign: 'center', paddingVertical: 8 },
});

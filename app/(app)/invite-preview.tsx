import { inviteApi, InvitePreview } from '@/lib/api/invite';
import { F } from '@/lib/fonts';
import { useCareCircleStore } from '@/lib/store/careCircleStore';
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

const CAPABILITIES = [
  { title: 'Receive alerts', desc: 'Real-time vitals and emergency notifications.' },
  { title: 'View activity', desc: 'Detailed timeline of daily care and medical events.' },
  { title: 'Edit care plan', desc: 'Adjust medications and caregiver schedules.' },
];

export default function InvitePreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inviteId } = useLocalSearchParams<{ inviteId: string }>();
  const { clearCareCircle } = useCareCircleStore();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!inviteId) return;
    inviteApi.getInvitePreview(inviteId)
      .then((res) => { if (res.success && res.data) setPreview(res.data); })
      .catch(() => Alert.alert('Error', 'Could not load invite details.'))
      .finally(() => setLoading(false));
  }, [inviteId]);

  const respond = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!inviteId) return;
    setResponding(true);
    try {
      const res = await inviteApi.respondToCaregiverInvite(inviteId, status);
      if (res.success) {
        clearCareCircle();
        if (status === 'ACCEPTED') {
          router.replace('/(app)/(tabs)');
        } else {
          router.back();
        }
      } else {
        Alert.alert('Error', 'Could not respond to invite.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not respond to invite.');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#E53935" size="large" />
      </View>
    );
  }

  if (!preview) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={s.errorText}>Invite not found or expired.</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const already = preview.status !== 'PENDING';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFF' }}
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={s.logoWrap}>
        <View style={s.logoCircle}>
          <Text style={s.logoEmoji}>👶</Text>
        </View>
      </View>

      {/* Welcome heading */}
      <Text style={s.welcome}>
        Welcome to{'\n'}
        <Text style={s.welcomeBrand}>Parensure</Text>
        {preview.invitee.firstName ? <Text style={s.welcomeName}>, {preview.invitee.firstName}</Text> : null}
      </Text>
      <Text style={s.welcomeBody}>
        You've been invited to help care for a loved one. By joining, you can stay updated on their wellbeing,
        receive important alerts, and support them when needed.
      </Text>

      {/* Inviter card */}
      <View style={s.inviterCard}>
        <View style={s.inviterAvatarWrap}>
          {preview.inviter.photo ? (
            <Image source={{ uri: preview.inviter.photo }} style={s.inviterAvatar} />
          ) : (
            <View style={s.inviterAvatar}>
              <Text style={s.inviterInitial}>{preview.inviter.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.inviterHeart}>
            <Text style={{ fontSize: 12 }}>❤️</Text>
          </View>
        </View>
        <Text style={s.inviterLabel}>{preview.inviter.name} has invited you</Text>
      </View>

      {/* Team strip */}
      {preview.team.totalCount > 0 && (
        <View style={s.teamSection}>
          <View style={s.teamAvatarRow}>
            {preview.team.members.map((m, i) => (
              <View key={i} style={[s.teamAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                {m.photo ? (
                  <Image source={{ uri: m.photo }} style={s.teamAvatarImg} />
                ) : (
                  <Text style={s.teamAvatarInitial}>{m.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
            ))}
            {preview.team.totalCount > preview.team.members.length && (
              <View style={[s.teamAvatar, s.teamAvatarMore, { marginLeft: -10, zIndex: 0 }]}>
                <Text style={s.teamAvatarMoreText}>
                  +{preview.team.totalCount - preview.team.members.length}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.teamBody}>
            You're joining {preview.team.totalCount} other{preview.team.totalCount !== 1 ? 's' : ''} in{' '}
            {preview.inviter.firstName}'s Circle. Your support ensures they receive the highest standard of
            personalized attention.
          </Text>
        </View>
      )}

      {/* Role card */}
      <View style={s.roleCard}>
        <View style={s.roleIconWrap}>
          <Text style={{ fontSize: 20 }}>🪪</Text>
        </View>
        <Text style={s.roleLabel}>YOUR ROLE</Text>
        <Text style={s.roleName}>{preview.role}</Text>
        <Text style={s.roleDesc}>{preview.roleDescription}</Text>
      </View>

      {/* Capabilities */}
      <Text style={s.capHeader}>Here's what you'll be able to do</Text>
      <View style={s.capList}>
        {CAPABILITIES.map((cap) => (
          <View key={cap.title} style={s.capRow}>
            <View style={s.capText}>
              <Text style={s.capTitle}>{cap.title}</Text>
              <Text style={s.capDesc}>{cap.desc}</Text>
            </View>
            <View style={s.capCheck}>
              <Text style={{ fontSize: 16 }}>✅</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      {already ? (
        <View style={s.alreadyWrap}>
          <Text style={s.alreadyText}>
            You have already {preview.status === 'ACCEPTED' ? 'accepted' : 'declined'} this invitation.
          </Text>
          <TouchableOpacity style={s.acceptBtn} onPress={() => router.replace('/(app)/(tabs)')} activeOpacity={0.85}>
            <Text style={s.acceptBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[s.acceptBtn, responding && { opacity: 0.7 }]}
            onPress={() => respond('ACCEPTED')}
            disabled={responding}
            activeOpacity={0.85}
          >
            {responding ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.acceptBtnText}>Accept &amp; Continue</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.declineBtn}
            onPress={() => respond('DECLINED')}
            disabled={responding}
            activeOpacity={0.7}
          >
            <Text style={s.declineBtnText}>Decline Invitation</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Footer */}
      <Text style={s.footer}>
        By continuing, you agree to our{' '}
        <Text style={s.footerLink}>Terms</Text>
        {'\n'}and{' '}
        <Text style={s.footerLink}>Privacy Policy</Text>.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 24, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280' },
  linkText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  // Logo
  logoWrap: { marginBottom: 16 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 26 },

  // Welcome
  welcome: {
    fontSize: 28, fontFamily: F.m.xBold, color: '#111',
    textAlign: 'center', lineHeight: 36, marginBottom: 12,
  },
  welcomeBrand: { color: '#E53935', fontFamily: F.m.xBold },
  welcomeName: { color: '#111', fontFamily: F.m.xBold },
  welcomeBody: {
    fontSize: 14, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  // Inviter card
  inviterCard: {
    width: '100%', backgroundColor: '#F9FAFB', borderRadius: 20,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    marginBottom: 28,
  },
  inviterAvatarWrap: { position: 'relative', marginBottom: 16 },
  inviterAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  inviterInitial: { fontSize: 30, fontFamily: F.m.bold, color: '#6B7280' },
  inviterHeart: {
    position: 'absolute', bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inviterLabel: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },

  // Team strip
  teamSection: { alignItems: 'center', marginBottom: 28, gap: 14 },
  teamAvatarRow: { flexDirection: 'row', alignItems: 'center' },
  teamAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF', overflow: 'hidden',
  },
  teamAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  teamAvatarInitial: { fontSize: 15, fontFamily: F.m.bold, color: '#6B7280' },
  teamAvatarMore: { backgroundColor: '#E53935' },
  teamAvatarMoreText: { fontSize: 12, fontFamily: F.m.bold, color: '#FFF' },
  teamBody: {
    fontSize: 13, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 20,
  },

  // Role card
  roleCard: {
    width: '100%', backgroundColor: '#F9FAFB', borderRadius: 20,
    padding: 20, marginBottom: 28,
  },
  roleIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 11, fontFamily: F.m.bold, color: '#9CA3AF',
    letterSpacing: 1, marginBottom: 6,
  },
  roleName: { fontSize: 22, fontFamily: F.m.xBold, color: '#111', marginBottom: 8 },
  roleDesc: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 20 },

  // Capabilities
  capHeader: {
    fontSize: 15, fontFamily: F.m.bold, color: '#111',
    marginBottom: 16, alignSelf: 'flex-start',
  },
  capList: { width: '100%', gap: 20, marginBottom: 36 },
  capRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  capText: { flex: 1 },
  capTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#111', marginBottom: 3 },
  capDesc: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19 },
  capCheck: { paddingTop: 2 },

  // Actions
  alreadyWrap: { width: '100%', alignItems: 'center', gap: 16, marginBottom: 24 },
  alreadyText: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', textAlign: 'center' },
  acceptBtn: {
    width: '100%', backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 14,
    shadowColor: '#E53935', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  acceptBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  declineBtn: { paddingVertical: 8, marginBottom: 28 },
  declineBtnText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },

  // Footer
  footer: {
    fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF',
    textAlign: 'center', lineHeight: 18,
  },
  footerLink: { color: '#E53935', fontFamily: F.m.semiBold },
});

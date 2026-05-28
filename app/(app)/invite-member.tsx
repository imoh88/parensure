import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { careReceiverApi } from '@/lib/api/careReceiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, TickCircle } from 'iconsax-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type InviteRole =
  | 'CARE_RECEIVER'
  | 'PROFESSIONAL_CAREGIVER'
  | 'FAMILY_OBSERVER'
  | 'FRIEND_NEIGHBOR'
  | 'EMERGENCY_CONTACT';

const CAREGIVER_ROLES: { key: InviteRole; label: string; description: string }[] = [
  {
    key: 'CARE_RECEIVER',
    label: 'Care Receiver',
    description: 'Can track their own schedule, check off daily tasks, and view health metrics.',
  },
  {
    key: 'PROFESSIONAL_CAREGIVER',
    label: 'Professional Caregiver',
    description: 'Supports daily care by completing assigned tasks and updating care information.',
  },
  {
    key: 'FAMILY_OBSERVER',
    label: 'Family Observer',
    description: 'Can view care updates, tasks, and health information, but cannot make changes.',
  },
  {
    key: 'FRIEND_NEIGHBOR',
    label: 'Friend/Neighbor',
    description: 'Can help with specific tasks and check-ins when invited.',
  },
  {
    key: 'EMERGENCY_CONTACT',
    label: 'Emergency Contact',
    description: 'Will only be notified in urgent or emergency situations.',
  },
];

const CARE_RECEIVER_ROLES: { key: InviteRole; label: string; description: string }[] = [
  {
    key: 'PROFESSIONAL_CAREGIVER',
    label: 'Professional Caregiver',
    description: 'Supports daily care by completing assigned tasks and updating care information.',
  },
  {
    key: 'FAMILY_OBSERVER',
    label: 'Family Observer',
    description: 'Can view care updates, tasks, and health information, but cannot make changes.',
  },
  {
    key: 'FRIEND_NEIGHBOR',
    label: 'Friend/Neighbor',
    description: 'Can help with specific tasks and check-ins when invited.',
  },
  {
    key: 'EMERGENCY_CONTACT',
    label: 'Emergency Contact',
    description: 'Will only be notified in urgent or emergency situations.',
  },
];

export default function InviteMemberScreen() {
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';

  const { prefillEmail, from } = useLocalSearchParams<{
    prefillEmail?: string;
    from?: string;
  }>();

  const roles = isCareReceiver ? CARE_RECEIVER_ROLES : CAREGIVER_ROLES;
  const [selectedRole, setSelectedRole] = useState<InviteRole>(
    isCareReceiver ? 'PROFESSIONAL_CAREGIVER' : 'CARE_RECEIVER'
  );
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const goBack = useCallback(() => {
    if (from) router.push(from as any);
    else router.back();
  }, [router, from]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter an email address.');
      return;
    }
    setSending(true);
    try {
      if (isCareReceiver) {
        await careReceiverApi.inviteCaregiverByEmail(email.trim(), selectedRole);
      } else {
        await caregiverApi.sendCareTeamInvite({
          email: email.trim(),
          role: selectedRole,
          personalMessage: message.trim() || undefined,
        });
      }
      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${email.trim()}.`,
        [{ text: 'OK', onPress: () => router.push('/(app)/carecircle') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to send invitation.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add New Member</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>Expand the Circle</Text>
          <Text style={s.subtitle}>
            Invite care partners or family members to coordinate care more effectively.
          </Text>

          {/* Role selector — always visible */}
          <Text style={s.sectionLabel}>Select Role</Text>
          <View style={s.roleList}>
            {roles.map((role) => {
              const active = selectedRole === role.key;
              return (
                <TouchableOpacity
                  key={role.key}
                  style={[s.roleCard, active && s.roleCardActive]}
                  onPress={() => setSelectedRole(role.key)}
                  activeOpacity={0.8}
                >
                  <View style={s.roleCardContent}>
                    <Text style={[s.roleLabel, active && s.roleLabelActive]}>
                      {role.label}
                    </Text>
                    <Text style={s.roleDesc}>{role.description}</Text>
                  </View>
                  {active && <TickCircle size={22} color="#E53935" variant="Bold" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Send Invite section */}
          <Text style={s.sectionLabel}>Send Invite</Text>

          <Text style={s.fieldLabel}>Email Address</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="eg.@gmail.com"
            placeholderTextColor="#C4C4C4"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.fieldLabel}>
            Personal Message <Text style={s.optional}>(Optional)</Text>
          </Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Add a warm note to your invitation..."
            placeholderTextColor="#C4C4C4"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={s.footerNote}>
            Members will receive an email with instructions to join your Care Circle.
          </Text>

          <TouchableOpacity
            style={[s.sendBtn, (!email.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!email.trim() || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.sendBtnText}>Send Invitation</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  title: {
    fontSize: 28,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 28,
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: F.i.semiBold,
    color: '#9CA3AF',
    letterSpacing: 0.4,
    marginBottom: 14,
  },

  roleList: { gap: 12, marginBottom: 32 },
  roleCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleCardActive: { backgroundColor: '#FFF', borderColor: '#E53935' },
  roleCardContent: { flex: 1, gap: 4 },
  roleLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111827' },
  roleLabelActive: { color: '#E53935' },
  roleDesc: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 20 },

  fieldLabel: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111827', marginBottom: 8 },
  optional: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#111827',
    marginBottom: 20,
  },
  textArea: { minHeight: 100, paddingTop: 14 },

  footerNote: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },

  sendBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sendBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  sendBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
});

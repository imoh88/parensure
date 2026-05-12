import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterPhoneScreen() {
  const router = useRouter();
  const { role, firstName, lastName, firmName, email } = useLocalSearchParams<{
    role: string;
    firstName: string;
    lastName: string;
    firmName: string;
    email: string;
  }>();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isValidPhone = (p: string) => p.replace(/\D/g, '').length >= 10;
  const canContinue = isValidPhone(phone);

  // Normalise to E.164 before sending so Telnyx accepts it
  function toE164(p: string): string {
    const stripped = p.replace(/[^\d+]/g, '');
    if (stripped.startsWith('+')) return stripped;
    if (stripped.length === 10) return `+1${stripped}`;
    if (stripped.length === 11 && stripped.startsWith('1')) return `+${stripped}`;
    return `+${stripped}`;
  }

  const handleSendCode = async () => {
    if (!canContinue) return;
    setLoading(true);
    const normalised = toE164(phone);
    try {
      const response = await authApi.sendPreRegOtp(email || '', normalised);
      if (response.success) {
        router.push({
          pathname: '/(auth)/verify-phone-code',
          params: { role, firstName, lastName, firmName, email, phone: normalised },
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to send verification code');
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || 'Failed to send verification code';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Your Phone Number</Text>
              <Text style={styles.subtitle}>
                Add your phone number so you can sign in quickly with a code.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[styles.input, isFocused && styles.inputFocused]}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSendCode}
                />
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.sendButton, (!canContinue || loading) && styles.sendButtonDisabled]}
              onPress={handleSendCode}
              disabled={!canContinue || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, justifyContent: 'space-between' },
  backButton: { padding: 20, alignSelf: 'flex-start' },
  backArrow: { fontSize: 28, color: '#000000', fontFamily: F.i.regular },
  header: { paddingHorizontal: 28, marginBottom: 40 },
  title: { fontSize: 32, fontFamily: F.m.xBold, color: '#000000', marginBottom: 12 },
  subtitle: { fontSize: 16, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 24 },
  form: { paddingHorizontal: 28 },
  field: { gap: 8 },
  label: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111827' },
  input: {
    height: 56,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: F.i.regular,
    color: '#111827',
  },
  inputFocused: { borderColor: '#E84545', backgroundColor: '#FFFFFF' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 24 },
  sendButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { fontSize: 17, fontFamily: F.m.semiBold, color: '#FFFFFF' },
});

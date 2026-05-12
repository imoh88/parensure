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

export default function RegisterEmailScreen() {
  const router = useRouter();
  const { role, firstName, lastName, firmName } = useLocalSearchParams<{
    role: string;
    firstName: string;
    lastName: string;
    firmName: string;
  }>();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canContinue = isValidEmail(email);

  const handleSendOTP = async () => {
    if (!canContinue) return;

    setLoading(true);
    try {
      const response = await authApi.sendPreRegOtp(email);
      if (response.success) {
        router.push({
          pathname: '/(auth)/verify-email-code',
          params: { role, firstName, lastName, firmName, email },
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

          {/* Top content */}
          <View>
            {/* Back button */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>Enter your valid email address</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, isFocused && styles.inputFocused]}
                  placeholder="eg.@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />
              </View>
            </View>
          </View>

          {/* Bottom button — pinned to bottom */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.sendButton, (!canContinue || loading) && styles.sendButtonDisabled]}
              onPress={handleSendOTP}
              disabled={!canContinue || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send verification code</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 20,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 28,
    color: '#000000',
    fontFamily: F.i.regular,
  },
  header: {
    paddingHorizontal: 28,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: F.m.xBold,
    color: '#000000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 24,
  },
  form: {
    paddingHorizontal: 28,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: F.m.semiBold,
    color: '#111827',
  },
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
  inputFocused: {
    borderColor: '#E84545',
    backgroundColor: '#FFFFFF',
  },
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 32,
  },
  sendButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 17,
    fontFamily: F.m.semiBold,
    color: '#FFFFFF',
  },
});
import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  InteractionManager,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OTP_LENGTH = 4;

export default function VerifyEmailCodeScreen() {
  const router = useRouter();
  const { role, firstName, lastName, firmName, email } = useLocalSearchParams<{
    role: string;
    firstName: string;
    lastName: string;
    firmName: string;
    email: string;
  }>();

  const [otp, setOtp] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    });
    return () => task.cancel();
  }, []);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setLoading(true);
    try {
      const response = await authApi.verifyPreRegOtp(email || '', otp);
      if (response.success) {
        router.push({
          pathname: '/(auth)/register-phone',
          params: { role, firstName, lastName, firmName, email },
        });
      } else {
        Alert.alert('Error', response.message || 'Invalid verification code');
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || 'Invalid verification code';
      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.sendPreRegOtp(email || '');
      Alert.alert('Success', 'A new code has been sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => router.back()}
      />

      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 4-digit code to {email}. Enter it below to continue.
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          caretHidden
        />

        <View style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const isFocusedBox = isFocused && i === otp.length && otp.length < OTP_LENGTH;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => {
                  inputRef.current?.blur();
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                style={[
                  styles.otpBox,
                  !!otp[i] && styles.otpBoxFilled,
                  isFocusedBox && styles.otpBoxFocused,
                ]}
              >
                <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleResend} style={styles.resendContainer}>
          <Text style={styles.resendText}>Send me a new code</Text>
        </TouchableOpacity>

        <View style={styles.verifyWrapper}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (otp.length !== OTP_LENGTH || loading) && styles.verifyDisabled,
            ]}
            onPress={handleVerify}
            disabled={otp.length !== OTP_LENGTH || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D6D6D6' },
  overlay: { height: SCREEN_HEIGHT * 0.2 },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  hiddenInput: { position: 'absolute', width: 0, height: 0, opacity: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
    gap: 12,
  },
  headerText: { flex: 1, gap: 8 },
  title: { fontSize: 20, fontFamily: F.m.xBold, color: '#111827', lineHeight: 26 },
  subtitle: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 20 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeX: { fontSize: 14, color: '#374151', fontFamily: F.m.semiBold },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 20,
  },
  otpBox: {
    width: 52,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: { backgroundColor: '#FFFFFF', borderColor: '#E84545' },
  otpBoxFocused: { borderColor: '#E84545', backgroundColor: '#FFFFFF' },
  otpDigit: { fontSize: 24, fontFamily: F.m.bold, color: '#111827' },
  resendContainer: { alignItems: 'center', paddingVertical: 8, marginBottom: 24 },
  resendText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },
  verifyWrapper: { paddingHorizontal: 24 },
  verifyButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyDisabled: { opacity: 0.5 },
  verifyText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF' },
});

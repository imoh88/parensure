import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const OTP_LENGTH = 4;

export default function LoginOtpScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const identifier = email ? { email } : { phone: phone ?? '' };

  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const maskedIdentifier = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(b.length)}${c}`)
    : phone
      ? phone.replace(/^(\+\d{1,3})(.*)(\d{2})$/, (_, code, mid, last) => `${code}${'*'.repeat(mid.length)}${last}`)
      : '****';

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.06 : 1,
      useNativeDriver: true,
      damping: 14,
      stiffness: 150,
    }).start();
  }, [focused]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    try {
      const response = await authApi.verifyLoginOtp(identifier, otp);
      if (!response.success || !response.data) throw new Error(response.message || 'Invalid code');
      const { user, token } = response.data;
      await setAuth(user, token);
      router.replace('/(app)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await authApi.sendLoginOtp(identifier);
      setOtp('');
      Alert.alert('Code sent', 'A new code has been sent.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Image source={require('@/assets/images/icons/back-icon.png')} />
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We've sent a 4-digit code to {maskedIdentifier}.{'\n'}Check your email to continue.
        </Text>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          caretHidden
        />

        {/* OTP boxes */}
        <Animated.View style={[styles.otpRow, { transform: [{ scale: scaleAnim }] }]}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const isFocusedBox = focused && i === otp.length && otp.length < OTP_LENGTH;
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
        </Animated.View>

        <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={resending}>
          <Text style={styles.resendText}>
            {resending ? 'Sending…' : 'Send me a new code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.verifyBtn, (otp.length !== OTP_LENGTH || verifying) && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={otp.length !== OTP_LENGTH || verifying}
          activeOpacity={0.85}
        >
          {verifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  backBtn: { padding: 20, alignSelf: 'flex-start' },

  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
  },

  title: { fontSize: 32, fontFamily: F.m.xBold, color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, marginBottom: 40 },

  hiddenInput: { position: 'absolute', width: 0, height: 0, opacity: 0 },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpBox: {
    width: (W - 56 - 40) / OTP_LENGTH,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E84545',
    shadowColor: '#E84545',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  otpBoxFocused: {
    borderColor: '#E84545',
    backgroundColor: '#FFFFFF',
  },
  otpDigit: { fontSize: 26, fontFamily: F.m.bold, color: '#111827' },

  resendRow: { alignItems: 'center', marginBottom: 32 },
  resendText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },

  verifyBtn: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E84545',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  verifyBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  verifyBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF' },
});

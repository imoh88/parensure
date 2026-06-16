import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { storage } from '@/lib/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

function FingerprintIcon({ size = 48, color = '#E84545' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Corner brackets */}
      <Path d="M4 14V4h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M44 14V4H34" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 34v10h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M44 34v10H34" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Fingerprint lines */}
      <Path d="M24 14c-5.523 0-10 4.477-10 10 0 2 .4 3.9 1.1 5.6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M24 18c-3.314 0-6 2.686-6 6 0 1.5.55 2.87 1.45 3.92" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M24 22c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M26 20.27A6 6 0 0 1 30 26c0 3-.8 5.8-2.2 8.2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M20.5 31.5C21.6 33.6 23 35 24 36c2-2.5 4-6.5 4-10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M34 26c0-5.523-4.477-10-10-10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function FaceIdIcon({ size = 48, color = '#E84545' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Corner brackets */}
      <Path d="M4 14V4h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M44 14V4H34" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 34v10h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M44 34v10H34" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Eyes */}
      <Line x1="18" y1="20" x2="18" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="30" y1="20" x2="30" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Nose */}
      <Path d="M24 20v5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Mouth */}
      <Path d="M19 30c1.4 1.8 3 2.5 5 2.5s3.6-.7 5-2.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COUNTRY_CODES = [
  { flag: '🇺🇸', code: '+1', name: 'United States' },
  { flag: '🇬🇧', code: '+44', name: 'United Kingdom' },
  { flag: '🇨🇦', code: '+1', name: 'Canada' },
  { flag: '🇦🇺', code: '+61', name: 'Australia' },
  { flag: '🇳🇬', code: '+234', name: 'Nigeria' },
  { flag: '🇬🇭', code: '+233', name: 'Ghana' },
  { flag: '🇿🇦', code: '+27', name: 'South Africa' },
  { flag: '🇮🇳', code: '+91', name: 'India' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth, logout } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]!);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [biometricHardware, setBiometricHardware] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceId'>('fingerprint');

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        // Check Face ID first — iPhone X and later only support FACIAL_RECOGNITION.
        // iPhone 6/7/8 and most Android devices support FINGERPRINT.
        // On devices that support both (some Android), FACIAL_RECOGNITION wins.
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('faceId');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
        setBiometricHardware(true);
      }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: biometricType === 'faceId' ? 'Sign in with Face ID' : 'Sign in with fingerprint',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const creds = await storage.getBiometricCredentials();
        if (!creds) {
          Alert.alert('Sign in required', 'Please sign in once with your phone or email to enable biometric login.');
          return;
        }
        // Restore the session, then confirm with the server that the account
        // still exists / the token is valid. A cached token alone must never
        // grant access (e.g. the account may have been deleted).
        await setAuth(creds.user, creds.token);
        try {
          const profile = await authApi.getProfile();
          if (!profile.success) throw new Error('invalid session');
          router.replace('/(app)');
        } catch {
          await storage.clearBiometricCredentials();
          await logout();
          Alert.alert(
            'Account unavailable',
            'This account no longer exists or your session has expired. Please sign in again.',
          );
        }
      }
    } catch {
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const isValidPhone = phone.replace(/\D/g, '').length >= 7;
  const fullPhone = `${selectedCountry.code}${phone.replace(/\s/g, '')}`;

  const handleSendCode = async () => {
    if (!isValidPhone) return;
    setSendingCode(true);
    try {
      const response = await authApi.sendLoginOtp({ phone: fullPhone });
      if (response.success) {
        router.push({ pathname: '/(auth)/login-otp', params: { phone: fullPhone } });
      } else {
        Alert.alert('Error', response.message || 'Failed to send code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to send code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <View style={styles.root}>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={styles.heroContainer}>
            <Image source={require('@/assets/images/login.jpg')} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.5)', '#FFFFFF']} locations={[0.4, 0.75, 1]} style={styles.heroFade} />
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to access your account and continue managing your care.</Text>

            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.phoneRow, phoneFocused && styles.phoneRowFocused]}>
              <TouchableOpacity style={styles.countryPicker} onPress={() => setShowCountryPicker(true)} activeOpacity={0.7}>
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                <Text style={styles.dropdownArrow}>▾</Text>
              </TouchableOpacity>
              <View style={styles.dividerV} />
              <TextInput
                style={styles.phoneInput}
                placeholder="01 234 56 78"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />
            </View>

            <TouchableOpacity style={styles.emailLinkWrapper} onPress={() => router.push('/(auth)/login-email' as never)}>
              <Text style={styles.emailLinkText}>Sign in with email</Text>
            </TouchableOpacity>

            {biometricHardware && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
                activeOpacity={0.7}
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#E84545" size="small" />
                ) : biometricType === 'faceId' ? (
                  <FaceIdIcon size={44} color="#E84545" />
                ) : (
                  <FingerprintIcon size={44} color="#E84545" />
                )}
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[styles.sendButton, (!isValidPhone || sendingCode) && styles.sendButtonDisabled]}
              onPress={handleSendCode}
              disabled={!isValidPhone || sendingCode}
              activeOpacity={0.85}
            >
              {sendingCode ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendButtonText}>Send Code</Text>}
            </TouchableOpacity>

            <View style={styles.signUpRow}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.termsText}>
              By continuing, you agree to our <Text style={styles.termsLink}>Terms</Text>
              {' '}and <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker */}
      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCountryPicker(false)} />
        <View style={styles.countrySheet}>
          <Text style={styles.countrySheetTitle}>Select Country</Text>
          {COUNTRY_CODES.map((c, i) => (
            <TouchableOpacity key={i} style={styles.countryRow} onPress={() => { setSelectedCountry(c); setShowCountryPicker(false); }}>
              <Text style={styles.countryRowFlag}>{c.flag}</Text>
              <Text style={styles.countryRowName}>{c.name}</Text>
              <Text style={styles.countryRowCode}>{c.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1 },

  heroContainer: { height: SCREEN_HEIGHT * 0.42, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },

  formCard: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40, gap: 16 },

  title: { fontSize: 32, fontFamily: F.m.semiBold, color: '#111827', letterSpacing: -0.5, marginBottom: 2 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, marginBottom: 4 },
  label: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111827' },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', height: 60, overflow: 'hidden',
  },
  phoneRowFocused: {
    borderColor: '#E84545', backgroundColor: '#FFFFFF',
    shadowColor: '#E84545', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  countryPicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 5 },
  countryFlag: { fontSize: 21 },
  countryCode: { fontSize: 15, fontFamily: F.m.semiBold, color: '#111827' },
  dropdownArrow: { fontSize: 11, fontFamily: F.i.regular, color: '#6B7280', marginLeft: 2 },
  dividerV: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  phoneInput: { flex: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: F.i.regular, color: '#111827' },

  emailLinkWrapper: { alignSelf: 'center', marginTop: -4 },
  emailLinkText: { fontSize: 14, fontFamily: F.i.regular, color: '#818284', textDecorationLine: 'underline' },

  biometricBtn: {
    alignSelf: 'center',
    width: 80,
    height: 88,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    gap: 2,
  },
  sendButton: {
    height: 60, borderRadius: 30, backgroundColor: '#E84545',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: '#E84545', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  sendButtonDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  sendButtonText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF', letterSpacing: 0.2 },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signUpText: { fontSize: 14, fontFamily: F.i.regular, color: '#374151' },
  signUpLink: { fontSize: 14, fontFamily: F.m.bold, color: '#E84545' },

  termsText: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
  termsLink: { color: '#E84545', fontFamily: F.m.semiBold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  countrySheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  countrySheetTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111827', marginBottom: 16 },
  countryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  countryRowFlag: { fontSize: 24 },
  countryRowName: { flex: 1, fontSize: 15, fontFamily: F.i.regular, color: '#111827' },
  countryRowCode: { fontSize: 15, fontFamily: F.m.semiBold, color: '#6B7280' },
});

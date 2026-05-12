import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginEmailScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendCode = async () => {
    if (!isValidEmail) return;
    setSendingCode(true);
    try {
      const response = await authApi.sendLoginOtp({ email: email.trim() });
      if (response.success) {
        router.push({ pathname: '/(auth)/login-otp', params: { email: email.trim() } });
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
            <Text style={styles.title}>Sign In with Email</Text>
            <Text style={styles.subtitle}>Enter your email address and we'll send you a one-time code to sign in.</Text>

            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
              <TextInput
                style={styles.emailInput}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />
            </View>

            <TouchableOpacity style={styles.phoneLinkWrapper} onPress={() => router.replace('/(auth)/login' as never)}>
              <Text style={styles.phoneLinkText}>Sign in with phone number</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[styles.sendButton, (!isValidEmail || sendingCode) && styles.sendButtonDisabled]}
              onPress={handleSendCode}
              disabled={!isValidEmail || sendingCode}
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

  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', height: 60, overflow: 'hidden',
  },
  inputRowFocused: {
    borderColor: '#E84545', backgroundColor: '#FFFFFF',
    shadowColor: '#E84545', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  emailInput: { flex: 1, paddingHorizontal: 18, fontSize: 15, fontFamily: F.i.regular, color: '#111827' },

  phoneLinkWrapper: { alignSelf: 'center', marginTop: -4 },
  phoneLinkText: { fontSize: 14, fontFamily: F.i.regular, color: '#818284', textDecorationLine: 'underline' },

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
});

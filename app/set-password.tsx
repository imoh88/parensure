import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

/**
 * Deep-link target for the email invite "Get Started" / "Set Password & Join"
 * buttons: parensure://set-password?token=<inviteId>&email=<email>
 *
 * Reads the invite token + email from the link, lets the invitee choose a
 * password (POST /auth/set-password), then logs them straight in.
 */
export default function SetPasswordScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<'password' | 'confirm' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<TextInput>(null);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const canContinue = passwordValid && confirmPassword.length > 0 && passwordsMatch && !submitting;

  const linkValid = !!token && !!email;

  const handleSubmit = async () => {
    if (!canContinue || !linkValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.setPassword({ email: email!, inviteToken: token!, password });
      if (!res.success) {
        setError(res.message ?? 'Could not set your password. The invite may have expired.');
        return;
      }

      // Password set — log straight in so the invitee lands inside the app.
      const loginRes = await authApi.login({ email: email!, password });
      if (loginRes.success && loginRes.data) {
        await setAuth(loginRes.data.user, loginRes.data.token);
        router.replace('/(app)');
      } else {
        // Password was set but auto-login failed — send them to login.
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!linkValid) {
    return (
      <View style={styles.invalidContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.invalidTitle}>Invalid invitation link</Text>
        <Text style={styles.invalidText}>
          This link is missing required information. Please open the most recent invite email, or ask the
          person who invited you to send a new one.
        </Text>
        <TouchableOpacity style={styles.invalidBtn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.8}>
          <Text style={styles.invalidBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Set Your Password</Text>
              <Text style={styles.subtitle}>
                Create a password for{'\n'}
                <Text style={styles.email}>{email}</Text>
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                    <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                {password.length > 0 && !passwordValid && (
                  <Text style={styles.errorText}>Password must be at least 8 characters</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputRow, focusedField === 'confirm' && styles.inputRowFocused]}>
                  <TextInput
                    ref={confirmRef}
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirm}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeButton}>
                    <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>

              {error && <Text style={styles.submitError}>{error}</Text>}
            </View>
          </View>

          {/* Bottom */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canContinue}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>Set Password & Get Started</Text>
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
  inner: { flex: 1, justifyContent: 'space-between', paddingTop: 60 },
  header: { paddingHorizontal: 28, marginBottom: 40 },
  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#000000', marginBottom: 12, lineHeight: 36 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22 },
  email: { fontFamily: F.m.semiBold, color: '#111827' },
  form: { paddingHorizontal: 28, gap: 24 },
  field: { gap: 8 },
  label: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111827' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 56,
  },
  inputRowFocused: { borderColor: '#E84545', backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, fontFamily: F.i.regular, color: '#111827' },
  eyeButton: { paddingLeft: 12 },
  eyeText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E84545' },
  errorText: { fontSize: 13, fontFamily: F.i.regular, color: '#E84545', marginTop: 4 },
  submitError: { fontSize: 14, fontFamily: F.i.regular, color: '#E84545', textAlign: 'center' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 24 },
  nextButton: { height: 56, borderRadius: 28, backgroundColor: '#E84545', alignItems: 'center', justifyContent: 'center' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { fontSize: 17, fontFamily: F.m.semiBold, color: '#FFFFFF' },

  invalidContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 32 },
  invalidTitle: { fontSize: 22, fontFamily: F.m.xBold, color: '#111827', marginBottom: 12, textAlign: 'center' },
  invalidText: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  invalidBtn: { height: 52, borderRadius: 26, backgroundColor: '#E84545', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  invalidBtnText: { fontSize: 16, fontFamily: F.m.semiBold, color: '#FFFFFF' },
});

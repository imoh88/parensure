import { F } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
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

export default function RegisterPasswordScreen() {
  const router = useRouter();
  const { role, firstName, lastName, firmName, email } = useLocalSearchParams<{
    role: string;
    firstName: string;
    lastName: string;
    firmName: string;
    email: string;
  }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<'password' | 'confirm' | null>(null);
  const confirmRef = useRef<TextInput>(null);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const canContinue = passwordValid && confirmPassword.length > 0 && passwordsMatch;

  const handleNext = () => {
    if (!canContinue) return;
    router.push({
      pathname: '/(auth)/register-phone',
      params: { role, firstName, lastName, firmName, email, password },
    });
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
              <Text style={styles.title}>Create a Password</Text>
              <Text style={styles.subtitle}>Must be at least 8 characters long.</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Password field */}
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
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                {password.length > 0 && !passwordValid && (
                  <Text style={styles.errorText}>Password must be at least 8 characters</Text>
                )}
              </View>

              {/* Confirm Password field */}
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
                    onSubmitEditing={handleNext}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((v) => !v)}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>
            </View>
          </View>

          {/* Bottom section — pinned to bottom */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!canContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
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
    fontSize: 28,
    fontFamily: F.m.xBold,
    color: '#000000',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 28,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: F.m.semiBold,
    color: '#111827',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
  },
  inputRowFocused: {
    borderColor: '#E84545',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: F.i.regular,
    color: '#111827',
  },
  eyeButton: {
    paddingLeft: 12,
  },
  eyeText: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#E84545',
  },
  errorText: {
    fontSize: 13,
    fontFamily: F.i.regular,
    color: '#E84545',
    marginTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 24,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: F.m.semiBold,
    color: '#FFFFFF',
  },
});
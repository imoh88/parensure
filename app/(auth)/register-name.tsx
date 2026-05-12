import { F } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
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

export default function RegisterNameScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isFirm = role === 'FIRM_ADMIN';

  const canContinue = isFirm
    ? firstName.trim().length > 0 && lastName.trim().length > 0 && firmName.trim().length > 0
    : firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleNext = () => {
    if (canContinue) {
      router.push({
        pathname: '/(auth)/register-email',
        params: { role, firstName, lastName, firmName: isFirm ? firmName : '' },
      });
    }
  };

  const titleMap: Record<string, string> = {
    CARE_RECEIVER: 'Create Your Care Receiver Account',
    CAREGIVER: 'Create Your Caregiver Account',
    FIRM_ADMIN: 'Register Your Care Firm',
  };

  const subtitleMap: Record<string, string> = {
    CARE_RECEIVER: 'Stay connected with your caregiver and receive timely reminders and updates.',
    CAREGIVER: 'Start building your care circle and stay informed — without constant check-ins.',
    FIRM_ADMIN: 'Manage your caregivers and clients all in one place.',
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
              {/* <Text style={styles.backArrow}>←</Text> */}
              <Image source={require("@/assets/images/icons/back-icon.png")} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>{titleMap[role ?? ''] ?? 'Create Account'}</Text>
              <Text style={styles.subtitle}>{subtitleMap[role ?? ''] ?? ''}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={[styles.input, focusedField === 'firstName' && styles.inputFocused]}
                  placeholder="John"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={[styles.input, focusedField === 'lastName' && styles.inputFocused]}
                  placeholder="Doe"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  returnKeyType={isFirm ? 'next' : 'done'}
                  onSubmitEditing={isFirm ? undefined : handleNext}
                />
              </View>

              {isFirm && (
                <View style={styles.field}>
                  <Text style={styles.label}>Firm Name</Text>
                  <TextInput
                    style={[styles.input, focusedField === 'firmName' && styles.inputFocused]}
                    placeholder="e.g. Sunrise Care Ltd."
                    placeholderTextColor="#9CA3AF"
                    value={firmName}
                    onChangeText={setFirmName}
                    onFocus={() => setFocusedField('firmName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!canContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text>
              {'\n'}and <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
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
  backButton: { marginTop: 20, padding: 20, alignSelf: 'flex-start' },
  backArrow: { fontSize: 28, color: '#000000', fontFamily: F.i.regular },
  header: { paddingHorizontal: 28, marginBottom: 40 },
  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#000000', marginBottom: 12, lineHeight: 36 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22 },
  form: { paddingHorizontal: 28, gap: 24 },
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
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 32, gap: 16 },
  nextButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { fontSize: 17, fontFamily: F.m.semiBold, color: '#FFFFFF' },
  termsText: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  termsLink: { color: '#E84545', fontFamily: F.m.semiBold },
});

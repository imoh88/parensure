import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Animated Bottom Sheet Dropdown ──────────────────────────────────────────

function Dropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const selected = options.find((o) => o.value === value);

  const openSheet = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={openSheet} activeOpacity={0.7}>
        <Text style={[styles.inputText, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <Animated.View style={[sheetStyles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>

        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.headerRow}>
            <Text style={sheetStyles.title}>{label}</Text>
            <TouchableOpacity style={sheetStyles.closeButton} onPress={closeSheet}>
              <Text style={sheetStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[sheetStyles.row, o.value === value && sheetStyles.rowActive]}
                onPress={() => { onChange(o.value); closeSheet(); }}
                activeOpacity={0.7}
              >
                <Text style={[sheetStyles.rowText, o.value === value && sheetStyles.rowTextSelected]}>
                  {o.label}
                </Text>
                {o.value === value && (
                  <View style={sheetStyles.checkCircle}>
                    <Text style={sheetStyles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { flag: '🇺🇸', code: '+1' },
  { flag: '🇬🇧', code: '+44' },
  { flag: '🇳🇬', code: '+234' },
  { flag: '🇬🇭', code: '+233' },
  { flag: '🇿🇦', code: '+27' },
  { flag: '🇦🇺', code: '+61' },
  { flag: '🇨🇦', code: '+1' },
  { flag: '🇮🇳', code: '+91' },
];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
];

const RELATIONSHIP_OPTIONS = [
  { label: 'Son', value: 'Son' },
  { label: 'Daughter', value: 'Daughter' },
  { label: 'Father', value: 'Father' },
  { label: 'Mother', value: 'Mother' },
  { label: 'Brother', value: 'Brother' },
  { label: 'Sister', value: 'Sister' },
  { label: 'Grandchild', value: 'Grandchild' },
  { label: 'Grandparent', value: 'Grandparent' },
  { label: 'Uncle / Aunt', value: 'Uncle/Aunt' },
  { label: 'Professional Caregiver', value: 'Professional Caregiver' },
  { label: 'Other', value: 'Other' },
];

const COUNTRY_OPTIONS = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Nigeria', value: 'NG' },
  { label: 'Ghana', value: 'GH' },
  { label: 'South Africa', value: 'ZA' },
  { label: 'Australia', value: 'AU' },
  { label: 'Canada', value: 'CA' },
  { label: 'India', value: 'IN' },
];

const TIMEZONE_OPTIONS = [
  { label: 'UTC-5 (Eastern Time)', value: 'America/New_York' },
  { label: 'UTC-6 (Central Time)', value: 'America/Chicago' },
  { label: 'UTC-7 (Mountain Time)', value: 'America/Denver' },
  { label: 'UTC-8 (Pacific Time)', value: 'America/Los_Angeles' },
  { label: 'UTC+0 (London)', value: 'Europe/London' },
  { label: 'UTC+1 (Lagos / Accra)', value: 'Africa/Lagos' },
  { label: 'UTC+2 (Johannesburg)', value: 'Africa/Johannesburg' },
  { label: 'UTC+5:30 (India)', value: 'Asia/Kolkata' },
  { label: 'UTC+8 (Singapore)', value: 'Asia/Singapore' },
  { label: 'UTC+10 (Sydney)', value: 'Australia/Sydney' },
];

// ─── Country Code Picker (also animated sheet) ────────────────────────────────

function CountryCodePicker({
  selected,
  onSelect,
}: {
  selected: { flag: string; code: string };
  onSelect: (c: { flag: string; code: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
  };

  return (
    <>
      <TouchableOpacity
        style={styles.countryPicker}
        onPress={openSheet}
        activeOpacity={0.7}
      >
        <Text style={styles.countryFlag}>{selected.flag}</Text>
        <Text style={styles.countryCode}>{selected.code}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <Animated.View style={[sheetStyles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>
        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.headerRow}>
            <Text style={sheetStyles.title}>Select Country Code</Text>
            <TouchableOpacity style={sheetStyles.closeButton} onPress={closeSheet}>
              <Text style={sheetStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {COUNTRY_CODES.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[sheetStyles.row, c.code === selected.code && c.flag === selected.flag && sheetStyles.rowActive]}
                onPress={() => { onSelect(c); closeSheet(); }}
                activeOpacity={0.7}
              >
                <Text style={sheetStyles.rowText}>{c.flag}{'  '}{c.code}</Text>
                {c.code === selected.code && c.flag === selected.flag && (
                  <View style={sheetStyles.checkCircle}>
                    <Text style={sheetStyles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Date Picker Field ────────────────────────────────────────────────────────

function DatePickerField({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    if (Platform.OS === 'android') {
      setShow(true);
      return;
    }
    setShow(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShow(false));
  };

  const displayText = value
    ? value.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Select date of birth';

  return (
    <>
      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity style={styles.input} onPress={openSheet} activeOpacity={0.7}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {displayText}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ?? new Date(1990, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShow(false);
            if (selected) onChange(selected);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
          <Animated.View style={[sheetStyles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>
          <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.headerRow}>
              <Text style={sheetStyles.title}>Date of Birth</Text>
              <TouchableOpacity style={sheetStyles.closeButton} onPress={closeSheet}>
                <Text style={sheetStyles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              <DateTimePicker
                value={value ?? new Date(1990, 0, 1)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selected) => { if (selected) onChange(selected); }}
                style={{ height: 200 }}
              />
              <TouchableOpacity style={sheetStyles.doneButton} onPress={closeSheet} activeOpacity={0.85}>
                <Text style={sheetStyles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompleteProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const nameParts = (user?.fullName ?? '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' '));
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+\d+/, '') ?? '');
  const [selectedCountryCode, setSelectedCountryCode] = useState(COUNTRY_CODES[0]!);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : null
  );
  const [gender, setGender] = useState(user?.gender ?? '');
  const [relationship, setRelationship] = useState(user?.relationship ?? '');
  const [country, setCountry] = useState(
    COUNTRY_OPTIONS.find(o => o.label === user?.country || o.value === user?.country)?.value ?? ''
  );
  const [state, setState] = useState(user?.state ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress ?? '');
  const [timezone, setTimezone] = useState(
    TIMEZONE_OPTIONS.find(o => o.label === user?.timezone || o.value === user?.timezone)?.value ?? ''
  );
  const [saving, setSaving] = useState(false);

  const isCaregiver = user?.accountType === 'CAREGIVER';

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullPhone = phone
        ? `${selectedCountryCode.code}${phone.replace(/\s/g, '')}`
        : undefined;

      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

      const res = await authApi.updateProfile({
        fullName: fullName || undefined,
        phone: fullPhone,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : undefined,
        gender: (gender as 'MALE' | 'FEMALE' | 'OTHER') || undefined,
        relationship: relationship || undefined,
        country: country || undefined,
        state: state || undefined,
        city: city || undefined,
        homeAddress: homeAddress || undefined,
        timezone: timezone || undefined,
        isProfileComplete: true,
      });

      if (!res.success) throw new Error(res.message || 'Failed to save profile');
      if (res.data && token) await setAuth(res.data, token);
      router.replace('/(auth)/profile-completed');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Add your details below so we can personalize your experience and keep your account secure.
        </Text>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Image
            source={require('@/assets/images/upload-image.png')}
            style={styles.avatar}
          />
          <TouchableOpacity>
            <Text style={styles.uploadText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

        {/* ── Basic Information ────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Basic Information</Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#9CA3AF"
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor="#9CA3AF"
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.label}>Email Address</Text>
        <View style={[styles.input, styles.readOnly]}>
          <Text style={styles.inputText}>{user?.email ?? ''}</Text>
        </View>

        {/* Phone */}
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneRow}>
          <CountryCodePicker
            selected={selectedCountryCode}
            onSelect={setSelectedCountryCode}
          />
          <View style={styles.dividerV} />
          <TextInput
            style={styles.phoneInput}
            placeholder="01 234 56 78"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Date of birth */}
        <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} />

        <Dropdown
          label="Gender (Optional)"
          value={gender}
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          onChange={setGender}
        />

        {isCaregiver && (
          <Dropdown
            label="Relationship to Care Recipient"
            value={relationship}
            options={RELATIONSHIP_OPTIONS}
            placeholder="Select relationship"
            onChange={setRelationship}
          />
        )}

        {/* ── Location Information ─────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Location Information</Text>

        <Dropdown
          label="Country"
          value={country}
          options={COUNTRY_OPTIONS}
          placeholder="Select Country"
          onChange={setCountry}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter state"
              placeholderTextColor="#9CA3AF"
              value={state}
              onChangeText={setState}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>

        <Text style={styles.label}>Home Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Type your address"
          placeholderTextColor="#9CA3AF"
          value={homeAddress}
          onChangeText={setHomeAddress}
        />

        <Dropdown
          label="Time Zone"
          value={timezone}
          options={TIMEZONE_OPTIONS}
          placeholder="Select time zone"
          onChange={setTimezone}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Shared Sheet Styles ──────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '70%',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontFamily: F.m.xBold,
    color: '#111827',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: '#374151', fontFamily: F.m.semiBold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowActive: {
    backgroundColor: '#FFF5F5',
  },
  rowText: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#374151',
    flex: 1,
  },
  rowTextSelected: {
    color: '#E84545',
    fontFamily: F.m.bold,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontFamily: F.m.bold,
    color: '#FFFFFF',
  },
  doneButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#E84545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#FFFFFF',
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 28, fontFamily: F.i.regular, color: '#111827', lineHeight: 32 },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: '#E84545',
    borderRadius: 2,
  },

  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  title: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: F.m.medium,
    color: '#111827',
    lineHeight: 50,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },

  avatarWrapper: { alignItems: 'center', marginBottom: 28, gap: 10 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  uploadText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },

  sectionLabel: {
    fontSize: 12,
    fontFamily: F.m.semiBold,
    color: '#9CA3AF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#111827',
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#111827',
  },
  inputText: { fontSize: 15, fontFamily: F.i.regular, color: '#111827', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  readOnly: { opacity: 0.7 },
  chevron: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280' },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
    height: '100%',
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111827' },
  dividerV: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  phoneInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: F.i.regular, color: '#111827' },

  row: { flexDirection: 'row', gap: 12 },

  saveBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#E84545',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF' },
});
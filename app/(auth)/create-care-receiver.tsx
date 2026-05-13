import { authApi } from '@/lib/api/auth';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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

const PRIMARY_CONDITIONS = [
  "Alzheimer's / Dementia",
  "Parkinson's Disease",
  'Stroke',
  'Diabetes',
  'Heart Disease',
  'Cancer',
  'Arthritis',
  'COPD',
  'Depression / Anxiety',
  'Physical Disability',
  'Visual Impairment',
  'Hearing Impairment',
  'Other',
];

// ─── Dropdown ─────────────────────────────────────────────────────────────────

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
      Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.input} onPress={openSheet} activeOpacity={0.7}>
        <Text style={[s.inputText, !selected && s.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <Animated.View style={[sh.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>
        <Animated.View style={[sh.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={sh.handle} />
          <View style={sh.headerRow}>
            <Text style={sh.title}>{label}</Text>
            <TouchableOpacity style={sh.closeBtn} onPress={closeSheet}>
              <Text style={sh.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[sh.row, o.value === value && sh.rowActive]}
                onPress={() => { onChange(o.value); closeSheet(); }}
                activeOpacity={0.7}
              >
                <Text style={[sh.rowText, o.value === value && sh.rowTextSelected]}>{o.label}</Text>
                {o.value === value && (
                  <View style={sh.check}><Text style={sh.checkMark}>✓</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Country Code Picker ──────────────────────────────────────────────────────

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
      Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  return (
    <>
      <TouchableOpacity style={s.countryPicker} onPress={openSheet} activeOpacity={0.7}>
        <Text style={s.flag}>{selected.flag}</Text>
        <Text style={s.code}>{selected.code}</Text>
        <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <Animated.View style={[sh.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>
        <Animated.View style={[sh.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={sh.handle} />
          <View style={sh.headerRow}>
            <Text style={sh.title}>Select Country Code</Text>
            <TouchableOpacity style={sh.closeBtn} onPress={closeSheet}>
              <Text style={sh.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {COUNTRY_CODES.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[sh.row, c.code === selected.code && c.flag === selected.flag && sh.rowActive]}
                onPress={() => { onSelect(c); closeSheet(); }}
                activeOpacity={0.7}
              >
                <Text style={sh.rowText}>{c.flag}{'  '}{c.code}</Text>
                {c.code === selected.code && c.flag === selected.flag && (
                  <View style={sh.check}><Text style={sh.checkMark}>✓</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Date Picker ──────────────────────────────────────────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    if (Platform.OS === 'android') { setShow(true); return; }
    setShow(true);
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShow(false));
  };

  const displayText = value
    ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Select date of birth';

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.input} onPress={openSheet} activeOpacity={0.7}>
        <Text style={[s.inputText, !value && s.placeholder]}>{displayText}</Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ?? new Date(1970, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, sel) => { setShow(false); if (sel) onChange(sel); }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
          <Animated.View style={[sh.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>
          <Animated.View style={[sh.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={sh.handle} />
            <View style={sh.headerRow}>
              <Text style={sh.title}>{label}</Text>
              <TouchableOpacity style={sh.closeBtn} onPress={closeSheet}>
                <Text style={sh.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              <DateTimePicker
                value={value ?? new Date(1970, 0, 1)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, sel) => { if (sel) onChange(sel); }}
                style={{ height: 200 }}
              />
              <TouchableOpacity style={sh.doneBtn} onPress={closeSheet} activeOpacity={0.85}>
                <Text style={sh.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCareReceiverScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState(COUNTRY_CODES[0]!);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');

  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [timezone, setTimezone] = useState('');

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState('');

  const [ecFirstName, setEcFirstName] = useState('');
  const [ecLastName, setEcLastName] = useState('');
  const [ecEmail, setEcEmail] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecCountryCode, setEcCountryCode] = useState(COUNTRY_CODES[0]!);
  const [ecRelationship, setEcRelationship] = useState('');

  const [saving, setSaving] = useState(false);

  const toggleCondition = (c: string) =>
    setSelectedConditions((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleContinue = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName) {
      Alert.alert('Required', "Please enter the care receiver's first name.");
      return;
    }
    if (!trimmedEmail) {
      Alert.alert('Required', "Please enter the care receiver's email address.");
      return;
    }

    setSaving(true);
    try {
      const fullName = [trimmedFirstName, lastName.trim()].filter(Boolean).join(' ');
      const fullPhone = phone ? `${selectedCountryCode.code}${phone.replace(/\s/g, '')}` : undefined;
      const addressParts = [homeAddress.trim(), city.trim(), state.trim(), country].filter(Boolean);
      const conditionsStr = selectedConditions.join(', ');
      const notesStr = [conditionsStr, medicalNotes.trim()].filter(Boolean).join('\n');
      const ecName = [ecFirstName.trim(), ecLastName.trim()].filter(Boolean).join(' ');
      const ecFullPhone = ecPhone ? `${ecCountryCode.code}${ecPhone.replace(/\s/g, '')}` : undefined;
      const emergencyContactStr =
        ecName || ecEmail.trim() || ecFullPhone || ecRelationship
          ? JSON.stringify({ name: ecName || undefined, email: ecEmail.trim() || undefined, phone: ecFullPhone, relationship: ecRelationship || undefined })
          : undefined;

      const regRes = await authApi.registerCareReceiver({
        fullName,
        email: trimmedEmail,
        phone: fullPhone,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : undefined,
        medicalNotes: notesStr || undefined,
        address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
        emergencyContact: emergencyContactStr,
      });

      if (!regRes.success || !regRes.data) throw new Error(regRes.message || 'Failed to create profile.');

      const careReceiverId = regRes.data.careReceiver.id;
      await caregiverApi.addCareReceiver(careReceiverId);

      router.push({ pathname: '/(auth)/care-receiver-routine', params: { careReceiverId } });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#E53935" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add a Care Receiver</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: '33%' }]} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Who are you caring for?</Text>
        <Text style={s.subtitle}>Tell us about your loved one</Text>

        {/* Photo upload */}
        <View style={s.photoWrap}>
          <View style={s.photoCircle}>
            <Ionicons name="person" size={56} color="#C4B5FD" />
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.uploadText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <Text style={s.sectionLabel}>Basic Information</Text>

        <Text style={s.label}>First Name</Text>
        <TextInput style={s.textInput} placeholder="Sarah" placeholderTextColor="#C4C4C4" value={firstName} onChangeText={setFirstName} />

        <Text style={s.label}>Last Name</Text>
        <TextInput style={s.textInput} placeholder="Wilson" placeholderTextColor="#C4C4C4" value={lastName} onChangeText={setLastName} />

        <Text style={s.label}>Email Address</Text>
        <TextInput style={s.textInput} placeholder="sarahwilson@mail.com" placeholderTextColor="#C4C4C4" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={s.label}>Phone Number</Text>
        <View style={s.phoneRow}>
          <CountryCodePicker selected={selectedCountryCode} onSelect={setSelectedCountryCode} />
          <View style={s.dividerV} />
          <TextInput style={s.phoneInput} placeholder="2563789456" placeholderTextColor="#C4C4C4" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>

        <DatePickerField label="Date of birth" value={dateOfBirth} onChange={setDateOfBirth} />

        <Dropdown label="Gender (Optional)" value={gender} options={GENDER_OPTIONS} placeholder="Select gender" onChange={setGender} />

        <Dropdown label="Relationship to Care Recipient" value={relationship} options={RELATIONSHIP_OPTIONS} placeholder="Select relationship" onChange={setRelationship} />

        {/* Location Information */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>Location Information</Text>

        <Dropdown label="Country" value={country} options={COUNTRY_OPTIONS} placeholder="Select Country" onChange={setCountry} />

        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>State</Text>
            <TextInput style={s.textInput} placeholder="Select" placeholderTextColor="#C4C4C4" value={state} onChangeText={setState} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>City</Text>
            <TextInput style={s.textInput} placeholder="Select" placeholderTextColor="#C4C4C4" value={city} onChangeText={setCity} />
          </View>
        </View>

        <Text style={s.label}>Home Address</Text>
        <TextInput style={s.textInput} placeholder="Type" placeholderTextColor="#C4C4C4" value={homeAddress} onChangeText={setHomeAddress} />

        <Dropdown label="Time Zone" value={timezone} options={TIMEZONE_OPTIONS} placeholder="Select time zone" onChange={setTimezone} />

        {/* Detailed Health History */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>Detailed Health History</Text>

        <Text style={s.label}>Primary Health Conditions</Text>
        <View style={s.chipsWrap}>
          {PRIMARY_CONDITIONS.map((cond) => {
            const active = selectedConditions.includes(cond);
            return (
              <TouchableOpacity key={cond} style={[s.chip, active && s.chipActive]} onPress={() => toggleCondition(cond)} activeOpacity={0.7}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{cond}</Text>
                {active && <Text style={s.chipX}> ×</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Medical Notes</Text>
        <TextInput style={[s.textInput, s.textarea]} placeholder="give instructions..." placeholderTextColor="#C4C4C4" value={medicalNotes} onChangeText={setMedicalNotes} multiline numberOfLines={4} textAlignVertical="top" />

        {/* Emergency Contact */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>Emergency Contact</Text>

        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>First Name</Text>
            <TextInput style={s.textInput} placeholder="Sarah" placeholderTextColor="#C4C4C4" value={ecFirstName} onChangeText={setEcFirstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Last Name</Text>
            <TextInput style={s.textInput} placeholder="Wilson" placeholderTextColor="#C4C4C4" value={ecLastName} onChangeText={setEcLastName} />
          </View>
        </View>

        <Text style={s.label}>Email Address</Text>
        <TextInput style={s.textInput} placeholder="sarahwilson@mail.com" placeholderTextColor="#C4C4C4" value={ecEmail} onChangeText={setEcEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={s.label}>Phone Number</Text>
        <View style={s.phoneRow}>
          <CountryCodePicker selected={ecCountryCode} onSelect={setEcCountryCode} />
          <View style={s.dividerV} />
          <TextInput style={s.phoneInput} placeholder="2563789456" placeholderTextColor="#C4C4C4" value={ecPhone} onChangeText={setEcPhone} keyboardType="phone-pad" />
        </View>

        <Dropdown label="Relationship to Care Recipient" value={ecRelationship} options={RELATIONSHIP_OPTIONS} placeholder="Select relationship" onChange={setEcRelationship} />

        {/* Actions */}
        <TouchableOpacity style={[s.continueBtn, saving && { opacity: 0.6 }]} onPress={handleContinue} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.continueBtnText}>Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={() => router.replace('/(app)')} activeOpacity={0.7} disabled={saving}>
          <Text style={s.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '70%', paddingBottom: 40,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 18, fontFamily: F.m.xBold, color: '#111827' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 13, color: '#374151', fontFamily: F.m.semiBold },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowActive: { backgroundColor: '#FFF5F5' },
  rowText: { fontSize: 15, fontFamily: F.i.regular, color: '#374151', flex: 1 },
  rowTextSelected: { color: '#E84545', fontFamily: F.m.bold },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E84545', alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 12, fontFamily: F.m.bold, color: '#FFF' },
  doneBtn: { height: 52, borderRadius: 26, backgroundColor: '#E84545', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  doneBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111827' },
  progressTrack: { height: 3, backgroundColor: '#F3F4F6' },
  progressFill: { height: '100%', backgroundColor: '#E53935' },

  scroll: { paddingHorizontal: 24, paddingBottom: 56, paddingTop: 20 },

  title: { fontSize: 28, fontFamily: F.m.xBold, color: '#111827', lineHeight: 40, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 22, marginBottom: 24 },

  photoWrap: { alignItems: 'center', marginBottom: 28, gap: 10 },
  photoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  sectionLabel: { fontSize: 11, fontFamily: F.m.semiBold, color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },

  label: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111827', marginBottom: 6, marginTop: 14 },

  input: {
    height: 52, borderRadius: 12, backgroundColor: '#F3F4F6',
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inputText: { fontSize: 15, fontFamily: F.i.regular, color: '#111827', flex: 1 },
  placeholder: { color: '#C4C4C4' },

  textInput: { height: 52, borderRadius: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 16, fontSize: 15, fontFamily: F.i.regular, color: '#111827' },
  textarea: { height: 100, paddingTop: 14, paddingBottom: 14 },

  phoneRow: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 12, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  countryPicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 4, height: '100%' },
  flag: { fontSize: 20 },
  code: { fontSize: 13, fontFamily: F.m.semiBold, color: '#111827' },
  dividerV: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  phoneInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: F.i.regular, color: '#111827' },

  twoCol: { flexDirection: 'row', gap: 12 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#FFF1F1', borderColor: '#E84545' },
  chipText: { fontSize: 13, fontFamily: F.m.medium, color: '#6B7280' },
  chipTextActive: { color: '#E84545', fontFamily: F.m.bold },
  chipX: { fontSize: 13, color: '#E84545', fontFamily: F.m.bold },

  continueBtn: { height: 56, borderRadius: 28, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', marginTop: 36 },
  continueBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
  skipBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  skipBtnText: { fontSize: 15, fontFamily: F.m.medium, color: '#374151' },
});

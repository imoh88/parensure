import { authApi } from '@/lib/api/auth';
import { F } from '@/lib/fonts';
import { useProfilePhoto } from '@/lib/hooks/useProfilePhoto';
import { useAuthStore } from '@/lib/store/authStore';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowDown2, ArrowLeft, Camera } from 'iconsax-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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

const GENDERS = ['Male', 'Female', 'Other'];
const RELATIONSHIPS = ['Child', 'Parent', 'Spouse', 'Sibling', 'Friend', 'Other'];
const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Nigeria', 'Ghana', 'South Africa', 'India'];
const TIMEZONES = ['GMT-12', 'GMT-11', 'GMT-10', 'GMT-9', 'GMT-8', 'GMT-7', 'GMT-6', 'GMT-5', 'GMT-4', 'GMT-3', 'GMT-2', 'GMT-1', 'GMT+0', 'GMT+1', 'GMT+2', 'GMT+3', 'GMT+4', 'GMT+5', 'GMT+6', 'GMT+7', 'GMT+8', 'GMT+9', 'GMT+10', 'GMT+11', 'GMT+12'];

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrapper}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, focused && f.inputFocused, !editable && f.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
      />
    </View>
  );
}

function DropdownField({
  label,
  value,
  placeholder,
  onPress,
  optional,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  optional?: boolean;
}) {
  return (
    <View style={f.wrapper}>
      <Text style={f.label}>
        {label}
        {optional && <Text style={f.optional}> (Optional)</Text>}
      </Text>
      <TouchableOpacity style={f.dropdown} onPress={onPress} activeOpacity={0.8}>
        <Text style={value ? f.dropdownValue : f.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <ArrowDown2 size={16} color="#9CA3AF" variant="Linear" />
      </TouchableOpacity>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={m.sheet}>
        <Text style={m.title}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={m.option}
              onPress={() => { onSelect(opt); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={m.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { photoUrl, uploading, pickAndUpload } = useProfilePhoto();

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [router]));

  const nameParts = (user?.fullName ?? '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' '));
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [country, setCountry] = useState(user?.country ?? '');
  const [state, setState] = useState(user?.state ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? '');

  const [picker, setPicker] = useState<null | 'gender' | 'relationship' | 'country' | 'timezone'>(null);

  const onSave = async () => {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    if (!fullName) { Alert.alert('Error', 'Name is required.'); return; }
    setSaving(true);
    try {
      const response = await authApi.updateProfile({
        fullName,
        phone,
        country,
        state,
        city,
        homeAddress,
        timezone,
      });
      if (response.success && response.data) {
        await updateUser(response.data);
        router.back();
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E84545" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={pickAndUpload} activeOpacity={0.85} disabled={uploading}>
              <View style={s.avatarRing}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={s.avatarImage} />
                ) : (
                  <View style={s.avatar}>
                    <Text style={s.avatarInitial}>{(firstName || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={s.cameraOverlay}>
                  {uploading
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Camera size={16} color="#FFF" variant="Bold" />
                  }
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAndUpload} activeOpacity={0.7} disabled={uploading}>
              <Text style={s.uploadPhoto}>{uploading ? 'Uploading…' : 'Upload Photo'}</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <Text style={s.sectionLabel}>Basic Information</Text>

          <TextField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Sarah" />
          <TextField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Wilson" />
          <TextField label="Email Address" value={user?.email ?? ''} editable={false} />
          <TextField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+1 234 567 8900" keyboardType="phone-pad" />
          <DropdownField label="Date of birth" value={undefined} placeholder="Select date of birth" onPress={() => {}} />
          <DropdownField label="Gender" value={gender} placeholder="Select gender" onPress={() => setPicker('gender')} optional />
          <DropdownField label="Relationship to Care Recipient" value={relationship} placeholder="Select relationship" onPress={() => setPicker('relationship')} />

          {/* Location Information */}
          <Text style={[s.sectionLabel, { marginTop: 8 }]}>Location Information</Text>

          <DropdownField label="Country" value={country} placeholder="Select Country" onPress={() => setPicker('country')} />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={f.label}>State</Text>
              <TextInput
                style={f.input}
                value={state}
                onChangeText={setState}
                placeholder="Select"
                placeholderTextColor="#C4C4C4"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={f.label}>City</Text>
              <TextInput
                style={f.input}
                value={city}
                onChangeText={setCity}
                placeholder="Select"
                placeholderTextColor="#C4C4C4"
              />
            </View>
          </View>

          <TextField label="Home Address" value={homeAddress} onChangeText={setHomeAddress} placeholder="Type" />
          <DropdownField label="Time Zone" value={timezone} placeholder="Select time zone" onPress={() => setPicker('timezone')} />

          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={picker === 'gender'}
        title="Select Gender"
        options={GENDERS}
        onSelect={setGender}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'relationship'}
        title="Select Relationship"
        options={RELATIONSHIPS}
        onSelect={setRelationship}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'country'}
        title="Select Country"
        options={COUNTRIES}
        onSelect={setCountry}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'timezone'}
        title="Select Time Zone"
        options={TIMEZONES}
        onSelect={setTimezone}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const f = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: F.i.medium, color: '#374151', marginBottom: 6 },
  optional: { color: '#9CA3AF' },
  input: {
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: F.i.regular, color: '#111827',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  inputFocused: { borderColor: '#E84545', backgroundColor: '#FFF' },
  inputDisabled: { color: '#9CA3AF' },
  dropdown: {
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dropdownValue: { fontSize: 15, fontFamily: F.i.regular, color: '#111827' },
  dropdownPlaceholder: { fontSize: 15, fontFamily: F.i.regular, color: '#C4C4C4' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, maxHeight: '60%',
  },
  title: { fontSize: 17, fontFamily: F.m.bold, color: '#111827', marginBottom: 16 },
  option: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 15, fontFamily: F.i.regular, color: '#111827' },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 36, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111827' },

  content: { paddingHorizontal: 20, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: '#E84545',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#7B61F8', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarInitial: { fontSize: 34, fontFamily: F.m.bold, color: '#FFF' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E84545', borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadPhoto: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },

  sectionLabel: { fontSize: 13, fontFamily: F.i.semiBold, color: '#9CA3AF', marginBottom: 16, letterSpacing: 0.3 },

  row2: { flexDirection: 'row', gap: 12, marginBottom: 16 },

  saveBtn: {
    marginTop: 24, height: 56, borderRadius: 28,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
});

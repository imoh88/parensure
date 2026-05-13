import { F } from '@/lib/fonts';
import { useProfilePhoto } from '@/lib/hooks/useProfilePhoto';
import { useAuthStore } from '@/lib/store/authStore';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Call, Camera, Home, Profile, Sms, Timer1 } from 'iconsax-react-native';
import React, { useCallback } from 'react';
import { ActivityIndicator, BackHandler, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Icon size={18} color="#E84545" variant="Linear" />
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function PersonalInformationScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user } = useAuthStore();
  const { photoUrl, uploading, pickAndUpload } = useProfilePhoto();

  const goBack = useCallback(() => {
    if (from === 'profile') {
      router.push('/(app)/profile');
    } else {
      router.back();
    }
  }, [from, router]);

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]));

  const initial = (user?.fullName ?? 'U').charAt(0).toUpperCase();
  const fullAddress = [user?.homeAddress, user?.city, user?.state, user?.country]
    .filter(Boolean).join(', ');

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E84545" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/edit-profile')} style={s.editBtn} activeOpacity={0.7}>
          <Text style={s.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={pickAndUpload} activeOpacity={0.85} disabled={uploading}>
            <View style={s.avatarRing}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={s.avatarImage} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarInitial}>{initial}</Text>
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
        <View style={s.card}>
          <Text style={s.sectionTitle}>Basic Information</Text>
          <InfoRow icon={Profile} label="Name" value={user?.fullName} />
          <View style={s.sep} />
          <InfoRow icon={Sms} label="Personal" value={user?.email} />
          <View style={s.sep} />
          <InfoRow icon={Call} label="Phone Number" value={user?.phone} />
          <View style={s.sep} />
          <InfoRow icon={Calendar} label="Date of Birth" value={undefined} />
          <View style={s.sep} />
          <InfoRow icon={Profile} label="Gender" value={undefined} />
        </View>

        {/* Location Information */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.sectionTitle}>Location Information</Text>
          <InfoRow icon={Home} label="Full Address" value={fullAddress || undefined} />
          <View style={s.sep} />
          <InfoRow icon={Timer1} label="Time Zone" value={user?.timezone} />
        </View>

        <TouchableOpacity
          style={s.saveBtn}
          onPress={goBack}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>Save &amp; Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 36, paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111827' },
  editBtn: { width: 48, alignItems: 'flex-end' },
  editText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },

  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 3, borderColor: '#E84545',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatar: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: '#7B61F8', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 94, height: 94, borderRadius: 47 },
  avatarInitial: { fontSize: 36, fontFamily: F.m.bold, color: '#FFF' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E84545', borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadPhoto: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },

  card: {
    backgroundColor: '#F5F5F5', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  sectionTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111827', paddingVertical: 12 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 2 },
  rowValue: { fontSize: 15, fontFamily: F.i.medium, color: '#111827' },
  sep: { height: 1, backgroundColor: '#E5E7EB', marginLeft: 50 },

  saveBtn: {
    marginTop: 32, height: 56, borderRadius: 28,
    backgroundColor: '#E84545', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E84545', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
});

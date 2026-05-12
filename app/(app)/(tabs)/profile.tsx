import { F } from '@/lib/fonts';
import { useProfilePhoto } from '@/lib/hooks/useProfilePhoto';
import { useAuthStore } from '@/lib/store/authStore';
import { AccountType } from '@/lib/types';
import { useRouter } from 'expo-router';
import {
  ArrowRight2,
  Global,
  Notification,
  Profile,
  Trash
} from 'iconsax-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MenuRowProps {
  icon: React.ElementType;
  label: string;
  labelColor?: string;
  iconColor?: string;
  onPress: () => void;
}

function MenuRow({ icon: Icon, label, labelColor = '#111827', iconColor = '#E84545', onPress }: MenuRowProps) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.menuRowLeft}>
        <View style={s.menuIcon}>
          <Icon size={18} color={iconColor} variant="Linear" />
        </View>
        <Text style={[s.menuLabel, { color: labelColor }]}>{label}</Text>
      </View>
      <ArrowRight2 size={18} color={labelColor === '#111827' ? '#E53935' : labelColor} variant="Linear" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout, activeRole, setActiveRole } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showLogout, setShowLogout] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const { photoUrl: profileImageUri, uploading: uploadingPhoto, pickAndUpload: handleUploadPhoto } = useProfilePhoto();

  const initial = (user?.fullName ?? 'U').charAt(0).toUpperCase();

  const roleLabel = (r: AccountType) =>
    r === 'CAREGIVER' ? 'Care Giver' : r === 'CARE_RECEIVER' ? 'Care Receiver' : 'Firm Admin';

  const allRoles: AccountType[] = user
    ? [user.accountType, ...(user.linkedAccountTypes ?? [])].filter(
        (r, i, arr) => arr.indexOf(r) === i
      )
    : [];

  return (
    <View style={[s.screen, { paddingTop: insets.top + 16 }]}>
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <TouchableOpacity
          style={s.avatarRing}
          onPress={handleUploadPhoto}
          disabled={uploadingPhoto}
          activeOpacity={0.8}
        >
          {uploadingPhoto ? (
            <View style={s.avatar}>
              <ActivityIndicator color="#FFF" size="large" />
            </View>
          ) : profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={s.avatarImage} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarInitial}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleUploadPhoto} disabled={uploadingPhoto} activeOpacity={0.7}>
          <Text style={s.uploadPhoto}>{uploadingPhoto ? 'Uploading…' : 'Upload Photo'}</Text>
        </TouchableOpacity>
      </View>

      {/* Menu rows */}
      <View style={s.menuList}>
        <MenuRow
          icon={Profile}
          label="Personal Information"
          onPress={() => router.push({ pathname: '/(app)/personal-information', params: { from: 'profile' } })}
        />
        <MenuRow
          icon={Global}
          label="Change Language"
          onPress={() => router.push('/(app)/change-language')}
        />
        <MenuRow
          icon={Notification}
          label="System Notifications"
          onPress={() => {}}
        />
        {/* <MenuRow
          icon={ProfileCircle}
          label="Transfer Role"
          onPress={() => setShowSwitch(true)}
        /> */}
        <MenuRow
          icon={Trash}
          label="Delete Profile"
          labelColor="#E84545"
          iconColor="#E84545"
          onPress={() =>
            Alert.alert(
              'Delete Profile',
              'Are you sure you want to delete your profile? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => {} },
              ]
            )
          }
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogout(true)} activeOpacity={0.7}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>

      {/* Logout confirmation modal */}
      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
        <View style={s.modalOverlay}>
          <View style={s.logoutModal}>
            <Text style={s.logoutTitle}>Are You Sure Want to{'\n'}Logout?</Text>
            <TouchableOpacity
              style={s.logoutConfirmBtn}
              onPress={() => { setShowLogout(false); logout(); }}
              activeOpacity={0.85}
            >
              <Text style={s.logoutConfirmText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLogout(false)} activeOpacity={0.7}>
              <Text style={s.logoutCancelText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transfer Role / Switch Account bottom sheet */}
      {/* <Modal visible={showSwitch} transparent animationType="slide" onRequestClose={() => setShowSwitch(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setShowSwitch(false)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Switch Account</Text>
            <TouchableOpacity onPress={() => setShowSwitch(false)} style={s.sheetClose} activeOpacity={0.7}>
              <Text style={s.sheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {allRoles.map((role) => {
            const isActive = activeRole === role;
            return (
              <TouchableOpacity
                key={role}
                style={s.accountRow}
                activeOpacity={0.8}
                onPress={() => { setActiveRole(role); setShowSwitch(false); }}
              >
                {profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={[s.accountAvatar, isActive && s.accountAvatarActive]} />
                ) : (
                  <View style={[s.accountAvatar, isActive && s.accountAvatarActive]}>
                    <Text style={s.accountAvatarText}>{initial}</Text>
                  </View>
                )}
                <View style={s.accountInfo}>
                  <Text style={s.accountName}>{user?.fullName}</Text>
                  <Text style={s.accountRole}>{roleLabel(role)}</Text>
                </View>
                {isActive ? (
                  <View style={s.radioActive}><View style={s.radioDot} /></View>
                ) : (
                  <View style={s.radioInactive} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal> */}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },

  // ── Avatar ──
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 3, borderColor: '#E84545',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, overflow: 'hidden',
  },
  avatar: {
    width: 98, height: 98, borderRadius: 49,
    backgroundColor: '#7B61F8', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 98, height: 98, borderRadius: 49 },
  avatarInitial: { fontSize: 36, fontFamily: F.m.bold, color: '#FFF' },
  uploadPhoto: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545', marginBottom: 8 },

  // ── Menu ──
  menuList: { paddingHorizontal: 20, gap: 12 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 18, paddingHorizontal: 18,
    backgroundColor: '#F3F3F3', borderRadius: 16,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3, fontFamily: F.i.medium },

  // ── Logout ──
  logoutBtn: {
    alignItems: 'center', justifyContent: 'center',
    marginTop: 28,
  },
  logoutText: { fontSize: 16, fontFamily: F.m.semiBold, color: '#E84545' },

  // ── Logout modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutModal: {
    backgroundColor: '#FFF', borderRadius: 24,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24,
    width: 300, alignItems: 'center',
  },
  logoutTitle: {
    fontSize: 20, fontFamily: F.m.bold, color: '#111827',
    textAlign: 'center', lineHeight: 28, marginBottom: 24,
  },
  logoutConfirmBtn: {
    width: '100%', height: 54, borderRadius: 27,
    backgroundColor: '#E84545', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoutConfirmText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },
  logoutCancelText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E84545' },

  // ── Switch account sheet ──
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 24,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111827' },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  sheetCloseText: { fontSize: 13, color: '#6B7280' },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
  },
  accountAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#7B61F8', alignItems: 'center', justifyContent: 'center',
  },
  accountAvatarText: { fontSize: 20, fontFamily: F.m.bold, color: '#FFF' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontFamily: F.m.bold, color: '#111827' },
  accountRole: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', marginTop: 2 },
  radioActive: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#E84545',
    alignItems: 'center', justifyContent: 'center',
  },
  radioInactive: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D5DB' },
  radioDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E84545' },
  accountAvatarActive: { backgroundColor: '#E84545' },
});

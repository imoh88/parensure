import { useAuthStore } from '@/lib/store/authStore';
import { F } from '@/lib/fonts';
import { ArrowRight2, LogoutCurve, Profile, Setting2 } from 'iconsax-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.72;

interface ProfileSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSidebar({ visible, onClose }: ProfileSidebarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const firstName = user?.fullName?.split(' ')[0] || 'User';

  const handlePersonalInfo = () => {
    onClose();
    setTimeout(() => router.push('/(app)/profile'), 250);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      Alert.alert('Logout', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }, 300);
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sidebar panel */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        {/* Profile section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName || 'User'}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Menu items */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handlePersonalInfo} activeOpacity={0.7}>
            <Profile size={22} color="#374151" variant="Linear" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Personal Information</Text>
            <ArrowRight2 size={18} color="#C4C4C4" variant="Linear" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Setting2 size={22} color="#374151" variant="Linear" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Settings</Text>
            <ArrowRight2 size={18} color="#C4C4C4" variant="Linear" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <LogoutCurve size={22} color="#EF4444" variant="Linear" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#7B61F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 34,
    fontFamily: F.m.bold,
  },
  name: {
    fontSize: 18,
    fontFamily: F.m.bold,
    color: '#111111',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 0,
  },
  menu: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.i.medium,
    color: '#1F2937',
  },
  logoutSection: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoutButton: {
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#EF4444',
  },
});

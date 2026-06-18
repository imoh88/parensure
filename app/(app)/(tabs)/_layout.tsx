import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { Add, Heart, Home, Notification, People, Profile } from 'iconsax-react-native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabItem({
  icon: Icon,
  label,
  color,
  focused,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={s.item}>
      <View style={s.iconWrap}>
        <Icon size={22} color={color} variant={focused ? 'Bold' : 'Linear'} />
      </View>
      <Text style={[s.label, { color }]}>{label}</Text>
    </View>
  );
}

const CAREGIVER_FAB_ITEMS     = ['Create Task', 'Add Appointment', 'Add Medication', 'Add Care Recipient'] as const;
const FIRM_ADMIN_FAB_ITEMS    = ['Add Appointment', 'Add Medication', 'Add Care Recipient'] as const;
const CARE_RECEIVER_FAB_ITEMS = ['Create Task', 'Add Appointment', 'Add Medication', 'Add Care Giver'] as const;
type FabItem =
  | typeof CAREGIVER_FAB_ITEMS[number]
  | typeof FIRM_ADMIN_FAB_ITEMS[number]
  | typeof CARE_RECEIVER_FAB_ITEMS[number];

const ITEM_H = 50;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const [fabOpen, setFabOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const isCareReceiver = activeRole === 'CARE_RECEIVER';
  const FAB_ITEMS: readonly FabItem[] = isCareReceiver
    ? CARE_RECEIVER_FAB_ITEMS
    : activeRole === 'FIRM_ADMIN'
    ? FIRM_ADMIN_FAB_ITEMS
    : CAREGIVER_FAB_ITEMS;

  const toggleFab = () => {
    const next = !fabOpen;
    setFabOpen(next);
    Animated.spring(anim, { toValue: next ? 1 : 0, useNativeDriver: true, friction: 7, tension: 80 }).start();
  };

  const closeFab = () => {
    setFabOpen(false);
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
  };

  const rotation = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const isCaregiver = activeRole === 'CAREGIVER';
  const leftNames  = isCaregiver ? ['index', 'carecircle'] : ['index', 'health'];
  const rightNames = isCaregiver ? ['alerts', 'profile']   : ['carecircle', 'profile'];

  const left  = state.routes.filter((r) => leftNames.includes(r.name));
  const right = state.routes.filter((r) => rightNames.includes(r.name));

  const renderTab = (route: (typeof state.routes)[0]) => {
    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === routeIndex;
    const { options } = descriptors[route.key];
    const color = focused ? '#E53935' : '#6B7280';

    const tabIcon =
      route.name === 'carecircle' && !isCareReceiver
        ? <TabItem icon={Heart} label="Care Circle" color={color} focused={focused} />
        : options.tabBarIcon?.({ color, focused, size: 22 });

    return (
      <TouchableOpacity
        key={route.key}
        style={s.tabBtn}
        activeOpacity={0.7}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          if (fabOpen) closeFab();
        }}
      >
        {tabIcon}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {fabOpen && (
        <TouchableWithoutFeedback onPress={closeFab}>
          <Animated.View
            style={[
              s.backdrop,
              { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {[...FAB_ITEMS].reverse().map((label, ri) => {
        const slot = ri + 1;
        const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
        const scale  = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
        const bottomPos = slot * ITEM_H + 72 + 8 + insets.bottom;

        return (
          <Animated.View
            key={label}
            style={[s.optionWrapper, { bottom: bottomPos, transform: [{ scale }], opacity }]}
            pointerEvents={fabOpen ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={s.option}
              onPress={() => {
                closeFab();
                if (label === 'Create Task')                                     router.push('/(app)/add-task');
                else if (label === 'Add Appointment')                            router.push('/(app)/add-appointment');
                else if (label === 'Add Care Recipient' || label === 'Add Care Giver') router.push('/(app)/add-care-receiver');
                else if (label === 'Add Medication')                             router.push('/(app)/add-medication');
              }}
              activeOpacity={0.75}
            >
              <Text style={s.optionText}>{label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      <View style={[s.bar, { paddingBottom: insets.bottom, height: 72 + insets.bottom }]}>
        <View style={s.side}>{left.map(renderTab)}</View>

        <View style={s.fabSlot}>
          <View style={s.fabRing} />
          <TouchableOpacity style={s.fab} onPress={toggleFab} activeOpacity={0.85}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Add size={28} color="#FFF" variant="Linear" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={s.side}>{right.map(renderTab)}</View>
      </View>
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabItem icon={Home} label="Home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, focused }) => (
            <TabItem icon={Heart} label="Health" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="carecircle"
        options={{
          title: 'Care Circle',
          tabBarIcon: ({ color, focused }) => (
            <TabItem icon={People} label="Care Circle" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <TabItem icon={Notification} label="Alerts" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabItem icon={Profile} label="Profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    height: 72,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  side: { flex: 2, flexDirection: 'row' },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  item: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontFamily: F.m.medium },
  fabSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  fabRing: {
    width: 72, height: 36,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    overflow: 'visible', position: 'absolute', top: -18,
  },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 10 },
  optionWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  option: {
    backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 5, minWidth: 180, alignItems: 'center',
  },
  optionText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
});

import { F } from "@/lib/fonts";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";


const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Illustrations ────────────────────────────────────────────────────────────

function ProfileIcon() {
  return (
    <Svg width="52" height="52" viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r="26" fill="#C084FC" />
      {/* body */}
      <Ellipse cx="26" cy="38" rx="12" ry="7" fill="#EC4899" />
      {/* head */}
      <Circle cx="26" cy="21" r="9" fill="#FBBF24" />
      {/* face */}
      <Circle cx="26" cy="20" r="6" fill="#F9A8D4" />
      {/* hair */}
      <Path
        d="M17 20 Q17 11 26 11 Q35 11 35 20 Q32 14 26 14 Q20 14 17 20Z"
        fill="#1F2937"
      />
      {/* eyes */}
      <Circle cx="23.5" cy="19.5" r="1" fill="#1F2937" />
      <Circle cx="28.5" cy="19.5" r="1" fill="#1F2937" />
      {/* smile */}
      <Path
        d="M23 23 Q26 26 29 23"
        stroke="#BE185D"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function InvitesIcon() {
  return (
    <Svg width="52" height="52" viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r="26" fill="#34D399" />
      {/* envelope body */}
      <Rect
        x="9"
        y="16"
        width="30"
        height="22"
        rx="3"
        fill="white"
        opacity="0.95"
      />
      {/* envelope flap */}
      <Path
        d="M9 19 L24 29 L39 19"
        stroke="#059669"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* lines */}
      <Rect x="15" y="24" width="8" height="2" rx="1" fill="#D1FAE5" />
      <Rect x="15" y="28" width="12" height="2" rx="1" fill="#D1FAE5" />
      {/* notification dot */}
      <Circle cx="38" cy="16" r="6" fill="#F59E0B" />
      <SvgText
        x="38"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="bold"
      >
        {"!"}
      </SvgText>
    </Svg>
  );
}

function CareCircleIcon() {
  return (
    <Svg width="52" height="52" viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r="26" fill="#FB923C" />
      {/* center person */}
      <Circle cx="26" cy="19" r="6" fill="#FDE68A" />
      <Ellipse cx="26" cy="30" rx="7" ry="4.5" fill="#FDE68A" />
      {/* left person */}
      <Circle cx="15" cy="24" r="5" fill="#86EFAC" />
      <Ellipse cx="15" cy="33" rx="5.5" ry="4" fill="#86EFAC" />
      {/* right person */}
      <Circle cx="37" cy="24" r="5" fill="#93C5FD" />
      <Ellipse cx="37" cy="33" rx="5.5" ry="4" fill="#93C5FD" />
    </Svg>
  );
}

function TasksIcon() {
  return (
    <Svg width="52" height="52" viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r="26" fill="#60A5FA" />
      {/* clipboard */}
      <Rect
        x="13"
        y="11"
        width="22"
        height="29"
        rx="3"
        fill="white"
        opacity="0.9"
      />
      <Rect x="20" y="9" width="8" height="5" rx="2" fill="#BFDBFE" />
      {/* lines */}
      <Rect x="17" y="18" width="14" height="2.5" rx="1.25" fill="#F87171" />
      <Rect x="17" y="24" width="10" height="2.5" rx="1.25" fill="#D1D5DB" />
      <Rect x="17" y="30" width="12" height="2.5" rx="1.25" fill="#D1D5DB" />
      {/* plus badge */}
      <Circle cx="35" cy="37" r="6" fill="#1D4ED8" />
      <Rect x="32" y="36" width="6" height="2" rx="1" fill="white" />
      <Rect x="34" y="34" width="2" height="6" rx="1" fill="white" />
    </Svg>
  );
}

function DevicesIcon() {
  return (
    <Svg width="52" height="52" viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r="26" fill="#2DD4BF" />
      {/* phone */}
      <Rect x="21" y="9" width="14" height="25" rx="3" fill="#A855F7" />
      <Rect x="23" y="12" width="10" height="18" rx="1.5" fill="#EDE9FE" />
      <Rect x="26" y="33" width="4" height="1.5" rx="0.75" fill="#C4B5FD" />
      {/* small device */}
      <Rect x="12" y="27" width="11" height="16" rx="2.5" fill="#F97316" />
      <Rect x="13.5" y="29" width="8" height="10" rx="1" fill="#FED7AA" />
      <Rect x="15" y="42" width="5" height="1.5" rx="0.75" fill="#EA580C" />
    </Svg>
  );
}

function NotificationIcon() {
  return (
    <Svg width="52" height="52" viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r="26" fill="#F87171" />
      {/* bell */}
      <Path
        d="M16 30 C16 22 20 17 26 17 C32 17 36 22 36 30 L16 30Z"
        fill="#FBBF24"
      />
      <Rect x="22" y="30" width="8" height="4" rx="2" fill="#92400E" />
      <Circle cx="26" cy="14" r="2.5" fill="#F59E0B" />
      <Rect
        x="14"
        y="29"
        width="24"
        height="2.5"
        rx="1.25"
        fill="#92400E"
        opacity="0.4"
      />
      {/* checkmark badge */}
      <Circle cx="37" cy="16" r="6" fill="#EF4444" />
      <Path
        d="M34 16 L36 18.5 L40 13.5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const COLORS = [
  "#F87171",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#C084FC",
  "#FB923C",
  "#2DD4BF",
  "#F472B6",
  "#A3E635",
  "#38BDF8",
];

function ConfettiPiece({
  x,
  color,
  size,
  delay,
  isRect,
}: {
  x: number;
  color: string;
  size: number;
  delay: number;
  isRect: boolean;
}) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 320,
          duration: 2800 + Math.random() * 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2800 + Math.random() * 1200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${360 + Math.random() * 360}deg`],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: isRect ? size * 2.2 : size,
        height: size,
        borderRadius: isRect ? 2 : size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    />
  );
}

const CONFETTI_DATA = Array.from({ length: 72 }, (_, i) => ({
  id: i,
  x: Math.random() * (SCREEN_WIDTH - 10),
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  size: 5 + Math.random() * 7,
  delay: Math.random() * 2500,
  isRect: Math.random() > 0.45,
}));

function Confetti() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CONFETTI_DATA.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </View>
  );
}

// ─── Setup Items ──────────────────────────────────────────────────────────────

const setupItems = [
  { icon: <ProfileIcon />, label: "Your Profile" },
  { icon: <InvitesIcon />, label: "Send Invites" },
  { icon: <CareCircleIcon />, label: "Care Circle" },
  { icon: <TasksIcon />, label: "Create First Tasks" },
  { icon: <DevicesIcon />, label: "Connect Devices" },
  { icon: <NotificationIcon />, label: "Notification Preferences" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CareCircleSetupScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Confetti />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Let's Set Up Your Care Circle</Text>
          <Text style={styles.subtitle}>
            You're almost ready. Complete these 6 quick steps to personalize
            your experience and start receiving meaningful updates.
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cardList}>
          {setupItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.75}
            >
              <View style={styles.iconCircle}>{item.icon}</View>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spacer */}
        <View style={{ height: 48 }} />

        {/* Buttons */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.startButton}
            activeOpacity={0.85}
            onPress={() => router.replace("/(auth)/create-care-receiver")}
          >
            <Text style={styles.startButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            activeOpacity={0.7}
            onPress={() => router.replace("/(app)")}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingTop: 180,
    paddingHorizontal: 24,
    paddingBottom: 48,
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontFamily: F.m.xBold,
    color: "#111827",
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: "#6B7280",
    lineHeight: 23,
  },
  cardList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    width: (SCREEN_WIDTH - 48 - 12) / 2, // 48 = horizontal padding x2, 12 = gap
    borderRadius: 100,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    gap: 10
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: F.m.bold,
    color: "#111827",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  bottomSection: {
    paddingTop: 30,
    gap: 12,
  },
  startButton: {
    height: 58,
    borderRadius: 100,
    backgroundColor: "#E84545",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    fontSize: 17,
    fontFamily: F.m.bold,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  skipButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 17,
    fontFamily: F.m.bold,
    color: "#111827",
  },
});

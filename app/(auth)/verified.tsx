import { F } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Confetti ─────────────────────────────────────────────────────────────────

const COLORS = ['#F87171','#FBBF24','#34D399','#60A5FA','#C084FC','#FB923C','#2DD4BF','#F472B6'];

const CONFETTI_DATA = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * (SCREEN_WIDTH - 10),
  color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
  size: 5 + Math.random() * 7,
  delay: Math.random() * 1800,
  isRect: Math.random() > 0.45,
}));

function ConfettiPiece({ x, color, size, delay, isRect }: {
  x: number; color: string; size: number; delay: number; isRect: boolean;
}) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: 340, duration: 2600 + Math.random() * 1000,
          easing: Easing.in(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(rotate, { toValue: 1, duration: 2600 + Math.random() * 1000, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 360}deg`] });

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: 0,
      width: isRect ? size * 2.2 : size, height: size,
      borderRadius: isRect ? 2 : size / 2,
      backgroundColor: color, opacity,
      transform: [{ translateY }, { rotate: spin }],
    }} />
  );
}

function Confetti() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CONFETTI_DATA.map((p) => <ConfettiPiece key={p.id} {...p} />)}
    </View>
  );
}

// ─── Badge Icon ───────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <Svg width="120" height="120" viewBox="0 0 120 120">
      {/* Scalloped badge shape */}
      <Path
        d="M60 4
           L70 2 L78 8 L87 7 L93 14 L102 16 L105 25 L112 30 L112 40
           L118 46 L115 56 L118 64 L112 70 L112 80 L105 85 L102 94
           L93 96 L87 103 L78 102 L70 108 L60 106
           L50 108 L42 102 L33 103 L27 96 L18 94 L15 85
           L8 80 L8 70 L2 64 L5 56 L2 46 L8 40 L8 30
           L15 25 L18 16 L27 14 L33 7 L42 8 L50 2 Z"
        fill="#E53935"
      />
      {/* Checkmark */}
      <Path
        d="M38 62 L52 76 L82 44"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VerifiedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Confetti />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={s.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={s.body}>
        <VerifiedBadge />
        <Text style={s.title}>Verified{'\n'}Successfully</Text>
        <Text style={s.subtitle}>Continue setting up your account</Text>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={s.continueBtn}
          onPress={() => router.push('/(auth)/privacy-consent')}
          activeOpacity={0.85}
        >
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  backBtn: { paddingHorizontal: 20, paddingTop: 8, alignSelf: 'flex-start' },
  backArrow: { fontSize: 30, fontFamily: F.i.regular, color: '#111827', lineHeight: 34 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 38,
    fontFamily: F.m.xBold,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: F.i.regular,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  continueBtn: {
    height: 58,
    borderRadius: 100,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF' },
});

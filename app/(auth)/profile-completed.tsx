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
import Svg, { Path, Circle, Polygon } from 'react-native-svg';

const { width: W } = Dimensions.get('window');

// ─── Confetti ─────────────────────────────────────────────────────────────────

const COLORS = ['#F87171','#FBBF24','#34D399','#60A5FA','#C084FC','#FB923C','#2DD4BF','#F472B6'];

function ConfettiPiece({ x, color, size, delay, isRect }: { x: number; color: string; size: number; delay: number; isRect: boolean }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 380, duration: 2800 + Math.random() * 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 2800 + Math.random() * 1200, useNativeDriver: true }),
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

const CONFETTI_DATA = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * (W - 10),
  color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
  size: 5 + Math.random() * 7,
  delay: Math.random() * 1500,
  isRect: Math.random() > 0.45,
}));

// ─── Badge icon ───────────────────────────────────────────────────────────────

function BadgeCheck() {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      {/* Starburst / badge shape */}
      <Polygon
        points="48,4 58,16 73,12 76,27 90,33 85,48 90,63 76,69 73,84 58,80 48,92 38,80 23,84 20,69 6,63 11,48 6,33 20,27 23,12 38,16"
        fill="#E84545"
      />
      {/* Checkmark */}
      <Path
        d="M32 49 L42 60 L64 37"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileCompletedScreen() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 10, stiffness: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Confetti layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {CONFETTI_DATA.map((p) => <ConfettiPiece key={p.id} {...p} />)}
      </View>

      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <BadgeCheck />
        </Animated.View>

        <Text style={styles.title}>Profile completed{'\n'}successfully</Text>
        <Text style={styles.subtitle}>Continue setting up your account</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => router.replace('/(app)')}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  title: { fontSize: 30, fontFamily: F.m.xBold, color: '#111827', textAlign: 'center', lineHeight: 38 },
  subtitle: { fontSize: 15, fontFamily: F.i.regular, color: '#6B7280', textAlign: 'center' },
  bottom: { paddingHorizontal: 28, paddingBottom: 24 },
  btn: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E84545',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E84545',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFFFFF' },
});

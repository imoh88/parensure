import { F } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#E53935', '#FF6B6B', '#4CAF50', '#2196F3',
  '#FFC107', '#9C27B0', '#00BCD4', '#FF9800',
  '#E91E63', '#8BC34A', '#03A9F4', '#FF5722',
];

const PIECES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  x: Math.random() * W,
  delay: Math.random() * 800,
  duration: 1800 + Math.random() * 1200,
  size: 6 + Math.random() * 8,
  isRect: Math.random() > 0.5,
  rotate: Math.random() * 360,
}));

function ConfettiPiece({ piece }: { piece: typeof PIECES[number] }) {
  const y = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(piece.rotate)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(piece.delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: H + 40,
          duration: piece.duration,
          easing: Easing.quad,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: piece.duration,
          delay: piece.duration * 0.6,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: piece.rotate + 720,
          duration: piece.duration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={[
        cp.piece,
        {
          left: piece.x,
          width: piece.size,
          height: piece.isRect ? piece.size * 2.5 : piece.size,
          borderRadius: piece.isRect ? 2 : piece.size / 2,
          backgroundColor: piece.color,
          transform: [{ translateY: y }, { rotate: spin }],
          opacity,
        },
      ]}
    />
  );
}

export default function MedicationSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { medName } = useLocalSearchParams<{ medName?: string }>();

  // Badge scale-in
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={s.screen}>
      {/* Confetti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {PIECES.map((p) => <ConfettiPiece key={p.id} piece={p} />)}
      </View>

      {/* Content */}
      <View style={[s.content, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={[s.badge, { transform: [{ scale }] }]}>
          <Text style={s.badgeCheck}>✓</Text>
        </Animated.View>

        <Text style={s.title}>Medication added{'\n'}successfully</Text>
        <Text style={s.body}>
          You've successfully added a new medication for your loved one. Their care schedule has been updated.
        </Text>

        <View style={s.actions}>
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => router.push('/(app)/medication')}
            activeOpacity={0.85}
          >
            <Text style={s.btnPrimaryText}>View Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => router.push('/(app)/add-medication')}
            activeOpacity={0.85}
          >
            <Text style={s.btnSecondaryText}>Add Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const cp = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  badge: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    // Scalloped look via shadow
    shadowColor: '#E53935',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  badgeCheck: { fontSize: 44, color: '#FFF', lineHeight: 52 },
  title: {
    fontSize: 28, fontFamily: F.m.xBold, color: '#111',
    textAlign: 'center', letterSpacing: -0.5, lineHeight: 36,
  },
  body: {
    fontSize: 15, fontFamily: F.i.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 23,
  },
  actions: { width: '100%', gap: 12, marginTop: 12 },
  btnPrimary: {
    height: 56, borderRadius: 28,
    backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  btnPrimaryText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  btnSecondary: {
    height: 56, borderRadius: 28,
    borderWidth: 1.5, borderColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 16, fontFamily: F.m.bold, color: '#E53935' },
});

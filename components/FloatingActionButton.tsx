import { F } from '@/lib/fonts';
import { Add } from 'iconsax-react-native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const ITEMS = [
  'Create Task',
  'Add Appointment',
  'Add Medication',
  'Add Care Recipient',
  'Add Care Giver',
] as const;

interface Props {
  onSelect?: (item: (typeof ITEMS)[number]) => void;
}

const ITEM_HEIGHT = 52;

export default function FloatingActionButton({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.spring(anim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  };

  const close = () => {
    setOpen(false);
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
  };

  const rotation = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <>
      {/* Full-screen backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* FAB + Options container */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Option items — rendered bottom-to-top so z-order is natural */}
        {[...ITEMS].reverse().map((label, reverseIndex) => {
          // reverseIndex 0 = 'Add Care Giver' (closest to FAB)
          const slot = reverseIndex + 1;
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(slot * ITEM_HEIGHT + 8)],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          });
          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.85, 1],
          });

          return (
            <Animated.View
              key={label}
              style={[
                styles.optionWrapper,
                { transform: [{ translateY }, { scale }], opacity },
              ]}
              pointerEvents={open ? 'auto' : 'none'}
            >
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  close();
                  onSelect?.(label);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.optionText}>{label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Main FAB button */}
        <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.85}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Add size={30} color="#FFF" variant="Linear" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  container: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  optionWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  option: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    minWidth: 168,
  },
  optionText: {
    fontSize: 14,
    fontFamily: F.m.semiBold,
    color: '#111',
  },
});

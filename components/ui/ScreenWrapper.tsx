import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  /** Background color applied to both SafeAreaView and inner view. Default: '#FFFFFF' */
  bg?: string;
  /** Extra style applied to the inner content view (between SafeAreaView and KAV). */
  style?: ViewStyle;
  /** StatusBar style. Default: 'dark' */
  barStyle?: 'dark' | 'light' | 'auto' | 'inverted';
  /** Set to false to disable KeyboardAvoidingView (e.g. screens with no inputs). Default: true */
  avoidKeyboard?: boolean;
  /** Passed through to KeyboardAvoidingView keyboardVerticalOffset. Default: 0 */
  keyboardOffset?: number;
}

export default function ScreenWrapper({
  children,
  bg = '#FFFFFF',
  style,
  barStyle = 'dark',
  avoidKeyboard = true,
  keyboardOffset = 0,
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={barStyle} backgroundColor={bg} />
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={[s.flex, style]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        <View style={[s.flex, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});

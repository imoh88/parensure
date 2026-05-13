import { F } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Phone OTP verification is no longer part of the auth flow.
export default function VerifyOTPScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>This step is no longer required.</Text>
      <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.link}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  text: { fontSize: 16, fontFamily: F.i.regular, color: '#6B7280', marginBottom: 16 },
  link: { fontSize: 16, fontFamily: F.m.semiBold, color: '#E84545' },
});

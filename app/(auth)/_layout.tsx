import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="register-caregiver-type" />
      <Stack.Screen name="register-name" />
      <Stack.Screen name="register-email" />
      <Stack.Screen name="verify-email-code" />
      <Stack.Screen name="register-phone" />
      <Stack.Screen name="verify-phone-code" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="success" />
    </Stack>
  );
}

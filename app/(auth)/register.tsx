import { F } from "@/lib/fonts";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const roles = [
  {
    id: "CARE_RECEIVER",
    title: "Care Receiver",
    description:
      "I want to receive reminders, share updates, and stay connected with my caregiver.",
    icon: require("@/assets/images/ellipse4.png"),
  },
  {
    id: "CAREGIVER",
    title: "Caregiver",
    description:
      "I want to support and stay informed about someone's daily wellbeing and important updates.",
    icon: require("@/assets/images/ellipse3.png"),
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    router.push({
      pathname: "/(auth)/register-name",
      params: { role: selectedRole },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require("@/assets/images/icons/back-icon.png")} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            This helps us customize your setup and dashboard.
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roles.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.8}
              >
                <View style={styles.roleContent}>
                  <View style={styles.roleIcon}>
                    <Image source={role.icon} style={styles.iconPlaceholder} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  </View>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />

        {selectedRole && (
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.termsText}>
          By continuing, you agree to our{" "}
          <Text style={styles.termsLink}>Terms</Text>
          {"\n"}and <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backButton: {
    padding: 20,
    alignSelf: "flex-start",
  },
  header: {
    paddingHorizontal: 28,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: F.m.xBold,
    color: "#000000",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: F.i.regular,
    color: "#6B7280",
    lineHeight: 24,
  },
  rolesContainer: {
    paddingHorizontal: 28,
    gap: 16,
  },
  roleCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "transparent",
  },
  roleCardSelected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#E84545",
  },
  roleContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  roleIcon: {
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: F.m.bold,
    color: "#111827",
    marginBottom: 6,
  },
  roleDescription: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: "#6B7280",
    lineHeight: 20,
  },
  arrow: {
    fontSize: 24,
    color: "#9CA3AF",
    fontFamily: F.i.regular,
  },
  bottomSection: {
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E84545",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: F.m.semiBold,
    color: "#FFFFFF",
  },
  termsText: {
    fontSize: 14,
    fontFamily: F.i.regular,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 28,
  },
  termsLink: {
    color: "#E84545",
    fontFamily: F.m.semiBold,
  },
});

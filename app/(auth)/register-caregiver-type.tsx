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

const types = [
  {
    id: "CAREGIVER",
    title: "Individual Caregiver",
    description:
      "I provide care independently and want to manage my clients and schedules.",
    icon: require("@/assets/images/ellipse5.png"),
  },
  {
    id: "FIRM_ADMIN",
    title: "Care Firm",
    description:
      "I manage a care firm and want to coordinate caregivers and clients from one place.",
    icon: require("@/assets/images/ellipse6.png"),
  },
];

export default function RegisterCaregiverTypeScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedType) return;
    router.push({
      pathname: "/(auth)/register-name",
      params: { role: selectedType },
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
          <Text style={styles.title}>What type of caregiver are you?</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to operate on Parensure.
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {types.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => setSelectedType(type.id)}
                activeOpacity={0.8}
              >
                <View style={styles.roleContent}>
                  <View style={styles.roleIcon}>
                    <Image source={type.icon} style={styles.iconPlaceholder} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>{type.title}</Text>
                    <Text style={styles.roleDescription}>{type.description}</Text>
                  </View>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />

        {selectedType && (
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
});

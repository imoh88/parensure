import slide2Image from "@/assets/images/slide2.jpg";
import slide3Image from "@/assets/images/slide3.jpg";
import welcomeImage from "@/assets/images/welcome-image.jpg";
import { F } from "@/lib/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Care Without\nHovering",
    description:
      "Stay connected to the people you love —\nwhile respecting their independence.",
    image: welcomeImage,
    imageScale: 1,
    imageTop: 0,
  },
  {
    id: "2",
    title: "Peace of Mind,\nNot Constant\nChecking",
    description:
      "Know when things are going well.\nGet alerted when they're not.",
    image: slide2Image,
    imageScale: 0.9,
    imageTop: 0,
  },
  {
    id: "3",
    title: "Support That Feels\nInvisible",
    description:
      "Smart reminders, gentle monitoring, and\nmeaningful insights — without cameras or\nintrusion.",
    image: slide3Image,
    imageScale: 1,
    imageTop: 0,
  },
];

const AUTO_SLIDE_INTERVAL = 3000;

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const crossFadeTo = (nextIndex: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setCurrentIndex(nextIndex);
  };

  const startAutoSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        crossFadeTo(nextIndex);
        return nextIndex;
      });
    }, AUTO_SLIDE_INTERVAL);
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      crossFadeTo(idx);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleScrollBeginDrag = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleMomentumScrollEnd = () => {
    startAutoSlide();
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={styles.slide}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background image — cross-fades on slide change */}
      <Animated.Image
        source={slides[currentIndex]!.image}
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
            transform: [
              { scale: 0.8 },
              { translateY: -160 },
              { translateX: -190 },
            ],
          },
        ]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.1)",
          "rgba(0,0,0,0.3)",
          "rgba(0,0,0,0.7)",
          "rgba(0,0,0,0.9)",
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Blue tint overlay */}
      <View style={styles.blueTint} />

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBar,
              currentIndex === index && styles.progressBarActive,
            ]}
          />
        ))}
      </View>

      {/* Bottom content */}
      <View style={styles.bottomContainer}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          bounces={false}
          onScrollBeginDrag={handleScrollBeginDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        />

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/register")}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.signInRow}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  blueTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,50,140,0.28)",
  },
  progressContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: "#FFFFFF",
    height: 4,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  slide: {
    width: width,
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 35,
    fontFamily: F.m.xBold,
    color: "#FFFFFF",
    lineHeight: 46,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 24,
    fontFamily: F.i.regular,
  },
  bottomSection: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 50,
  },
  button: {
    backgroundColor: "#E84545",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 17,
    fontFamily: F.m.semiBold,
    color: "#FFFFFF",
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signInText: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: "rgba(255,255,255,0.7)",
  },
  signInLink: {
    fontSize: 15,
    color: "#E84545",
    fontFamily: F.m.semiBold,
  },
});
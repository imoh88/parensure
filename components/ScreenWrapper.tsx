import { ArrowLeft } from 'iconsax-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from './ui/GradientBackground';

interface ScreenWrapperProps {
  children: React.ReactNode;
  gradient?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  className?: string;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  gradient = false,
  showBackButton = false,
  onBackPress,
  className = '',
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const content = (
    <SafeAreaView className="flex-1">
      <StatusBar style={gradient ? 'light' : 'dark'} />
      {showBackButton && (
        <View className="px-6 pt-2 pb-4">
          <TouchableOpacity
            onPress={handleBackPress}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <ArrowLeft size={24} color={gradient ? '#fff' : '#000'} variant="Linear" />
          </TouchableOpacity>
        </View>
      )}
      <View className={`flex-1 ${className}`}>{children}</View>
    </SafeAreaView>
  );

  if (gradient) {
    return <GradientBackground>{content}</GradientBackground>;
  }

  return <View className="flex-1 bg-white">{content}</View>;
};

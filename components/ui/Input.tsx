import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardTypeOptions } from 'react-native';
import { Eye, EyeSlash } from 'iconsax-react-native';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  error?: string;
  leftIcon?: React.ElementType;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
  leftIcon: LeftIcon,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error ? 'border-red-500' : isFocused ? 'border-purple-600' : 'border-gray-300';

  return (
    <View className={`mb-4 ${className}`}>
      <Text className="text-gray-700 font-medium mb-2">{label}</Text>
      <View className={`flex-row items-center border ${borderColor} rounded-xl px-4 bg-white`}>
        {!!LeftIcon && (
          <LeftIcon size={20} color="#9CA3AF" variant="Linear" style={{ marginRight: 8 }} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 py-4 text-gray-900 text-base"
          autoCapitalize="none"
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword
              ? <EyeSlash size={20} color="#9CA3AF" variant="Linear" />
              : <Eye size={20} color="#9CA3AF" variant="Linear" />
            }
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}
    </View>
  );
};

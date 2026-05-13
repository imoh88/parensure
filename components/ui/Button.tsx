import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
}) => {
  const baseStyles = 'py-4 px-6 rounded-xl items-center justify-center';

  const variantStyles = {
    primary: 'bg-purple-600 active:bg-purple-700',
    secondary: 'bg-gray-200 active:bg-gray-300',
    outline: 'border-2 border-purple-600 bg-transparent',
  };

  const textStyles = {
    primary: 'text-white font-semibold text-base',
    secondary: 'text-gray-800 font-semibold text-base',
    outline: 'text-purple-600 font-semibold text-base',
  };

  const disabledStyles = disabled || loading ? 'opacity-50' : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#7c3aed'} />
      ) : (
        <Text className={textStyles[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

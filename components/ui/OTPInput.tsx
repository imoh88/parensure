import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 4,
  value,
  onChange,
  autoFocus = true,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length === 0) {
      // Handle backspace
      const newOtp = value.split('');
      newOtp[index] = '';
      onChange(newOtp.join(''));

      // Move to previous input
      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else {
      // Take only the last character if multiple are pasted
      const digit = numericText.slice(-1);
      const newOtp = value.split('');
      newOtp[index] = digit;
      onChange(newOtp.join(''));

      // Move to next input
      if (index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      } else {
        // Last input, blur
        inputsRef.current[index]?.blur();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View className="flex-row justify-center gap-3">
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputsRef.current[index] = ref)}
          value={value[index] || ''}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          onPressIn={() => inputsRef.current[index]?.focus()}
          keyboardType="number-pad"
          maxLength={1}
          autoFocus={autoFocus && index === 0}
          className={`w-16 h-16 border-2 rounded-xl text-center text-2xl font-semibold ${
            focusedIndex === index ? 'border-purple-600' : 'border-gray-300'
          } bg-white`}
          style={styles.input}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    textAlignVertical: 'center',
  },
});

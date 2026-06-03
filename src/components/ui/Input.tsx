import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius } from '../../theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  showPasswordToggle?: boolean;
}

export default function Input({ 
  label, 
  error, 
  helperText,
  leftIcon,
  showPasswordToggle = false,
  secureTextEntry,
  ...props 
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const borderColor = error 
    ? Colors.error 
    : isFocused 
      ? Colors.primary 
      : Colors.border;

  return (
    <View className="mb-4">
      <Text style={[Typography.label, { marginBottom: 8 }]}>{label}</Text>
      <View 
        className="flex-row items-center rounded-xl px-4 py-3"
        style={{ 
          backgroundColor: Colors.background,
          borderWidth: 1.5,
          borderColor,
        }}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon as any} 
            size={20} 
            color={Colors.textMuted} 
            style={{ marginRight: 12 }}
          />
        )}
        <TextInput
          className="flex-1 text-base"
          style={{ 
            color: Colors.textPrimary,
            paddingVertical: 2,
          }}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off' : 'eye'} 
              size={22} 
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[Typography.caption, { color: Colors.error, marginTop: 4 }]}>
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text style={[Typography.caption, { marginTop: 4 }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

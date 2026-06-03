import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-slate-400 mb-2">{label}</Text>
      <TextInput
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
        placeholderTextColor="#64748B"
        {...props}
      />
      {error && <Text className="text-urgent mt-1 text-sm">{error}</Text>}
    </View>
  );
}

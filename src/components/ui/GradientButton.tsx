import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps extends TouchableOpacityProps {
  title: string;
  className?: string;
  textClassName?: string;
  colors?: readonly [string, string, ...string[]];
}

export default function GradientButton({
  title,
  className = '',
  textClassName = '',
  colors = ['#F8FAFC', '#D1D5DB'],
  ...props
}: GradientButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.8} className={`overflow-hidden rounded-xl ${className}`} {...props}>
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6 py-4 items-center justify-center"
      >
        <Text className={`text-slate-950 font-bold text-lg ${textClassName}`}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

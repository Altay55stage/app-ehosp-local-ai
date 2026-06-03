import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../../theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
  elevated?: boolean;
}

export default function GlassCard({ 
  children, 
  className = '', 
  variant = 'light',
  elevated = false,
  ...props 
}: GlassCardProps) {
  const isDark = variant === 'dark';
  
  return (
    <View
      className={`rounded-2xl p-4 overflow-hidden ${className}`}
      style={[
        {
          backgroundColor: isDark ? Colors.darkSurface : Colors.surface,
          borderWidth: 1,
          borderColor: isDark ? Colors.darkBorder : Colors.border,
        },
        elevated && Shadows.md,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

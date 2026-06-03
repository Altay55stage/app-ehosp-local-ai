import React from 'react';
import { View, ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = '', ...props }: GlassCardProps) {
  return (
    <View
      className={`bg-white/10 border border-white/20 rounded-2xl p-4 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

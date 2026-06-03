import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Skeleton presets for common patterns
export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={[{ padding: 16, backgroundColor: Colors.surface, borderRadius: 16 }, style]}>
      <Skeleton width={60} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={12} />
    </View>
  );
}

export function SkeletonAvatar({ size = 48, style }: { size?: number; style?: any }) {
  return (
    <Skeleton 
      width={size} 
      height={size} 
      borderRadius={size / 2} 
      style={style}
    />
  );
}

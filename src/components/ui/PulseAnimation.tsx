import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function PulseAnimation({ children, color = '#EF4444' }: { children?: React.ReactNode, color?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ])
    ).start();
  }, []);

  return (
    <View className="relative items-center justify-center">
      <Animated.View 
        style={[
          StyleSheet.absoluteFillObject, 
          { 
            borderRadius: 999,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          }
        ]} 
      />
      {children}
    </View>
  );
}

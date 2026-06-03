import React, { useRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, Animated, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../../theme';

interface GradientButtonProps extends TouchableOpacityProps {
  title: string;
  className?: string;
  textClassName?: string;
  colors?: readonly [string, string, ...string[]];
  loading?: boolean;
  loadingText?: string;
  icon?: string;
}

export default function GradientButton({
  title,
  className = '',
  textClassName = '',
  colors = [Colors.primary, Colors.primaryDark],
  loading = false,
  loadingText,
  icon,
  ...props
}: GradientButtonProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const isDisabled = props.disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const buttonColors = isDisabled ? ['#E2E8F0', '#E2E8F0'] : colors;
  const displayText = loading ? (loadingText || title) : title;

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }], opacity: isDisabled ? 0.6 : 1 }}>
      <TouchableOpacity
        activeOpacity={isDisabled ? 1 : 0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`overflow-hidden rounded-2xl ${isDisabled ? '' : 'shadow-lg'} ${className}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityLabel={displayText}
        {...props}
      >
        <LinearGradient
          colors={buttonColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6 py-4 items-center justify-center flex-row"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: icon ? 8 : 0 }} />
          ) : icon ? (
            <Text style={{ marginRight: 8 }}>{icon}</Text>
          ) : null}
          <Text 
            className={`font-bold text-lg tracking-wide ${isDisabled ? 'text-slate-400' : 'text-white'} ${textClassName}`}
          >
            {displayText}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows, BorderRadius } from '../../theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

const BG_COLORS: Record<ToastType, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  info: Colors.info,
};

export default function Toast({ 
  visible, 
  message, 
  type = 'info', 
  duration = 3000,
  onHide 
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => onHide?.());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        opacity,
        transform: [{ translateY }],
        zIndex: 9999,
      }}
    >
      <TouchableOpacity
        onPress={hideToast}
        activeOpacity={0.9}
        style={{
          backgroundColor: BG_COLORS[type],
          borderRadius: BorderRadius.lg,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          ...Shadows.lg,
        }}
      >
        <Ionicons name={ICONS[type] as any} size={24} color="#FFFFFF" />
        <Text
          style={[
            Typography.bodyMedium,
            { color: '#FFFFFF', marginLeft: 12, flex: 1 }
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Hook pour gérer les toasts
export function useToast() {
  const [toast, setToast] = React.useState({
    visible: false,
    message: '',
    type: 'info' as ToastType,
  });

  const show = (message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  };

  const hide = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return { toast, show, hide };
}

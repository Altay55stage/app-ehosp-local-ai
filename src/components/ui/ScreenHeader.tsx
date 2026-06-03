import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  dark?: boolean;
}

export default function ScreenHeader({ 
  title, 
  subtitle, 
  onBack, 
  rightAction,
  dark = false 
}: ScreenHeaderProps) {
  const textColor = dark ? '#FFFFFF' : Colors.textPrimary;
  const subtitleColor = dark ? '#94A3B8' : Colors.textSecondary;
  const iconColor = dark ? '#FFFFFF' : Colors.textPrimary;

  return (
    <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
      <View className="flex-row items-center flex-1">
        {onBack && (
          <TouchableOpacity 
            onPress={onBack}
            className="w-10 h-10 items-center justify-center rounded-full mr-3"
            style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : Colors.background }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text style={[Typography.h2, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[Typography.caption, { color: subtitleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {rightAction && (
        <TouchableOpacity 
          onPress={rightAction.onPress}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : Colors.background }}
          accessibilityRole="button"
          accessibilityLabel={rightAction.icon}
        >
          <Ionicons name={rightAction.icon as any} size={22} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

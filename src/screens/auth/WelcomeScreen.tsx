import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../../components/ui/GradientButton';
import { Colors, Typography, Shadows } from '../../theme';

export default function WelcomeScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <Animated.View 
        className="flex-1 justify-center items-center px-8"
        style={{ opacity: fadeAnim }}
      >
        <Animated.View 
          className="w-48 h-48 rounded-full mb-12 items-center justify-center"
          style={{ 
            backgroundColor: Colors.primaryLight,
            borderWidth: 2,
            borderColor: Colors.primary,
            transform: [{ scale: scaleAnim }],
            ...Shadows.lg,
          }}
        >
          <Ionicons name="medical" size={80} color={Colors.primary} />
        </Animated.View>
        
        <Animated.Text 
          style={[
            Typography.h1,
            { 
              color: Colors.textPrimary, 
              textAlign: 'center', 
              marginBottom: 12,
              fontSize: 48,
            }
          ]}
        >
          eHosp<Text style={{ color: Colors.primary }}>.</Text>
        </Animated.Text>
        
        <Animated.Text 
          style={[
            Typography.body,
            { 
              color: Colors.textSecondary, 
              textAlign: 'center', 
              marginBottom: 48,
              paddingHorizontal: 16,
              lineHeight: 28,
            }
          ]}
        >
          L'intelligence médicale de demain, autonome et privée sur votre iPhone.
        </Animated.Text>
        
        <Animated.View 
          className="w-full"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          <GradientButton 
            title="Se connecter" 
            onPress={() => navigation.navigate('Login')} 
            colors={[Colors.primary, Colors.primaryDark]}
            style={{ marginBottom: 12 }}
          />
          <TouchableOpacity 
            className="w-full py-4 rounded-xl items-center justify-center"
            style={{ 
              backgroundColor: Colors.background,
              borderWidth: 1.5,
              borderColor: Colors.border,
              ...Shadows.sm,
            }}
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            accessibilityLabel="Créer un compte"
          >
            <Text style={[Typography.button, { color: Colors.textPrimary }]}>
              Créer un compte
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/ui/GradientButton';

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="flex-1 justify-center items-center px-6">
        {/* Placeholder for Lottie Animation */}
        <View className="w-64 h-64 bg-primary/20 rounded-full mb-12 items-center justify-center">
          <Text className="text-4xl">👨‍⚕️</Text>
        </View>
        
        <Text className="text-4xl font-bold text-white text-center mb-4">
          eHosp
        </Text>
        <Text className="text-lg text-secondary text-center mb-12">
          L'hôpital dans ta poche.
        </Text>
        
        <View className="w-full gap-4">
          <GradientButton 
            title="Se connecter" 
            onPress={() => navigation.navigate('Login')} 
          />
          <GradientButton 
            title="Créer un compte" 
            colors={['#1E293B', '#334155']} 
            textClassName="text-white"
            onPress={() => navigation.navigate('Register')} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

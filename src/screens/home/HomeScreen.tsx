import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const profile = useSelector((state: RootState) => state.health.profile);

  const stats = [
    { label: 'Poids', value: profile.weight ? `${profile.weight} kg` : '--', icon: 'speedometer', color: '#FFFFFF' },
    { label: 'Taille', value: profile.height ? `${profile.height} cm` : '--', icon: 'resize', color: '#0EA5E9' },
    { label: 'Âge', value: profile.age ? `${profile.age} ans` : '--', icon: 'calendar', color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mt-6">
          <View>
            <Text className="text-slate-400 text-sm">Bonjour,</Text>
            <Text className="text-white text-2xl font-black">{profile.name || 'Patient'}</Text>
          </View>
          <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center border border-primary/30">
            <Ionicons name="person" size={24} color="#0EA5E9" />
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-between mt-8">
          {stats.map((stat, i) => (
            <View key={i} className="bg-white/5 border border-white/10 rounded-3xl p-4 w-[30%] items-center">
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              <Text className="text-white font-bold mt-2">{stat.value}</Text>
              <Text className="text-slate-500 text-[10px] uppercase mt-1">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* AI Doctor Banner */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Chat')}
          className="bg-primary/10 border border-primary/30 rounded-3xl p-5 mt-8 flex-row items-center"
        >
          <View style={{ width: 80, height: 80 }}>
            <LottieView
              source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_49rdyysj.json' }}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-white font-bold text-lg">Dr. IA est en ligne</Text>
            <Text className="text-slate-400 text-xs mt-1">Consultez votre assistant médical intelligent 24h/24.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0EA5E9" />
        </TouchableOpacity>

        {/* Sensors Section */}
        <Text className="text-white font-bold text-lg mt-10 mb-4">Analyses & Capteurs</Text>
        <View className="flex-row justify-between flex-wrap">
          {/* Heart Rate Sensor */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('HeartRate')}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 w-[48%] mb-4"
          >
            <View className="w-10 h-10 rounded-2xl bg-red-500/20 items-center justify-center mb-3">
              <Ionicons name="heart" size={20} color="#EF4444" />
            </View>
            <Text className="text-white font-bold">Fréquence</Text>
            <Text className="text-slate-500 text-xs mt-1">Capteur rPPG</Text>
          </TouchableOpacity>

          {/* Med Scanner */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Scanner')}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 w-[48%] mb-4"
          >
            <View className="w-10 h-10 rounded-2xl bg-secondary/20 items-center justify-center mb-3">
              <Ionicons name="scan" size={20} color="#FFFFFF" />
            </View>
            <Text className="text-white font-bold">Scanner</Text>
            <Text className="text-slate-500 text-xs mt-1">OCR Médicament</Text>
          </TouchableOpacity>

          {/* Triage Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Triage')}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 w-full mb-4 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-2xl bg-orange-500/20 items-center justify-center mr-4">
              <Ionicons name="medical" size={20} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">Triage d'Urgence</Text>
              <Text className="text-slate-500 text-xs">Évaluation rapide des symptômes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#475569" />
          </TouchableOpacity>
        </View>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

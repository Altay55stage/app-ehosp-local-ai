import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../../components/ui/Skeleton';
import { Colors, Typography, Shadows, BorderRadius } from '../../theme';

export default function HomeScreen({ navigation }: any) {
  const profile = useSelector((state: RootState) => state.health.profile);
  const { subscriptionStatus } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '--';
    try {
      const [day, month, year] = birthDate.split('/').map(Number);
      const birth = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} ans`;
    } catch {
      return '--';
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = [
    { label: 'Poids', value: profile.weight ? `${profile.weight} kg` : '--', icon: 'speedometer', color: Colors.primary, bg: Colors.primaryLight },
    { label: 'Taille', value: profile.height ? `${profile.height} cm` : '--', icon: 'resize', color: Colors.info, bg: '#E0F2FE' },
    { label: 'Âge', value: calculateAge(profile.birthDate), icon: 'calendar', color: Colors.warning, bg: '#FEF3C7' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView 
        className="flex-1 px-6" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mt-6">
          <View>
            <Text style={[Typography.caption, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Tableau de bord
            </Text>
            <Text style={[Typography.h1, { marginTop: 4 }]}>
              {profile.name || 'Patient'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')} 
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Mon profil"
          >
            <Ionicons name="person" size={24} color={Colors.info} />
          </TouchableOpacity>
        </View>
        
        {/* Premium Banner */}
        {process.env.EXPO_PUBLIC_ALL_FREE !== 'true' && subscriptionStatus === 'free' && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Subscription')}
            className="rounded-3xl p-5 mt-8 flex-row items-center"
            style={{ backgroundColor: Colors.dark, ...Shadows.lg }}
            accessibilityRole="button"
            accessibilityLabel="Passer au premium"
          >
            <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Ionicons name="star" size={24} color="#38BDF8" />
            </View>
            <View className="flex-1">
              <Text style={[Typography.button, { color: Colors.textInverse, fontSize: 14 }]}>
                PASSEZ AU PREMIUM
              </Text>
              <Text style={[Typography.caption, { color: '#94A3B8', marginTop: 4 }]}>
                Débloquez toutes les fonctions IA en illimité.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#38BDF8" />
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View className="flex-row justify-between mt-8">
          {stats.map((stat, i) => (
            <View 
              key={i} 
              className="rounded-3xl p-4 items-center flex-1 mx-1"
              style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm }}
            >
              <View className="w-10 h-10 rounded-full items-center justify-center mb-3" style={{ backgroundColor: stat.bg }}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={[Typography.h3, { fontSize: 18 }]}>{stat.value}</Text>
              <Text style={[Typography.caption, { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* AI Doctor Banner */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Chat')}
          className="rounded-3xl p-6 mt-8 flex-row items-center"
          style={{ backgroundColor: Colors.primary, ...Shadows.primary }}
          accessibilityRole="button"
          accessibilityLabel="Dr. IA Local"
        >
          <View className="w-[70px] h-[70px] rounded-2xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="chatbubbles" size={32} color="#FFFFFF" />
          </View>
          <View className="ml-5 flex-1">
            <Text style={[Typography.h2, { color: Colors.textInverse, fontSize: 24 }]}>Dr. IA Local</Text>
            <Text style={[Typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>
              Sécurisé & Hors-ligne sur votre iPhone.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Sensors Section */}
        <Text style={[Typography.h3, { marginTop: 40, marginBottom: 16, marginLeft: 4 }]}>
          Analyses & Capteurs
        </Text>
        <View className="flex-row justify-between flex-wrap">
          {/* Heart Rate Sensor */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('HeartRate')}
            className="rounded-3xl p-5 mb-4 flex-1 mx-1"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Fréquence cardiaque"
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: '#FEE2E2' }}>
              <Ionicons name="heart" size={24} color={Colors.error} />
            </View>
            <Text style={[Typography.bodyMedium]}>Fréquence</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>Capteur optique</Text>
          </TouchableOpacity>

          {/* Med Scanner */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Scanner')}
            className="rounded-3xl p-5 mb-4 flex-1 mx-1"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Scanner ordonnance"
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: Colors.primaryLight }}>
              <Ionicons name="scan" size={24} color={Colors.primary} />
            </View>
            <Text style={[Typography.bodyMedium]}>Scanner</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>Analyse d'ordonnance</Text>
          </TouchableOpacity>

          {/* Nutrition IA */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Nutrition')}
            className="rounded-3xl p-5 mb-4 flex-row items-center mx-1"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Nutrition IA"
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: Colors.primaryLight }}>
              <Ionicons name="restaurant" size={24} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <Text style={[Typography.bodyMedium]}>Nutrition IA</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>Analyse de repas par photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Triage Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Triage')}
            className="rounded-3xl p-5 mb-4 flex-row items-center mx-1"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Triage d'urgence"
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: '#FEF3C7' }}>
              <Ionicons name="medical" size={24} color={Colors.warning} />
            </View>
            <View className="flex-1">
              <Text style={[Typography.bodyMedium]}>Triage d'Urgence</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>Évaluation des symptômes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  { id: 1, title: "Intelligence Locale", description: "eHosp 5.0 tourne à 100% sur la puce neuronale de votre iPhone. Aucune donnée ne quitte votre appareil.", icon: "hardware-chip" },
  { id: 2, title: "Scanner Médical", description: "Prenez en photo vos ordonnances ou prises de sang. L'IA extrait et analyse chaque chiffre.", icon: "scan-circle" },
  { id: 3, title: "Triage d'Urgence", description: "Le système évalue l'urgence (Score 1 à 10) et alerte un médecin si nécessaire.", icon: "warning" },
  { id: 4, title: "Espace Pro Sécurisé", description: "Les médecins accèdent à une salle d'attente virtuelle triée par gravité.", icon: "medical" },
];

export default function GuideScreen({ navigation }: any) {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }}
            accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.h3]}>Guide Utilisateur</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScroll={(e) => setActiveSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={16} style={{ flex: 1, marginTop: 40 }}>
          {SLIDES.map((slide) => (
            <View key={slide.id} style={{ width, alignItems: 'center', paddingHorizontal: 40 }}>
              <View style={{ width: 160, height: 160, backgroundColor: Colors.primaryLight, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 40, borderWidth: 1, borderColor: Colors.primary + '40', ...Shadows.sm }}>
                <Ionicons name={slide.icon as any} size={70} color={Colors.primary} />
              </View>
              <Text style={[Typography.h1, { textAlign: 'center', marginBottom: 16 }]}>{slide.title}</Text>
              <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', lineHeight: 26 }]}>{slide.description}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          {SLIDES.map((_, index) => (
            <View key={index} style={{ height: 8, borderRadius: 999, marginHorizontal: 4, width: activeSlide === index ? 32 : 8, backgroundColor: activeSlide === index ? Colors.primary : Colors.border }} />
          ))}
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 40, marginTop: 40 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', ...Shadows.primary }}
            accessibilityRole="button" accessibilityLabel="J'ai compris">
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>J'ai compris</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

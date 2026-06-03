import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  Animated, Linking, Alert, Vibration, Platform, Dimensions
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Typography, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

const BODY_ZONES = [
  { id: 'tete', label: 'Tête', emoji: '🧠', specialists: ['Psychiatrie', 'Ophtalmologie', 'ORL'] },
  { id: 'cou', label: 'Cou', emoji: '👂', specialists: ['ORL', 'Dentaire'] },
  { id: 'thorax', label: 'Poitrine', emoji: '🫀', specialists: ['Cardiologie', 'Pneumologie'] },
  { id: 'ventre', label: 'Ventre', emoji: '⚕️', specialists: ['Oncologie', 'Endocrinologie'] },
  { id: 'dos', label: 'Dos', emoji: '🦴', specialists: ['Rhumatologie'] },
  { id: 'bras', label: 'Bras', emoji: '💪', specialists: ['Rhumatologie', 'Cardiologie'] },
  { id: 'peau', label: 'Peau', emoji: '🧴', specialists: ['Dermatologie', 'Oncologie'] },
  { id: 'jambes', label: 'Jambes', emoji: '🦵', specialists: ['Rhumatologie', 'Hématologie'] },
];

const URGENCY_COLORS = ['#10B981', '#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444', '#DC2626', '#B91C1C', '#7F1D1D', '#450A0A'];
const PAIN_FACES = ['😊', '🙂', '😐', '😕', '😟', '😣', '😖', '😫', '😭', '🤯'];

const EMERGENCY_NUMBERS: Record<string, string> = {
  'France': '15', 'Belgique': '112', 'Suisse': '144',
  'Canada': '911', 'États-Unis': '911', 'Royaume-Uni': '999',
  'Allemagne': '112', 'Espagne': '112', 'Maroc': '15',
};

type TriageStep = 'zones' | 'pain' | 'duration' | 'result';

export default function TriageScreen({ navigation }: any) {
  const profile = useSelector((state: RootState) => state.health.profile);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [duration, setDuration] = useState('');
  const [urgencyScore, setUrgencyScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [currentStep, setCurrentStep] = useState<TriageStep>('zones');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  const emergencyNumber = EMERGENCY_NUMBERS[profile.currentCountry || 'France'] || '112';

  useEffect(() => {
    if (urgencyScore >= 8) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
      return () => pulse.stop();
    }
  }, [urgencyScore]);

  const toggleZone = (zoneId: string) => {
    setSelectedZones(prev =>
      prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]
    );
  };

  const calculateUrgency = () => {
    let score = 0;
    score += Math.floor(painLevel / 2);
    const hasCardiac = selectedZones.includes('thorax') || selectedZones.includes('bras');
    const hasNeuro = selectedZones.includes('tete');
    if (hasCardiac) score += 3;
    if (hasNeuro) score += 2;
    if (selectedZones.length > 2) score += 1;
    if (duration === 'sudden') score += 2;
    else if (duration === 'hours') score += 1;
    
    const finalScore = Math.min(10, score);
    setUrgencyScore(finalScore);
    setShowResult(true);
    setCurrentStep('result');
    
    Animated.timing(scoreAnim, {
      toValue: finalScore / 10,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const findNearbyHospitals = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez la localisation pour trouver les hôpitaux proches.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      
      const query = `[out:json][timeout:10];(
        node["amenity"="hospital"](around:10000,${latitude},${longitude});
        way["amenity"="hospital"](around:10000,${latitude},${longitude});
        node["amenity"="clinic"](around:10000,${latitude},${longitude});
        way["amenity"="clinic"](around:10000,${latitude},${longitude});
      );out center 10;`;
      
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      const hospitals = data.elements
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (!lat || !lon) return null;
          const dist = getDistance(latitude, longitude, lat, lon);
          return {
            id: el.id,
            type: el.tags?.amenity === 'clinic' ? 'Clinique' : 'Hôpital',
            name: el.tags?.name || el.tags?.['name:fr'] || (el.tags?.amenity === 'clinic' ? 'Clinique' : 'Hôpital'),
            address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' ') || 'Adresse non disponible',
            phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
            lat, lon, distance: dist,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 8);
      
      setNearbyHospitals(hospitals);
    } catch {
      Alert.alert('Erreur', 'Impossible de récupérer les hôpitaux proches.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  };

  const callEmergency = () => {
    Alert.alert(
      `Appeler le ${emergencyNumber}`,
      `Vous allez appeler le SAMU / Urgences (${emergencyNumber}). Confirmez-vous ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: `Appeler le ${emergencyNumber}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${emergencyNumber}`) },
      ]
    );
  };

  const openInMaps = (lat: number, lon: number, name: string) => {
    if (!lat || !lon) return;
    const encodedName = encodeURIComponent(name);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${encodedName}&ll=${lat},${lon}&dirflg=d`
      : `geo:${lat},${lon}?q=${lat},${lon}(${encodedName})`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`);
    });
  };

  const urgencyColor = URGENCY_COLORS[urgencyScore] || Colors.primary;
  const urgencyLabel = urgencyScore <= 3 ? 'Pouvez attendre' : urgencyScore <= 6 ? 'Consulter dans les 24h' : urgencyScore <= 8 ? 'Urgences maintenant' : 'APPELEZ LE SAMU';

  const reset = () => {
    setSelectedZones([]);
    setPainLevel(0);
    setDuration('');
    setUrgencyScore(0);
    setShowResult(false);
    setNearbyHospitals([]);
    setCurrentStep('zones');
    scoreAnim.setValue(0);
  };

  const getStepProgress = () => {
    if (showResult) return 1;
    if (currentStep === 'zones') return selectedZones.length > 0 ? 0.33 : 0;
    if (currentStep === 'pain') return 0.66;
    return 0;
  };

  const StepIndicator = () => (
    <View className="flex-row justify-center mb-4 px-6">
      {['zones', 'pain', 'duration'].map((step, index) => (
        <View key={step} className="flex-1 mx-1">
          <View className="h-1.5 rounded-full" style={{ backgroundColor: index <= ['zones', 'pain', 'duration'].indexOf(currentStep) ? Colors.primary : Colors.border }} />
        </View>
      ))}
    </View>
  );

  if (showResult) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View className="px-6 pt-4 pb-2 flex-row items-center">
          <TouchableOpacity 
            onPress={reset}
            className="w-10 h-10 items-center justify-center rounded-full mr-3"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Recommencer"
          >
            <Ionicons name="refresh" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: Colors.textPrimary }]}>Résultat du Triage</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="items-center my-8">
            <Animated.View
              style={{
                transform: urgencyScore >= 8 ? [{ scale: pulseAnim }] : [],
                backgroundColor: urgencyColor + '15',
                width: 160, height: 160, borderRadius: 80,
                borderWidth: 4, borderColor: urgencyColor,
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Text style={{ fontSize: 52, fontWeight: 'bold', color: urgencyColor }}>{urgencyScore}</Text>
              <Text style={{ color: urgencyColor, fontSize: 12 }}>/ 10</Text>
            </Animated.View>
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginTop: 16, textAlign: 'center' }]}>
              {urgencyLabel}
            </Text>
          </View>

          {urgencyScore >= 7 && (
            <TouchableOpacity
              onPress={callEmergency}
              className="rounded-2xl p-5 items-center mb-6"
              style={{ backgroundColor: Colors.error, ...Shadows.primary }}
              accessibilityRole="button"
              accessibilityLabel={`Appeler le ${emergencyNumber}`}
            >
              <Text style={[Typography.button, { color: '#FFFFFF', fontSize: 20 }]}>
                Appeler le {emergencyNumber}
              </Text>
              <Text style={[Typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>
                SAMU / Urgences
              </Text>
            </TouchableOpacity>
          )}

          <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}>
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginBottom: 12 }]}>Hôpitaux Proches</Text>
            {nearbyHospitals.length === 0 ? (
              <TouchableOpacity
                onPress={findNearbyHospitals}
                disabled={loadingLocation}
                className="rounded-xl p-4 items-center"
                style={{ backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary }}
              >
                <Text style={[Typography.bodyMedium, { color: Colors.primary }]}>
                  {loadingLocation ? 'Localisation...' : 'Trouver les hôpitaux autour de moi'}
                </Text>
              </TouchableOpacity>
            ) : (
              nearbyHospitals.map((h, i) => (
                <View key={`${h.id}-${i}`} className="rounded-xl p-3 mb-2" style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background }}>
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text style={[Typography.bodyMedium, { color: Colors.textPrimary }]} numberOfLines={1}>{h.name}</Text>
                      <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>{h.address}</Text>
                      <Text style={[Typography.caption, { color: Colors.success, marginTop: 4 }]}>📍 {h.distance} km</Text>
                    </View>
                    <View className="flex-row" style={{ gap: 6 }}>
                      <TouchableOpacity onPress={() => openInMaps(h.lat, h.lon, h.name)} className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: Colors.primaryLight }}>
                        <Text style={[Typography.caption, { color: Colors.primary, fontWeight: '700' }]}>GPS</Text>
                      </TouchableOpacity>
                      {h.phone && (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${h.phone}`)} className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: Colors.primaryLight }}>
                          <Text style={[Typography.caption, { color: Colors.success, fontWeight: '700' }]}>Appel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}>
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginBottom: 12 }]}>Spécialistes Recommandés</Text>
            {[...new Set(selectedZones.flatMap(z => BODY_ZONES.find(b => b.id === z)?.specialists || []))].map(spec => (
              <View key={spec} className="rounded-lg p-3 mb-2" style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }}>
                <Text style={[Typography.body, { color: Colors.textPrimary }]}>{spec}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={reset} className="rounded-2xl p-4 items-center" style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.sm }}>
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Recommencer le triage</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with back button */}
        <View className="px-6 pt-4 pb-2 flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center rounded-full mr-3"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text style={[Typography.h2, { color: Colors.textPrimary }]}>Triage IA</Text>
            <Text style={[Typography.caption, { marginTop: 2 }]}>Évaluation d'urgence par intelligence artificielle</Text>
          </View>
        </View>

        <StepIndicator />

        {/* Zones */}
        {currentStep === 'zones' && (
          <View className="px-6 mt-4">
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginBottom: 12 }]}>Où avez-vous mal ?</Text>
            <View className="flex-row flex-wrap">
              {BODY_ZONES.map(zone => {
                const isSelected = selectedZones.includes(zone.id);
                return (
                  <TouchableOpacity
                    key={zone.id}
                    onPress={() => toggleZone(zone.id)}
                    className="m-1 px-4 py-3 rounded-2xl flex-row items-center"
                    style={{
                      borderWidth: 1.5,
                      borderColor: isSelected ? Colors.error : Colors.border,
                      backgroundColor: isSelected ? Colors.error + '10' : Colors.surface,
                      ...Shadows.sm,
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={zone.label}
                  >
                    <Text style={{ fontSize: 20 }}>{zone.emoji}</Text>
                    <Text style={[Typography.bodyMedium, { color: isSelected ? Colors.error : Colors.textSecondary, marginLeft: 8 }]}>
                      {zone.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedZones.length > 0 && (
              <TouchableOpacity 
                onPress={() => setCurrentStep('pain')}
                className="rounded-2xl p-4 items-center mt-6"
                style={{ backgroundColor: Colors.primary, ...Shadows.primary }}
                accessibilityRole="button"
                accessibilityLabel="Continuer"
              >
                <Text style={[Typography.button, { color: '#FFFFFF' }]}>Continuer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pain Level */}
        {currentStep === 'pain' && (
          <View className="px-6 mt-4">
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginBottom: 12 }]}>Niveau de douleur : {painLevel}/10</Text>
            <Text style={{ fontSize: 48, textAlign: 'center', marginVertical: 12 }}>{PAIN_FACES[painLevel]}</Text>
            <View className="flex-row justify-between mt-2">
              {Array.from({ length: 11 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPainLevel(i)}
                  style={{
                    width: (width - 60) / 11 - 2,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: i <= painLevel ? URGENCY_COLORS[i] || Colors.error : Colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Douleur ${i}`}
                >
                  <Text style={{ color: i <= painLevel ? '#FFFFFF' : Colors.textSecondary, fontSize: 10, fontWeight: 'bold' }}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row mt-6" style={{ gap: 12 }}>
              <TouchableOpacity 
                onPress={() => setCurrentStep('zones')}
                className="flex-1 rounded-2xl p-4 items-center"
                style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.sm }}
              >
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setCurrentStep('duration')}
                className="flex-1 rounded-2xl p-4 items-center"
                style={{ backgroundColor: Colors.primary, ...Shadows.primary }}
              >
                <Text style={[Typography.button, { color: '#FFFFFF' }]}>Continuer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Duration */}
        {currentStep === 'duration' && (
          <View className="px-6 mt-4">
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginBottom: 16 }]}>Depuis quand ?</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {[
                { key: 'sudden', label: 'Soudain (< 1h)', icon: '⚡' },
                { key: 'hours', label: 'Quelques heures', icon: '🕐' },
                { key: 'days', label: 'Plusieurs jours', icon: '📅' },
                { key: 'weeks', label: 'Des semaines', icon: '📆' },
              ].map(d => (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDuration(d.key)}
                  className="w-[48%] rounded-2xl p-4 items-center"
                  style={{
                    borderWidth: 1.5,
                    borderColor: duration === d.key ? Colors.primary : Colors.border,
                    backgroundColor: duration === d.key ? Colors.primaryLight : Colors.surface,
                    ...Shadows.sm,
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: duration === d.key }}
                >
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>{d.icon}</Text>
                  <Text style={[Typography.bodyMedium, { color: duration === d.key ? Colors.primary : Colors.textSecondary, textAlign: 'center' }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row mt-6" style={{ gap: 12 }}>
              <TouchableOpacity 
                onPress={() => setCurrentStep('pain')}
                className="flex-1 rounded-2xl p-4 items-center"
                style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.sm }}
              >
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={calculateUrgency}
                disabled={!duration}
                className="flex-1 rounded-2xl p-4 items-center"
                style={{ backgroundColor: duration ? Colors.error : Colors.border, ...Shadows.primary }}
                accessibilityRole="button"
                accessibilityLabel="Évaluer l'urgence"
              >
                <Text style={[Typography.button, { color: '#FFFFFF', opacity: duration ? 1 : 0.5 }]}>
                  Évaluer l'urgence
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Emergency button always visible */}
        <View className="px-6 mt-6">
          <TouchableOpacity 
            onPress={callEmergency} 
            className="rounded-2xl p-4 items-center"
            style={{ borderWidth: 1, borderColor: Colors.error, backgroundColor: Colors.surface, ...Shadows.sm }}
            accessibilityRole="button"
            accessibilityLabel={`Appeler directement le ${emergencyNumber}`}
          >
            <Text style={[Typography.bodyMedium, { color: Colors.error, fontWeight: '700' }]}>
              Appeler directement le {emergencyNumber}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

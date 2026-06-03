import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  Animated, Linking, Alert, Vibration, Platform, Dimensions
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Zones du corps cliquables
const BODY_ZONES = [
  { id: 'tete', label: 'Tête / Crane', emoji: '🧠', y: 0.05, x: 0.5, specialists: ['🧠 Psychiatrie', '👁️ Ophtalmologie', '👂 ORL'] },
  { id: 'cou', label: 'Cou / Gorge', emoji: '👂', y: 0.13, x: 0.5, specialists: ['👂 ORL', '🦷 Dentaire'] },
  { id: 'thorax', label: 'Poitrine / Coeur', emoji: '🫀', y: 0.22, x: 0.5, specialists: ['🫀 Cardiologie', '🩺 Pneumologie'] },
  { id: 'ventre', label: 'Ventre / Abdomen', emoji: '⚕️', y: 0.35, x: 0.5, specialists: ['⚕️ Oncologie', '🧪 Endocrinologie'] },
  { id: 'dos', label: 'Dos / Colonne', emoji: '🦴', y: 0.30, x: 0.75, specialists: ['🦴 Rhumatologie'] },
  { id: 'bras', label: 'Bras / Épaule', emoji: '💪', y: 0.28, x: 0.2, specialists: ['🦴 Rhumatologie', '🫀 Cardiologie'] },
  { id: 'peau', label: 'Peau / Tout le corps', emoji: '🧴', y: 0.20, x: 0.85, specialists: ['🧴 Dermatologie', '⚕️ Oncologie'] },
  { id: 'jambes', label: 'Jambes / Genoux', emoji: '🦵', y: 0.55, x: 0.4, specialists: ['🦴 Rhumatologie', '🩸 Hématologie'] },
];

const URGENCY_COLORS = ['#FFFFFF', '#E5E7EB', '#D1D5DB', '#EAB308', '#F97316', '#EF4444', '#DC2626', '#B91C1C', '#7F1D1D', '#450A0A'];

const PAIN_FACES = ['😊', '🙂', '😐', '😕', '😟', '😣', '😖', '😫', '😭', '🤯'];

// Numéros d'urgence selon pays
const EMERGENCY_NUMBERS: Record<string, string> = {
  'France': '15', 'Belgique': '112', 'Suisse': '144',
  'Canada': '911', 'États-Unis': '911', 'Royaume-Uni': '999',
  'Allemagne': '112', 'Espagne': '112', 'Maroc': '15',
};

export default function TriageScreen() {
  const profile = useSelector((state: RootState) => state.health.profile);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [duration, setDuration] = useState('');
  const [urgencyScore, setUrgencyScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
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
    // Douleur contribue 0-5 points
    score += Math.floor(painLevel / 2);
    // Zones à risque
    const hasCardiac = selectedZones.includes('thorax') || selectedZones.includes('bras');
    const hasNeuro = selectedZones.includes('tete');
    if (hasCardiac) score += 3;
    if (hasNeuro) score += 2;
    if (selectedZones.length > 2) score += 1;
    // Durée
    if (duration === 'sudden') score += 2;
    else if (duration === 'hours') score += 1;
    
    const finalScore = Math.min(10, score);
    setUrgencyScore(finalScore);
    setShowResult(true);
    
    // Animer le score
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
      
      // "out center" est crucial pour obtenir les coordonnées des éléments de type "way" (bâtiments)
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
          // Pour les nodes: lat/lon direct. Pour les ways: utiliser center
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          
          // Ignorer les éléments sans coordonnées valides
          if (!lat || !lon) return null;
          
          const dist = getDistance(latitude, longitude, lat, lon);
          return {
            id: el.id,
            type: el.tags?.amenity === 'clinic' ? 'Clinique' : 'Hôpital',
            name: el.tags?.name || el.tags?.['name:fr'] || (el.tags?.amenity === 'clinic' ? 'Clinique' : 'Hôpital / Urgences'),
            address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' ') || 'Adresse non disponible',
            phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
            lat,
            lon,
            distance: dist,
          };
        })
        .filter(Boolean) // Retirer les éléments null
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 8); // Garder les 8 plus proches
      
      if (hospitals.length === 0) {
        Alert.alert('Aucun résultat', 'Aucun hôpital trouvé dans un rayon de 10 km. Vérifiez votre localisation.');
      }
      setNearbyHospitals(hospitals);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de récupérer les hôpitaux proches. Vérifiez votre connexion.');
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
      `🚨 Appeler le ${emergencyNumber}`,
      `Vous allez appeler le SAMU / Urgences (${emergencyNumber}). Confirmez-vous ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: `Appeler le ${emergencyNumber}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${emergencyNumber}`) },
      ]
    );
  };

  const openInMaps = (lat: number, lon: number, name: string) => {
    if (!lat || !lon) {
      Alert.alert('Erreur', 'Coordonnées GPS non disponibles pour cet établissement.');
      return;
    }
    // Apple Maps sur iOS — format propre avec coordonnées explicites
    const encodedName = encodeURIComponent(name);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${encodedName}&ll=${lat},${lon}&dirflg=d`
      : `geo:${lat},${lon}?q=${lat},${lon}(${encodedName})`;
    
    Linking.openURL(url).catch(() => {
      // Fallback Google Maps web
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${encodedName}`);
    });
  };

  const urgencyColor = URGENCY_COLORS[urgencyScore] || '#FFFFFF';
  const urgencyLabel = urgencyScore <= 3 ? 'Pouvez attendre' : urgencyScore <= 6 ? 'Consulter dans les 24h' : urgencyScore <= 8 ? '🚨 Urgences maintenant' : '🚨 APPELEZ LE SAMU IMMÉDIATEMENT';

  const reset = () => {
    setSelectedZones([]);
    setPainLevel(0);
    setDuration('');
    setUrgencyScore(0);
    setShowResult(false);
    setNearbyHospitals([]);
    scoreAnim.setValue(0);
  };

  if (showResult) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Score d'urgence */}
          <View className="items-center my-8">
            <Animated.View
              style={{
                transform: urgencyScore >= 8 ? [{ scale: pulseAnim }] : [],
                backgroundColor: urgencyColor + '33',
                width: 160, height: 160, borderRadius: 80,
                borderWidth: 4, borderColor: urgencyColor,
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Text style={{ fontSize: 52, fontWeight: 'bold', color: urgencyColor }}>{urgencyScore}</Text>
              <Text style={{ color: urgencyColor, fontSize: 12 }}>/ 10</Text>
            </Animated.View>
            <Text className="text-white text-xl font-bold mt-4 text-center">{urgencyLabel}</Text>
          </View>

          {/* Bouton SOS si urgence critique */}
          {urgencyScore >= 7 && (
            <TouchableOpacity
              onPress={callEmergency}
              className="bg-red-600 rounded-2xl p-5 items-center mb-6 border-2 border-red-400"
            >
              <Text className="text-white text-2xl font-black">📞 Appeler le {emergencyNumber}</Text>
              <Text className="text-red-200 text-sm mt-1">SAMU / Urgences — Appui immédiat</Text>
            </TouchableOpacity>
          )}

          {/* Hôpitaux proches */}
          <View className="bg-white/10 rounded-2xl p-4 mb-4">
            <Text className="text-white font-bold text-lg mb-3">🏥 Hôpitaux Proches</Text>
            {nearbyHospitals.length === 0 ? (
              <TouchableOpacity
                onPress={findNearbyHospitals}
                disabled={loadingLocation}
                className="bg-primary/30 border border-primary rounded-xl p-4 items-center"
              >
                <Text className="text-primary font-bold">{loadingLocation ? '📡 Localisation...' : '📍 Trouver les hôpitaux autour de moi'}</Text>
              </TouchableOpacity>
            ) : (
            nearbyHospitals.map((h, i) => (
                <View key={`${h.id}-${i}`} className="border border-white/10 rounded-xl p-3 mb-2">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center gap-x-2 mb-1">
                        <Text className="text-white font-semibold" numberOfLines={1}>{h.name}</Text>
                        <View className="bg-white/10 rounded px-1.5 py-0.5">
                          <Text className="text-slate-400 text-xs">{h.type}</Text>
                        </View>
                      </View>
                      <Text className="text-slate-400 text-xs">{h.address}</Text>
                      <Text className="text-white text-xs font-bold mt-1">📍 {h.distance} km</Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity onPress={() => openInMaps(h.lat, h.lon, h.name)} className="bg-primary/30 px-3 py-1.5 rounded-lg">
                        <Text className="text-primary text-xs font-bold">🗺 GPS</Text>
                      </TouchableOpacity>
                      {h.phone && (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${h.phone}`)} className="bg-white/10 px-3 py-1.5 rounded-lg">
                          <Text className="text-white text-xs font-bold">📞 Appel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Recommandation spécialiste */}
          <View className="bg-white/10 rounded-2xl p-4 mb-4">
            <Text className="text-white font-bold text-base mb-2">🩺 Spécialistes Recommandés</Text>
            {[...new Set(selectedZones.flatMap(z => BODY_ZONES.find(b => b.id === z)?.specialists || []))].map(spec => (
              <View key={spec} className="flex-row items-center bg-white/5 rounded-lg p-2 mb-1">
                <Text className="text-white text-sm">{spec}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={reset} className="border border-white/20 rounded-2xl p-4 items-center">
            <Text className="text-slate-300 font-bold">↩ Recommencer le triage</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-3xl font-black text-white">🚨 Triage IA</Text>
          <Text className="text-slate-400 text-sm mt-1">Sélectionnez vos symptômes pour une évaluation d'urgence</Text>
        </View>

        {/* Corps humain — Zone de sélection */}
        <View className="px-4 mt-4">
          <Text className="text-white font-bold mb-3">📍 Où avez-vous mal ?</Text>
          <View className="flex-row flex-wrap">
            {BODY_ZONES.map(zone => {
              const isSelected = selectedZones.includes(zone.id);
              return (
                <TouchableOpacity
                  key={zone.id}
                  onPress={() => toggleZone(zone.id)}
                  className={`m-1 px-3 py-3 rounded-2xl border flex-row items-center ${isSelected ? 'border-red-500 bg-red-500/20' : 'border-white/20 bg-white/5'}`}
                >
                  <Text style={{ fontSize: 20 }}>{zone.emoji}</Text>
                  <Text className={`ml-2 text-sm font-semibold ${isSelected ? 'text-red-300' : 'text-slate-300'}`}>{zone.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Slider douleur */}
        <View className="px-4 mt-6">
          <Text className="text-white font-bold mb-2">😣 Niveau de douleur : {painLevel}/10</Text>
          <Text className="text-5xl text-center my-2">{PAIN_FACES[painLevel]}</Text>
          <View className="flex-row justify-between mt-2">
            {Array.from({ length: 11 }, (_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setPainLevel(i)}
                style={{
                  width: (width - 40) / 11 - 2,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: i <= painLevel ? URGENCY_COLORS[i] || '#EF4444' : '#262626',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Durée */}
        <View className="px-4 mt-6">
          <Text className="text-white font-bold mb-3">⏱️ Depuis quand ?</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { key: 'sudden', label: '⚡ Soudain (< 1h)' },
              { key: 'hours', label: '🕐 Quelques heures' },
              { key: 'days', label: '📅 Plusieurs jours' },
              { key: 'weeks', label: '📆 Depuis des semaines' },
            ].map(d => (
              <TouchableOpacity
                key={d.key}
                onPress={() => setDuration(d.key)}
                className={`px-4 py-2 rounded-xl border ${duration === d.key ? 'border-primary bg-primary/20' : 'border-white/20 bg-white/5'}`}
              >
                <Text className={`text-sm font-semibold ${duration === d.key ? 'text-primary' : 'text-slate-300'}`}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bouton Évaluer */}
        <View className="px-4 mt-8">
          <TouchableOpacity
            onPress={calculateUrgency}
            disabled={selectedZones.length === 0 || !duration}
            className={`rounded-2xl p-5 items-center ${selectedZones.length > 0 && duration ? 'bg-red-600' : 'bg-white/10'}`}
          >
            <Text className="text-white font-black text-xl">
              {selectedZones.length === 0 ? 'Sélectionnez une zone' : !duration ? 'Indiquez la durée' : '🩺 Évaluer l\'urgence'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bouton SOS direct toujours visible */}
        <View className="px-4 mt-4">
          <TouchableOpacity onPress={callEmergency} className="border border-red-500/50 rounded-2xl p-4 items-center">
            <Text className="text-red-400 font-bold">🚨 Appeler directement le {emergencyNumber}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

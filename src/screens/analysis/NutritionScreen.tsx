import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AzureAIService } from '../../services/AzureAIService';
import { Colors, Typography, Shadows } from '../../theme';

export default function NutritionScreen({ navigation }: any) {
  const cameraRef = useRef<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      setPhoto(photoData.uri);
      analyzeMeal(photoData.base64);
    }
  };

  const analyzeMeal = async (base64: string) => {
    setLoading(true);
    const prompt = `Analysez cette photo de repas. Estimez calories, macronutriments (P/G/L) et donnez un conseil santé.
    Répondez en JSON : {"meal": "Nom", "calories": 0, "macros": {"p": 0, "g": 0, "l": 0}, "advice": "..."}`;
    try {
      const response = await AzureAIService.sendMessage([{ role: 'user', content: { text: prompt, imageBase64: base64 } }], "Tu es un nutritionniste expert.");
      setAnalysis(JSON.parse(response));
    } catch { Alert.alert("Erreur", "Analyse impossible."); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: '#FFFFFF' }]}>Nutrition IA</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {!photo ? (
          <View style={{ height: 400, width: '100%', backgroundColor: '#000' }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} />
            <TouchableOpacity onPress={takePicture}
              style={{ position: 'absolute', bottom: 32, alignSelf: 'center', backgroundColor: Colors.primary, width: 80, height: 80, borderRadius: 999, borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button" accessibilityLabel="Prendre une photo">
              <Ionicons name="camera" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Image source={{ uri: photo }} style={{ height: 300, width: '100%' }} resizeMode="cover" />
            <TouchableOpacity onPress={() => { setPhoto(null); setAnalysis(null); }}
              style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 999 }}
              accessibilityRole="button" accessibilityLabel="Reprendre">
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ padding: 24 }}>
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator color={Colors.info} size="large" />
              <Text style={[Typography.caption, { marginTop: 16, color: '#94A3B8' }]}>Analyse nutritionnelle en cours...</Text>
            </View>
          )}

          {analysis && (
            <>
              <View style={{ backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '30', borderRadius: 24, padding: 24, marginBottom: 24 }}>
                <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase' }]}>Plat détecté</Text>
                <Text style={[Typography.h1, { color: '#FFFFFF', marginTop: 4 }]}>{analysis.meal}</Text>
                <View style={{ flexDirection: 'row', marginTop: 24, justifyContent: 'space-between' }}>
                  {[{ val: analysis.calories, label: 'KCAL' }, { val: `${analysis.macros.p}g`, label: 'PROT' }, { val: `${analysis.macros.g}g`, label: 'GLUC' }, { val: `${analysis.macros.l}g`, label: 'LIPID' }].map((item) => (
                    <View key={item.label} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>{item.val}</Text>
                      <Text style={[Typography.caption, { color: '#94A3B8', fontSize: 10 }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="bulb" size={20} color={Colors.warning} />
                  <Text style={[Typography.bodyMedium, { color: '#FFFFFF', marginLeft: 8 }]}>Conseil Diététique</Text>
                </View>
                <Text style={{ color: '#CBD5E1', lineHeight: 24 }}>{analysis.advice}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

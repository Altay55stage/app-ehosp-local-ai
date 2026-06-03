import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setGeneticAnalysisResult } from '../../store/slices/familySlice';
import GradientButton from '../../components/ui/GradientButton';
import { MistralAIService } from '../../services/MistralAIService';
import { db, ref, get, child } from '../../services/FirebaseService';

interface ProfileData {
  id: string;
  name: string;
  color: string;
  medicalRecord?: any;
}

export default function FamilyScreen() {
  const dispatch = useDispatch();
  const geneticResult = useSelector((state: RootState) => state.family.geneticAnalysisResult);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    loadFamilyProfiles();
  }, []);

  const loadFamilyProfiles = async () => {
    if (!user) return;
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles`));
      
      const loaded: ProfileData[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
          loaded.push(childSnap.val() as ProfileData);
        });
      }
      setProfiles(loaded);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneticAnalysis = async () => {
    if (profiles.length === 0) return;

    setAnalysisLoading(true);
    try {
      const familyData = profiles.map(p => {
        const med = p.medicalRecord || {};
        return `- ${p.name} (${med.age || 'Âge inconnu'} ans): Antécédents: ${med.chronicConditions || 'Aucun'}. Allergies: ${med.allergies || 'Aucune'}.`;
      }).join('\n');
      
      const systemPrompt = "Tu es Dr. IA Généticien. Analyse les données familiales fournies par l'utilisateur. Ton objectif est de détecter les probabilités de maladies héréditaires (diabète, cancers, maladies cardiaques, etc.) pour le patient. Sois scientifique, humain, extrêmement concis et liste les risques principaux. Donne des recommandations de prévention.";
      const prompt = `Voici l'historique médical de ma famille :\n${familyData}\n\nQuels sont mes risques héréditaires potentiels ?`;

      const response = await MistralAIService.sendMessage([{ role: 'user', content: prompt }], systemPrompt);
      dispatch(setGeneticAnalysisResult(response));
    } catch (e) {
      Alert.alert("Erreur", "L'analyse génétique a échoué.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-dark">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <ScrollView className="flex-1 px-4">
        <View className="py-6 border-b border-white/10 mb-6">
          <Text className="text-3xl font-bold text-white mb-2">Ma Famille</Text>
          <Text className="text-slate-400">Vos profils créés sur l'écran "Qui consulte ?" apparaissent ici avec leurs dossiers médicaux.</Text>
        </View>

        {/* Liste des membres */}
        {profiles.length > 0 ? (
          profiles.map(p => (
            <View key={p.id} className="bg-white/10 p-4 rounded-xl mb-3 border border-white/5 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <View style={{ backgroundColor: p.color }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-bold">{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">{p.name}</Text>
                  {p.medicalRecord?.chronicConditions && (
                    <Text className="text-slate-400 text-xs mt-1">⚠️ {p.medicalRecord.chronicConditions}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-slate-500 italic mb-4">Aucun profil détecté.</Text>
        )}

        {/* Analyse Génétique */}
        <View className="mt-6 mb-12 border-t border-white/10 pt-6">
          <Text className="text-xl font-bold text-white mb-2">🧬 Analyse Génétique IA</Text>
          <Text className="text-slate-400 text-sm mb-4">L'IA Généticienne croise les antécédents de vos profils pour prédire les risques héréditaires.</Text>
          
          <GradientButton title={analysisLoading ? "Analyse en cours..." : "Lancer l'Analyse d'ADN Familial"} onPress={handleGeneticAnalysis} disabled={analysisLoading} />
          
          {analysisLoading && <ActivityIndicator size="large" color="#FFFFFF" className="mt-4" />}

          {geneticResult && !analysisLoading && (
            <View className="mt-6 p-4 bg-primary/20 rounded-xl border border-primary">
              <Text className="text-white leading-6">{geneticResult}</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

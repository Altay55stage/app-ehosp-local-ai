import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setGeneticAnalysisResult } from '../../store/slices/familySlice';
import GradientButton from '../../components/ui/GradientButton';
import { AzureAIService } from '../../services/AzureAIService';
import { db, ref, get, child } from '../../services/FirebaseService';
import { Colors, Typography, Shadows } from '../../theme';

interface ProfileData { id: string; name: string; color: string; medicalRecord?: any; }

export default function FamilyScreen() {
  const dispatch = useDispatch();
  const geneticResult = useSelector((state: RootState) => state.family.geneticAnalysisResult);
  const { user } = useSelector((state: RootState) => state.auth);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => { loadFamilyProfiles(); }, []);

  const loadFamilyProfiles = async () => {
    if (!user) return;
    try {
      const snapshot = await get(child(ref(db), `users/${user.uid}/profiles`));
      const loaded: ProfileData[] = [];
      if (snapshot.exists()) snapshot.forEach((childSnap) => { loaded.push(childSnap.val() as ProfileData); });
      setProfiles(loaded);
    } catch {} finally { setLoading(false); }
  };

  const handleGeneticAnalysis = async () => {
    if (profiles.length === 0) return;
    setAnalysisLoading(true);
    try {
      const familyData = profiles.map(p => {
        const med = p.medicalRecord || {};
        return `- ${p.name} (${med.age || '?'} ans): Antécédents: ${med.chronicConditions || 'Aucun'}. Allergies: ${med.allergies || 'Aucune'}.`;
      }).join('\n');
      const systemPrompt = "Tu es Dr. IA Généticien. Analyse les données familiales. Détecte les probabilités de maladies héréditaires. Sois scientifique et concis.";
      const prompt = `Voici l'historique médical de ma famille :\n${familyData}\n\nQuels sont mes risques héréditaires potentiels ?`;
      const response = await AzureAIService.sendMessage([{ role: 'user', content: prompt }], systemPrompt);
      dispatch(setGeneticAnalysisResult(response));
    } catch { Alert.alert("Erreur", "L'analyse génétique a échoué."); } finally { setAnalysisLoading(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginBottom: 24, marginTop: 16 }}>
          <Text style={[Typography.h1]}>Ma Famille</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: 8 }]}>
            Vos profils créés sur l'écran "Qui consulte ?" apparaissent ici.
          </Text>
        </View>

        {profiles.length > 0 ? profiles.map((p) => (
          <View key={p.id} style={{ backgroundColor: Colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadows.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: p.color, width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, ...Shadows.sm }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={[Typography.bodyMedium]}>{p.name}</Text>
                <Text style={[Typography.caption, { marginTop: 2 }]}>
                  {p.medicalRecord?.chronicConditions ? `⚠️ ${p.medicalRecord.chronicConditions}` : 'Aucun antécédent'}
                </Text>
              </View>
            </View>
          </View>
        )) : (
          <Text style={[Typography.body, { color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginBottom: 16 }]}>Aucun profil détecté.</Text>
        )}

        <View style={{ marginTop: 24, marginBottom: 48, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 24 }}>
          <Text style={[Typography.h3, { marginBottom: 8 }]}>🧬 Analyse Génétique IA</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary, marginBottom: 24, lineHeight: 20 }]}>
            L'IA croise les antécédents de vos profils pour prédire les risques héréditaires.
          </Text>
          <GradientButton title={analysisLoading ? "Analyse en cours..." : "Lancer l'Analyse d'ADN Familial"} onPress={handleGeneticAnalysis} disabled={analysisLoading} loading={analysisLoading} />
          {analysisLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />}
          {geneticResult && !analysisLoading && (
            <View style={{ marginTop: 24, padding: 20, backgroundColor: Colors.primaryLight, borderRadius: 24, borderWidth: 1, borderColor: Colors.primary + '20' }}>
              <Text style={[Typography.body, { color: Colors.textPrimary, lineHeight: 24 }]}>{geneticResult}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

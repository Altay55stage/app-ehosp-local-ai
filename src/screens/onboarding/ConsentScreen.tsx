import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { db, ref, set } from '../../services/FirebaseService';
import { setHasAcceptedConsent } from '../../store/slices/authSlice';
import GradientButton from '../../components/ui/GradientButton';
import LottieView from 'lottie-react-native';

export default function ConsentScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedDataPolicy, setAcceptedDataPolicy] = useState(false);
  const [acceptedMedicalDisclaimer, setAcceptedMedicalDisclaimer] = useState(false);
  const [hasOpenedPdf, setHasOpenedPdf] = useState(false);

  const canContinue = acceptedDataPolicy && acceptedMedicalDisclaimer && hasOpenedPdf && !isSubmitting;

  const saveConsent = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await set(ref(db, `users/${user.uid}/onboarding/consent`), {
        accepted: true,
        acceptedAt: Date.now(),
        version: 'v2_blockchain',
      });
      dispatch(setHasAcceptedConsent(true));
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder votre consentement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="items-center mt-6">
          <View style={{ width: 120, height: 120 }}>
            <LottieView
              source={{ uri: 'https://assets3.lottiefiles.com/packages/lf20_m6cu96ze.json' }} // Security Shield
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <Text className="text-white text-3xl font-black mt-4 text-center">Confidentialité</Text>
          <Text className="text-slate-400 text-center mt-2 px-4">
            Votre santé est privée. eHosp utilise des technologies de pointe pour la protéger.
          </Text>
        </View>

        {/* Section Blockchain */}
        <View className="bg-primary/10 border border-primary/30 rounded-3xl p-5 mt-8 mb-6">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-2">⛓️</Text>
            <Text className="text-primary font-bold text-lg">Preuve Blockchain</Text>
          </View>
          <Text className="text-slate-300 text-sm leading-6">
            Votre consentement et l'intégrité de vos dossiers médicaux sont ancrés sur la blockchain **Polygon**. 
            Cela garantit qu'aucune donnée ne peut être modifiée à votre insu, créant un audit inviolable de votre historique de santé.
          </Text>
        </View>

        <View className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-8">
          <Text className="text-white font-bold mb-3 text-lg">Engagement RGPD</Text>
          <Text className="text-slate-400 text-sm leading-6">
            Conformément au RGPD, vos données sont chiffrées de bout en bout. Vous gardez le contrôle total : 
            droit d'accès, de rectification et de suppression immédiate.
          </Text>
        </View>

        <TouchableOpacity
          className={`rounded-2xl border p-5 mb-4 flex-row items-center ${acceptedDataPolicy ? 'border-secondary bg-secondary/10' : 'border-white/10 bg-white/5'}`}
          onPress={() => setAcceptedDataPolicy(!acceptedDataPolicy)}
        >
          <View className={`w-6 h-6 rounded-md border items-center justify-center mr-4 ${acceptedDataPolicy ? 'bg-secondary border-secondary' : 'border-white/30'}`}>
            {acceptedDataPolicy && <Text className="text-dark font-bold">✓</Text>}
          </View>
          <Text className="text-white font-semibold flex-1">J'accepte le traitement de mes données de santé.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`rounded-2xl border p-5 mb-4 flex-row items-center ${acceptedMedicalDisclaimer ? 'border-secondary bg-secondary/10' : 'border-white/10 bg-white/5'}`}
          onPress={() => setAcceptedMedicalDisclaimer(!acceptedMedicalDisclaimer)}
        >
          <View className={`w-6 h-6 rounded-md border items-center justify-center mr-4 ${acceptedMedicalDisclaimer ? 'bg-secondary border-secondary' : 'border-white/30'}`}>
            {acceptedMedicalDisclaimer && <Text className="text-dark font-bold">✓</Text>}
          </View>
          <Text className="text-white font-semibold flex-1">Je comprends que l'IA ne remplace pas un médecin.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`rounded-2xl border p-5 mb-8 flex-row items-center ${hasOpenedPdf ? 'border-secondary bg-secondary/10' : 'border-white/10 bg-white/5'}`}
          onPress={() => {
            navigation.navigate('CGU');
            setHasOpenedPdf(true);
          }}
        >
          <View className={`w-6 h-6 rounded-md border items-center justify-center mr-4 ${hasOpenedPdf ? 'bg-secondary border-secondary' : 'border-white/30'}`}>
            {hasOpenedPdf && <Text className="text-dark font-bold">✓</Text>}
          </View>
          <Text className="text-white font-semibold flex-1">Lire les Conditions Générales (CGU)</Text>
        </TouchableOpacity>

        <GradientButton
          title={isSubmitting ? 'Validation...' : 'Accepter et Continuer'}
          onPress={saveConsent}
          disabled={!canContinue}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


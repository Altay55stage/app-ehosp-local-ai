import React, { useState, useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { db, ref, set } from '../../services/FirebaseService';
import { setHasAcceptedConsent } from '../../store/slices/authSlice';
import GradientButton from '../../components/ui/GradientButton';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../theme';

export default function ConsentScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedDataPolicy, setAcceptedDataPolicy] = useState(false);
  const [acceptedMedicalDisclaimer, setAcceptedMedicalDisclaimer] = useState(false);
  const [hasOpenedPdf, setHasOpenedPdf] = useState(false);

  const canContinue = acceptedDataPolicy && acceptedMedicalDisclaimer && hasOpenedPdf && !isSubmitting;

  const saveConsent = useCallback(async () => {
    if (!user || !canContinue) return;
    setIsSubmitting(true);
    try {
      await set(ref(db, `users/${user.uid}/onboarding/consent`), { accepted: true, acceptedAt: Date.now(), version: 'v2_blockchain' });
    } catch {}
    try {
      await AsyncStorage.setItem(`@consent_${user.uid}`, 'true');
    } catch {}
    setIsSubmitting(false);
    dispatch(setHasAcceptedConsent(true));
    if (navigation?.replace) {
      navigation.replace('Biometric');
    }
  }, [user, canContinue, dispatch, navigation]);

  const CheckBox = ({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: React.ReactNode }) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={{ borderRadius: 16, borderWidth: 1.5, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
        borderColor: checked ? Colors.primary : Colors.border, backgroundColor: checked ? Colors.primaryLight : Colors.surface }}>
      <View style={{ marginRight: 16 }}>
        <Ionicons name={checked ? "checkmark-circle" : "ellipse-outline"} size={28} color={checked ? Colors.primary : Colors.border} />
      </View>
      <Text style={[Typography.bodyMedium, { color: checked ? Colors.primary : Colors.textSecondary, flex: 1, lineHeight: 22 }]}>{children}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View style={{ width: 140, height: 140 }}>
            <LottieView source={{ uri: 'https://assets3.lottiefiles.com/packages/lf20_m6cu96ze.json' }} autoPlay loop style={{ width: '100%', height: '100%' }} />
          </View>
          <Text style={[Typography.h1, { marginTop: 16, textAlign: 'center', color: '#FFFFFF' }]}>Confidentialité</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 16, lineHeight: 26 }]}>
            Votre santé est privée. eHosp utilise des technologies de pointe pour la protéger.
          </Text>
        </View>
 
        <View style={{ backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '40', borderRadius: 24, padding: 20, marginTop: 32, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="link-outline" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={[Typography.h3, { color: Colors.primary }]}>Preuve Blockchain</Text>
          </View>
          <Text style={[Typography.caption, { color: Colors.textSecondary, lineHeight: 22 }]}>
            Votre consentement et vos dossiers médicaux sont ancrés sur la blockchain Polygon. Audit inviolable garanti.
          </Text>
        </View>
 
        <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, padding: 20, marginBottom: 32 }}>
          <Text style={[Typography.h3, { marginBottom: 8 }]}>Engagement RGPD</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary, lineHeight: 22 }]}>
            Vos données sont chiffrées de bout en bout. Droit d'accès, de rectification et de suppression.
          </Text>
        </View>

        <CheckBox checked={acceptedDataPolicy} onPress={() => setAcceptedDataPolicy(!acceptedDataPolicy)}>
          J'accepte le traitement sécurisé de mes données de santé.
        </CheckBox>

        <CheckBox checked={acceptedMedicalDisclaimer} onPress={() => setAcceptedMedicalDisclaimer(!acceptedMedicalDisclaimer)}>
          Je comprends que l'assistant IA ne remplace pas un médecin.
        </CheckBox>

        <CheckBox checked={hasOpenedPdf} onPress={() => setHasOpenedPdf(!hasOpenedPdf)}>
          J'ai lu et j'accepte les Conditions Générales (CGU).
        </CheckBox>

        <TouchableOpacity onPress={() => Linking.openURL('https://firebasestorage.googleapis.com/v0/b/ehosp-prod-a2b84.appspot.com/o/cgu-ehosp.pdf?alt=media')} style={{ marginBottom: 32 }}>
          <Text style={[Typography.bodyMedium, { color: Colors.primary, textDecorationLine: 'underline' }]}>
            Lire les CGU complètes (PDF)
          </Text>
        </TouchableOpacity>

        <GradientButton title={isSubmitting ? 'Validation...' : 'Accepter et Continuer'} onPress={saveConsent} disabled={!canContinue} loading={isSubmitting} />
      </ScrollView>
    </SafeAreaView>
  );
}

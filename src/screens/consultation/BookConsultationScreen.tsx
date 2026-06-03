import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useStripe } from '@stripe/stripe-react-native';
import { consultationService } from '../../services/ConsultationService';
import GradientButton from '../../components/ui/GradientButton';
import { Colors, Typography, Shadows } from '../../theme';

const SPECIALTIES = [
  { id: 'généraliste', label: 'Généraliste', icon: '👨‍⚕️', color: '#40916C' },
  { id: 'cardiologie', label: 'Cardiologie', icon: '🫀', color: '#EF4444' },
  { id: 'dermatologie', label: 'Dermatologie', icon: '🧴', color: '#F59E0B' },
  { id: 'pédiatrie', label: 'Pédiatrie', icon: '👶', color: '#3B82F6' },
  { id: 'psychiatrie', label: 'Psychiatrie', icon: '🧠', color: '#8B5CF6' },
  { id: 'rhumatologie', label: 'Rhumatologie', icon: '🦴', color: '#EC4899' },
];

type Step = 'choose' | 'paying' | 'waiting' | 'accepted' | 'error';

export default function BookConsultationScreen({ navigation, route }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.health);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [step, setStep] = useState<Step>('choose');
  const [selectedSpecialty, setSelectedSpecialty] = useState('généraliste');
  const [symptoms, setSymptoms] = useState(route?.params?.symptoms || '');
  const [urgencyScore] = useState(route?.params?.urgencyScore || 3);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (step === 'waiting') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])).start();
      timerRef.current = setInterval(() => { setTimeLeft((prev) => { if (prev <= 1) { clearInterval(timerRef.current!); setStep('error'); return 0; } return prev - 1; }); }, 1000);
    }
    return () => { pulseAnim.stopAnimation(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handlePayAndBook = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const intentRes = await fetch(`${backendUrl}/api/stripe/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 1499, currency: 'eur', patientId: user.uid }) });
      if (!intentRes.ok) throw new Error('Impossible de créer le paiement');
      const { clientSecret } = await intentRes.json();
      const { error: initError } = await initPaymentSheet({ merchantDisplayName: 'eHosp', paymentIntentClientSecret: clientSecret, applePay: { merchantCountryCode: 'FR' }, googlePay: { merchantCountryCode: 'FR', testEnv: true, currencyCode: 'eur' }, defaultBillingDetails: { name: profile?.name || 'Patient eHosp' } });
      if (initError) throw new Error(initError.message);
      setLoading(false); setStep('paying');
      const { error: payError } = await presentPaymentSheet();
      if (payError) { if (payError.code === 'Canceled') { setStep('choose'); return; } throw new Error(payError.message); }
      setLoading(true);
      const consultation = await consultationService.createConsultation(user.uid, selectedSpecialty, symptoms, urgencyScore);
      setConsultationId(consultation.id); setStep('waiting'); setLoading(false);
    } catch (err: any) { setLoading(false); setStep('error'); Alert.alert('Erreur', err.message || 'Erreur'); }
  };

  const handleCancel = () => {
    Alert.alert('Annuler ?', 'Remboursement sous 3-5 jours.', [
      { text: "Continuer d'attendre", style: 'cancel' },
      { text: 'Annuler', style: 'destructive', onPress: () => { if (consultationId) consultationService.cancelConsultation(consultationId, 'Patient cancelled'); navigation.goBack(); } },
    ]);
  };

  if (step === 'choose') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 32 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[Typography.h2, { color: Colors.textPrimary }]}>Consulter un Médecin</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Réponse garantie en 15 minutes</Text>
          </View>
        </View>

        <View style={{ backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '40', borderRadius: 24, padding: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ backgroundColor: Colors.primaryLight, width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <Ionicons name="card" size={24} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.textPrimary }}>€14,99</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Consultation + Ordonnance incluse</Text>
          </View>
          <View style={{ backgroundColor: Colors.success + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={[Typography.caption, { color: Colors.success, fontWeight: '700' }]}>IA Gratuite ✓</Text>
          </View>
        </View>

        {urgencyScore >= 7 && (
          <View style={{ backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <Text style={[Typography.bodyMedium, { color: Colors.error, marginLeft: 8, fontWeight: '700' }]}>Urgence élevée ({urgencyScore}/10) — Priorité max</Text>
          </View>
        )}

        <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, marginBottom: 16 }]}>Choisir la spécialité</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          {SPECIALTIES.map((spec) => (
            <TouchableOpacity key={spec.id} onPress={() => setSelectedSpecialty(spec.id)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5,
                borderColor: selectedSpecialty === spec.id ? Colors.primary : Colors.border,
                backgroundColor: selectedSpecialty === spec.id ? Colors.primaryLight : Colors.surface,
                ...Shadows.sm }}
              accessibilityRole="radio" accessibilityState={{ selected: selectedSpecialty === spec.id }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>{spec.icon}</Text>
              <Text style={[Typography.bodyMedium, { color: selectedSpecialty === spec.id ? Colors.primary : Colors.textSecondary }]}>{spec.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: Colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 32, ...Shadows.sm }}>
          <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, marginBottom: 12 }]}>Ce qui est inclus :</Text>
          {['Consultation vidéo avec un médecin vérifié', 'Ordonnance numérique signée (PDF)', 'Partage sécurisé du dossier médical', 'Support 15 min après consultation'].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={[Typography.caption, { color: Colors.textSecondary, marginLeft: 8, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>

        <GradientButton title={loading ? 'Préparation...' : 'Payer €14,99 et Consulter'} onPress={handlePayAndBook} disabled={loading} loading={loading} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );

  if (step === 'waiting') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={{ width: 160, height: 160, backgroundColor: Colors.primaryLight, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: Colors.primary + '20', marginBottom: 32 }}>
            <Text style={{ fontSize: 64 }}>👨‍⚕️</Text>
          </View>
        </Animated.View>
        <Text style={[Typography.h1, { color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>Recherche en cours...</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 }]}>
          Un médecin {selectedSpecialty} va accepter
        </Text>
        <View style={{ backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '40', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 20, marginBottom: 32, alignItems: 'center' }}>
          <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase', marginBottom: 4, fontWeight: '700' }]}>Temps restant</Text>
          <Text style={{ fontSize: 48, fontWeight: '900', color: Colors.textPrimary }}>{formatTime(timeLeft)}</Text>
        </View>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 32, ...Shadows.sm }}>
          <Text style={[Typography.caption, { color: Colors.textSecondary, textAlign: 'center' }]}>
            Si aucun médecin ne répond dans 15 min, remboursement automatique.
          </Text>
        </View>
        <TouchableOpacity onPress={handleCancel} style={{ borderWidth: 1, borderColor: Colors.error, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.surface, ...Shadows.sm }}
          accessibilityRole="button" accessibilityLabel="Annuler la consultation">
          <Text style={[Typography.bodyMedium, { color: Colors.error, fontWeight: '700' }]}>Annuler la consultation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (step === 'error') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 96, height: 96, borderRadius: 999, backgroundColor: Colors.error + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: Colors.error + '40' }}>
          <Ionicons name="time-outline" size={48} color={Colors.error} />
        </View>
        <Text style={[Typography.h2, { color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 }]}>Aucun médecin disponible</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 }]}>
          Tous nos médecins sont occupés. Remboursement sous 3-5 jours.
        </Text>
        <GradientButton title="Retour" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );

  return null;
}

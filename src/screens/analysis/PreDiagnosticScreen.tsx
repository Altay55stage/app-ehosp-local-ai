import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import GradientButton from '../../components/ui/GradientButton';
import Toast, { useToast } from '../../components/ui/Toast';
import axios from 'axios';
import { patientService } from '../../services/PatientService';
import { consultationService } from '../../services/ConsultationService';
import { Colors, Typography, Shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const LANGUAGES = [
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
];

export default function PreDiagnosticScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<'fr'|'en'|'es'>('fr');
  const [loading, setLoading] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const handleGenerate = async () => {
    if (!user) return showToast('Vous devez être connecté.', 'error');
    if (!text.trim()) return showToast('Décrivez vos symptômes en détail.', 'warning');

    setLoading(true);
    try {
      const res = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/generate-prediagnostic`, {
        consultationId: `pred_${user.uid}_${Date.now()}`,
        text,
        language,
        patientName: user.email || 'Patient',
      });

      const { pdfBase64 } = res.data;
      const consultationId = `consultation_${user.uid}_${Date.now()}`;
      const fileUrl = await patientService.uploadPreDiagnosticPDF(user.uid, consultationId, pdfBase64, language);

      await consultationService.createConsultation(user.uid, 'general', text, 2);
      await consultationService.getConsultation(consultationId);

      await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/notifications/admin`, {
        subject: `Prédiagnostic généré - ${user.email}`,
        data: { user: user.uid, consultationId, fileUrl },
      });

      showToast('Prédiagnostic généré avec succès !', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      console.error('generate error', err);
      showToast('Impossible de générer le prédiagnostic.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
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
              <Text style={[Typography.h2, { color: Colors.textPrimary }]}>Prédiagnostic</Text>
              <Text style={[Typography.caption, { marginTop: 2 }]}>Analyse IA de vos symptômes</Text>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: 16 }]}>
              Décrivez vos symptômes en détail. Le prédiagnostic sera généré par Dr. IA et ajouté à votre dossier.
            </Text>

            <View 
              className="rounded-2xl p-4 mb-6"
              style={{ 
                backgroundColor: Colors.surface,
                borderWidth: 1.5,
                borderColor: Colors.border,
                ...Shadows.sm,
              }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={8}
                style={{ 
                  minHeight: 160, 
                  color: Colors.textPrimary, 
                  fontSize: 16,
                  lineHeight: 24,
                }}
                placeholder="Ex: J'ai mal à la tête depuis 3 jours, avec nausées..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 12 }]}>
              Langue du rapport
            </Text>
            <View className="flex-row mb-6" style={{ gap: 12 }}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                   key={lang.code}
                   onPress={() => setLanguage(lang.code)}
                   className="flex-1 rounded-2xl py-3 items-center"
                   style={{
                     borderWidth: 1.5,
                     borderColor: language === lang.code ? Colors.primary : Colors.border,
                     backgroundColor: language === lang.code ? Colors.primaryLight : Colors.surface,
                     ...Shadows.sm,
                   }}
                   accessibilityRole="radio"
                   accessibilityState={{ selected: language === lang.code }}
                   accessibilityLabel={lang.label}
                >
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>{lang.flag}</Text>
                  <Text style={[
                    Typography.bodyMedium, 
                    { color: language === lang.code ? Colors.primary : Colors.textSecondary }
                  ]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <GradientButton 
              title="Générer le Prédiagnostic" 
              loading={loading}
              loadingText="Génération en cours..."
              onPress={handleGenerate} 
              disabled={!text.trim()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { Alert, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import GradientButton from '../../components/ui/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import { patientService, PatientService } from '../../services/PatientService';
import { setUserSSN } from '../../store/slices/authSlice';
import { Colors, Typography, Shadows } from '../../theme';

interface SecurityNumberScreenProps {
  onComplete: (ssn: string) => void;
}

export default function SecurityNumberScreen({ onComplete }: SecurityNumberScreenProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [ssn, setSsn] = useState('');
  const [country, setCountry] = useState('france');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!ssn.trim()) { setError('Veuillez entrer votre numéro de sécurité sociale'); return; }
    if (!PatientService.validateSecurityNumber(ssn, country)) { setError('Format invalide'); return; }
    setLoading(true);
    try {
      if (user) { await patientService.updatePatientProfile(user.uid, { socialSecurityNumber: ssn }); dispatch(setUserSSN(ssn)); }
      onComplete(ssn);
    } catch { setError('Erreur lors de la sauvegarde'); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'space-between' }}>
            <View>
              <Text style={[Typography.h1, { marginBottom: 8 }]}>Numéro de Sécurité Sociale</Text>
              <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                Nécessaire pour les ordonnances et vérifications légales
              </Text>
            </View>

            <View style={{ gap: 24 }}>
              <View>
                <Text style={[Typography.label, { marginBottom: 12 }]}>Pays</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['france', 'spain', 'other'].map((c) => (
                    <TouchableOpacity key={c} onPress={() => { setCountry(c); setSsn(''); setError(''); }}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, alignItems: 'center',
                        borderColor: country === c ? Colors.primary : Colors.border,
                        backgroundColor: country === c ? Colors.primary : Colors.surface }}>
                      <Text style={[Typography.bodyMedium, { color: country === c ? '#FFFFFF' : Colors.textSecondary, textAlign: 'center' }]}>
                        {c === 'france' ? '🇫🇷 France' : c === 'spain' ? '🇪🇸 Espagne' : '🌍 Autre'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={[Typography.label, { marginBottom: 12 }]}>
                  {country === 'france' ? 'Numéro NIR (15 chiffres)' : country === 'spain' ? 'NIE/NIF' : 'Numéro de Sécurité Sociale'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16 }}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
                  <TextInput
                    placeholder={country === 'france' ? '1 23 45 67 890 123 45' : 'Entrez votre numéro'}
                    placeholderTextColor={Colors.textMuted}
                    value={ssn} onChangeText={(t) => { setSsn(t); setError(''); }}
                    maxLength={country === 'france' ? 15 : 20}
                    style={{ flex: 1, paddingVertical: 16, marginLeft: 12, color: Colors.textPrimary, fontSize: 16, fontWeight: '600' }}
                  />
                </View>
                <Text style={[Typography.caption, { marginTop: 8 }]}>
                  {country === 'france' ? 'Format: 1 chiffre + année + mois + commune + ordre + clé' : 'Au moins 8 caractères'}
                </Text>
              </View>

              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
                  <Text style={[Typography.bodyMedium, { color: Colors.error, flex: 1 }]}>{error}</Text>
                </View>
              ) : null}

              <View style={{ backgroundColor: Colors.primaryLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.primary + '40' }}>
                <Text style={[Typography.caption, { color: Colors.primary, lineHeight: 20 }]}>
                  Votre numéro est chiffré et stocké de manière sécurisée. Seuls les médecins vérifiés y accèdent.
                </Text>
              </View>
            </View>

            <View>
              <GradientButton title={loading ? 'Vérification...' : 'Continuer'} onPress={handleContinue} disabled={!ssn.trim() || loading} />
              <Text style={[Typography.caption, { textAlign: 'center', marginTop: 16 }]}>
                Vous pouvez modifier cela plus tard dans les paramètres.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

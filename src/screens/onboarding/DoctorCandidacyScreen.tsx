import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setUserStatus, setUserRole } from '../../store/slices/authSlice';
import { firestore, auth, storage, doc, setDoc, onSnapshot } from '../../services/FirebaseService';

import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../../components/ui/GradientButton';
import { Colors, Typography, Shadows } from '../../theme';

export default function DoctorCandidacyScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [status, setLocalStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(user?.status || 'none');

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(firestore, 'doctors', user.uid), (d) => {
      if (d.exists()) { const data = d.data(); if (data.status) { setLocalStatus(data.status); dispatch(setUserStatus(data.status)); } }
    });
    return () => unsub();
  }, [user]);

  const handleBackToPatient = () => dispatch(setUserRole('patient'));

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) { setDocUri(result.assets[0].uri); setDocName(result.assets[0].name); }
    } catch { Alert.alert('Erreur', 'Impossible de sélectionner le document.'); }
  };

  const handleSubmit = async () => {
    if (!user || !docUri || !specialization || !experience) { Alert.alert("Champs manquants", "Remplissez toutes les informations."); return; }
    setLoading(true);
    try {
      const response = await fetch(docUri);
      const blob = await response.blob();
      const fileRef = sRef(storage, `doctors/${user.uid}/license.pdf`);
      await uploadBytes(fileRef, blob);
      const downloadUrl = await getDownloadURL(fileRef);
      await setDoc(doc(firestore, 'doctors', user.uid), { uid: user.uid, email: user.email, licenseUrl: downloadUrl, specialization, experience, bio, status: 'pending', submittedAt: Date.now() }, { merge: true });
      dispatch(setUserStatus('pending'));
      setLocalStatus('pending');
    } catch { Alert.alert("Erreur", "Une erreur est survenue."); } finally { setLoading(false); }
  };

  if (status === 'pending') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 96, height: 96, backgroundColor: '#FEF3C7', borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Ionicons name="time" size={48} color={Colors.warning} />
          </View>
          <Text style={[Typography.h2, { textAlign: 'center', marginBottom: 12 }]}>Candidature en cours</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 }]}>
            Votre licence est en cours de révision. Vous recevrez une notification après validation.
          </Text>
          <TouchableOpacity onPress={handleBackToPatient} style={{ marginTop: 48, backgroundColor: Colors.surface, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}
            accessibilityRole="button" accessibilityLabel="Retour au portail patient">
            <Text style={[Typography.bodyMedium]}>Retour au Portail Patient</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={[Typography.h1]}>Devenir Docteur</Text>
          <TouchableOpacity onPress={handleBackToPatient} style={{ backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}
            accessibilityRole="button" accessibilityLabel="Retour">
            <Text style={[Typography.caption]}>Retour</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, padding: 24, marginBottom: 24, ...Shadows.sm }}>
          <Text style={[Typography.h3, { marginBottom: 16 }]}>Informations Professionnelles</Text>
          <TextInput placeholder="Spécialité (ex: Cardiologie)" placeholderTextColor={Colors.textMuted} value={specialization} onChangeText={setSpecialization}
            style={{ backgroundColor: Colors.background, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 16 }} />
          <TextInput placeholder="Années d'expérience" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={experience} onChangeText={setExperience}
            style={{ backgroundColor: Colors.background, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 16 }} />
          <TextInput placeholder="Biographie / Parcours (Optionnel)" placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} value={bio} onChangeText={setBio}
            style={{ backgroundColor: Colors.background, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: 16, fontWeight: '600', height: 96 }} />
        </View>

        <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, padding: 24, marginBottom: 32, ...Shadows.sm }}>
          <Text style={[Typography.h3, { marginBottom: 16 }]}>Diplôme / Licence (PDF)</Text>
          {docName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '40', padding: 16, borderRadius: 16 }}>
              <Ionicons name="document-text" size={24} color={Colors.primary} />
              <Text style={[Typography.bodyMedium, { marginLeft: 12, flex: 1 }]} numberOfLines={1}>{docName}</Text>
              <TouchableOpacity onPress={() => { setDocUri(null); setDocName(null); }}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickDocument} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, borderRadius: 16, padding: 32, alignItems: 'center' }}
              accessibilityRole="button" accessibilityLabel="Choisir votre diplôme">
              <Ionicons name="cloud-upload-outline" size={40} color={Colors.primary} />
              <Text style={[Typography.bodyMedium, { marginTop: 8 }]}>Choisir votre diplôme (PDF)</Text>
            </TouchableOpacity>
          )}
        </View>

        <GradientButton title={loading ? "Envoi en cours..." : "Soumettre ma candidature"} onPress={handleSubmit} disabled={loading || !docUri || !specialization} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

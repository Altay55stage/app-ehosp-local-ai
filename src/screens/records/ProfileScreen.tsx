import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateProfile, clearProfile } from '../../store/slices/healthSlice';
import { setActiveProfileId, setUserRole, setUserSSN } from '../../store/slices/authSlice';
import Input from '../../components/ui/Input';
import SelectInput from '../../components/ui/SelectInput';
import GradientButton from '../../components/ui/GradientButton';
import { db, ref, get, set, child, firestore, doc, setDoc } from '../../services/FirebaseService';

import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

const genders = ["Homme", "Femme", "Autre"];
const countries = ["France", "Belgique", "Suisse", "Canada", "Maroc", "Algérie", "Tunisie", "Sénégal", "Côte d'Ivoire", "Cameroun", "Brésil", "États-Unis", "Royaume-Uni", "Allemagne", "Espagne", "Italie", "Portugal", "Autre"];

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.health.profile);
  const { user, activeProfileId, hasCompletedQuestionnaire } = useSelector((state: RootState) => state.auth);

  useEffect(() => { loadMedicalRecord(); }, [activeProfileId]);

  const loadMedicalRecord = async () => {
    if (!user || !activeProfileId) return;
    dispatch(clearProfile());
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord`));
      if (snapshot.exists()) { Object.keys(snapshot.val()).forEach(key => { dispatch(updateProfile({ [key]: snapshot.val()[key] })); }); }
      const profileSnap = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}`));
      if (profileSnap.exists()) dispatch(updateProfile({ name: profileSnap.val().name || '' }));
    } catch {}
  };

  const handleChange = (field: string, value: string) => dispatch(updateProfile({ [field]: value }));

  const handleSave = async () => {
    if (!user || !activeProfileId) return;
    try {
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord`), {
        birthDate: profile.birthDate || '', gender: profile.gender || '', weight: profile.weight || '', height: profile.height || '',
        chronicConditions: profile.chronicConditions || '', allergies: profile.allergies || '', medications: profile.medications || '',
        birthCountry: profile.birthCountry || '', currentCountry: profile.currentCountry || ''
      });
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/name`), profile.name || '');
      await setDoc(doc(firestore, 'patients', user.uid), { socialSecurityNumber: user.socialSecurityNumber || '' }, { merge: true });
      Alert.alert("Succès", "Dossier sauvegardé.");
    } catch { Alert.alert("Erreur", "Impossible de sauvegarder."); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[Typography.h1, { color: Colors.textPrimary }]}>Mon Dossier</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 4 }]}>Informations liées à votre profil actuel.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => { dispatch(setUserRole(null as any)); dispatch(setActiveProfileId(null)); }}
              style={{ backgroundColor: Colors.warning + '15', borderWidth: 1, borderColor: Colors.warning + '30', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
              accessibilityRole="button" accessibilityLabel="Changer de portail">
              <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.warning }}>Portail</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch(setActiveProfileId(null))}
              style={{ backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}
              accessibilityRole="button" accessibilityLabel="Changer de profil">
              <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textPrimary }}>Profil</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, marginBottom: 24, ...Shadows.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[Typography.caption, { color: Colors.textSecondary, textTransform: 'uppercase' }]}>Statut Santé</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textPrimary }]}>Questionnaire de santé</Text>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: hasCompletedQuestionnaire ? Colors.success + '15' : Colors.warning + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: hasCompletedQuestionnaire ? Colors.success : Colors.warning }}>
                {hasCompletedQuestionnaire ? 'Complété' : 'À faire'}
              </Text>
            </View>
          </View>
          {!hasCompletedQuestionnaire && (
            <TouchableOpacity onPress={() => navigation.navigate('HealthQuestionnaire')}
              style={{ marginTop: 12, backgroundColor: Colors.warning + '15', borderWidth: 1, borderColor: Colors.warning + '30', padding: 8, borderRadius: 12, alignItems: 'center' }}
              accessibilityRole="button" accessibilityLabel="Remplir le questionnaire">
              <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.warning }}>Remplir le questionnaire</Text>
            </TouchableOpacity>
          )}
        </View>

        <Input label="Nom" placeholder="Ex: Jean" value={profile.name} onChangeText={(val) => handleChange('name', val)} />
        <Input label="Date de Naissance" placeholder="Ex: 01/01/1990" value={profile.birthDate} onChangeText={(val) => handleChange('birthDate', val)} />
        <SelectInput label="Sexe" placeholder="Sélectionner" value={profile.gender} options={genders} onSelect={(val) => handleChange('gender', val)} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><SelectInput label="Pays de Naissance" placeholder="Sélectionner" value={profile.birthCountry || ''} options={countries} onSelect={(val) => handleChange('birthCountry', val)} /></View>
          <View style={{ flex: 1 }}><SelectInput label="Résidence" placeholder="Sélectionner" value={profile.currentCountry || ''} options={countries} onSelect={(val) => handleChange('currentCountry', val)} /></View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Input label="Poids (kg)" placeholder="Ex: 75" keyboardType="numeric" value={profile.weight} onChangeText={(val) => handleChange('weight', val)} /></View>
          <View style={{ flex: 1 }}><Input label="Taille (cm)" placeholder="Ex: 180" keyboardType="numeric" value={profile.height} onChangeText={(val) => handleChange('height', val)} /></View>
        </View>

        <Input label="Maladies Chroniques" placeholder="Ex: Diabète type 2" value={profile.chronicConditions} onChangeText={(val) => handleChange('chronicConditions', val)} />
        <Input label="Allergies" placeholder="Ex: Pénicilline" value={profile.allergies} onChangeText={(val) => handleChange('allergies', val)} />
        <Input label="Traitements en cours" placeholder="Ex: Levothyrox 50" value={profile.medications} onChangeText={(val) => handleChange('medications', val)} />
        <Input label="N° Sécurité Sociale" placeholder="Ex: 1 80 01 75 001 001 01" value={user?.socialSecurityNumber || ''} onChangeText={(val) => dispatch(setUserSSN(val))} />

        <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.border, marginBottom: 24 }}>
          <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, marginBottom: 16 }]}>Paramètres</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 16, borderRadius: 16, ...Shadows.sm }}>
            <Text style={[Typography.bodyMedium, { color: Colors.textPrimary }]}>Langue</Text>
            <View style={{ flexDirection: 'row', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 999, padding: 4 }}>
              <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>FR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary }}>EN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 40 }}>
          <GradientButton title="Enregistrer le dossier" onPress={handleSave} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

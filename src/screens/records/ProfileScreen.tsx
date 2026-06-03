import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateProfile, clearProfile } from '../../store/slices/healthSlice';
import { setActiveProfileId } from '../../store/slices/authSlice';
import Input from '../../components/ui/Input';
import SelectInput from '../../components/ui/SelectInput';
import GradientButton from '../../components/ui/GradientButton';
import { db, ref, get, set, child } from '../../services/FirebaseService';
import { NotificationService } from '../../services/NotificationService';

const ages = Array.from({ length: 121 }, (_, i) => i.toString());
const genders = ["Homme", "Femme", "Autre"];
const countries = [
  "France", "Belgique", "Suisse", "Canada", "Maroc", "Algérie", "Tunisie", 
  "Sénégal", "Côte d'Ivoire", "Cameroun", "Mali", "Madagascar", "Brésil", 
  "États-Unis", "Royaume-Uni", "Allemagne", "Espagne", "Italie", "Portugal", "Autre"
];

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.health.profile);
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadMedicalRecord();
  }, [activeProfileId]);

  const loadMedicalRecord = async () => {
    if (!user || !activeProfileId) return;
    dispatch(clearProfile()); // Empêche le chevauchement des dossiers
    try {
      const dbRef = ref(db);
      // Load Medical Record
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(key => {
          dispatch(updateProfile({ [key]: data[key] }));
        });
      }
      
      // Load Profile Name
      const profileSnap = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}`));
      if (profileSnap.exists()) {
        dispatch(updateProfile({ name: profileSnap.val().name || '' }));
      }
    } catch (error) {
      console.error("Erreur chargement dossier médical", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    dispatch(updateProfile({ [field]: value }));
  };

  const handleSave = async () => {
    if (!user || !activeProfileId) return;
    try {
      // Save Medical Record
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord`), {
        age: profile.age || '',
        gender: profile.gender || '',
        weight: profile.weight || '',
        height: profile.height || '',
        chronicConditions: profile.chronicConditions || '',
        allergies: profile.allergies || '',
        medications: profile.medications || '',
        birthCountry: profile.birthCountry || '',
        currentCountry: profile.currentCountry || ''
      });

      // Update Profile Name
      const profileRef = ref(db, `users/${user.uid}/profiles/${activeProfileId}/name`);
      await set(profileRef, profile.name || '');

      Alert.alert("Succès", "Votre dossier médical a été sauvegardé sur Firebase.");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder votre dossier.");
    }
  };

  const handleSwitchProfile = () => {
    dispatch(setActiveProfileId(null));
  };

  const scheduleReminder = () => {
    if (!profile.medications) {
      Alert.alert('Info', 'Ajoutez d’abord vos traitements en cours dans le dossier médical.');
      return;
    }
    Alert.alert(
      '💊 Rappel Médicament',
      `Voulez-vous activer un rappel quotidien à 8h00 pour : ${profile.medications} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Activer',
          onPress: async () => {
            const granted = await NotificationService.requestPermissions();
            if (!granted) {
              Alert.alert('Permission refusée', 'Autorisez les notifications dans les Réglages.');
              return;
            }
            await NotificationService.scheduleMedicationReminder(profile.medications!, 8, 0);
            Alert.alert('✅ Rappel activé', `Vous serez rappelé(e) chaque matin à 8h00 pour prendre ${profile.medications}.`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <ScrollView className="flex-1 px-4">
        <View className="py-6 border-b border-white/10 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-bold text-white mb-2">Mon Dossier</Text>
            <Text className="text-slate-400">Ces informations sont liées à votre profil actuel.</Text>
          </View>
          <TouchableOpacity onPress={handleSwitchProfile} className="bg-white/10 px-3 py-2 rounded-lg">
            <Text className="text-white text-xs">Changer de Profil</Text>
          </TouchableOpacity>
        </View>

        <Input 
          label="Nom" 
          placeholder="Ex: Jean" 
          value={profile.name}
          onChangeText={(val) => handleChange('name', val)}
        />
        
        <SelectInput 
          label="Âge" 
          placeholder="Sélectionner un âge" 
          value={profile.age}
          options={ages}
          onSelect={(val) => handleChange('age', val)}
        />
        
        <SelectInput 
          label="Sexe" 
          placeholder="Sélectionner le sexe" 
          value={profile.gender}
          options={genders}
          onSelect={(val) => handleChange('gender', val)}
        />

        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <SelectInput 
              label="Pays de Naissance" 
              placeholder="Sélectionner" 
              value={profile.birthCountry || ''}
              options={countries}
              onSelect={(val) => handleChange('birthCountry', val)}
            />
          </View>
          <View className="flex-1 ml-2">
            <SelectInput 
              label="Résidence Actuelle" 
              placeholder="Sélectionner" 
              value={profile.currentCountry || ''}
              options={countries}
              onSelect={(val) => handleChange('currentCountry', val)}
            />
          </View>
        </View>

        <View className="flex-row justify-between mt-2">
          <View className="flex-1 mr-2">
            <Input 
              label="Poids (kg)" 
              placeholder="Ex: 75" 
              keyboardType="numeric"
              value={profile.weight}
              onChangeText={(val) => handleChange('weight', val)}
            />
          </View>
          <View className="flex-1 ml-2">
            <Input 
              label="Taille (cm)" 
              placeholder="Ex: 180" 
              keyboardType="numeric"
              value={profile.height}
              onChangeText={(val) => handleChange('height', val)}
            />
          </View>
        </View>

        <Input 
          label="Maladies Chroniques" 
          placeholder="Ex: Diabète type 2, Asthme..." 
          value={profile.chronicConditions}
          onChangeText={(val) => handleChange('chronicConditions', val)}
        />

        <Input 
          label="Allergies Médicamenteuses" 
          placeholder="Ex: Pénicilline, Ibuprofène..." 
          value={profile.allergies}
          onChangeText={(val) => handleChange('allergies', val)}
        />

        <Input 
          label="Traitements en cours" 
          placeholder="Ex: Levothyrox 50, Metformine..." 
          value={profile.medications}
          onChangeText={(val) => handleChange('medications', val)}
        />

        <View className="mt-6 gap-y-3 mb-12">
          <GradientButton title="Sauvegarder sur Firebase" onPress={handleSave} />
          <TouchableOpacity
            onPress={scheduleReminder}
            className="bg-white/10 border border-white/20 rounded-2xl p-4 items-center"
          >
            <Text className="text-white font-bold">💊 Activer Rappel Médicament</Text>
            <Text className="text-slate-400 text-xs mt-1">Notification quotidienne à 8h00</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setActiveProfileId, logout, setUserRole, setHasCompletedQuestionnaire } from '../../store/slices/authSlice';
import { db, ref, get, set, child, auth, signOut } from '../../services/FirebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

interface Profile {
  id: string;
  name: string;
  pin?: string;
  color: string;
}

const PROFILE_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ProfileSelectionScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfiles(); }, []);

  const loadProfiles = async () => {
    if (!user) return;
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles`));
      const loaded: Profile[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => { loaded.push(childSnapshot.val() as Profile); });
      }
      if (loaded.length === 0) {
        const defaultProfile: Profile = { id: 'main', name: 'Principal', color: PROFILE_COLORS[0] };
        await set(ref(db, `users/${user.uid}/profiles/main`), defaultProfile);
        loaded.push(defaultProfile);
      }
      setProfiles(loaded);
    } catch (error) {
      console.error("Erreur chargement profils", error);
    } finally { setLoading(false); }
  };

  const handleSelectProfile = async (profile: Profile) => {
    try {
      const dbRef = ref(db);
      const questSnap = await get(child(dbRef, `users/${user!.uid}/profiles/${profile.id}/questionnaire`));
      dispatch(setHasCompletedQuestionnaire(!!questSnap.val()?.completedAt));
    } catch (e) { console.error("Erreur vérification questionnaire", e); }

    if (profile.pin) {
      Alert.prompt("Code PIN", "Entrez le code PIN de ce profil", [
        { text: "Annuler", style: "cancel" },
        { text: "Valider", onPress: (pin?: string) => {
          if (pin === profile.pin) { dispatch(setActiveProfileId(profile.id)); navigation.navigate('HealthQuestionnaire'); }
          else Alert.alert("Erreur", "Code PIN incorrect.");
        }}
      ], "secure-text");
    } else {
      dispatch(setActiveProfileId(profile.id));
      navigation.navigate('HealthQuestionnaire');
    }
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (profile.id === 'main') { Alert.alert("Action impossible", "Le profil principal ne peut pas être supprimé."); return; }
    Alert.alert("Supprimer le profil ?", `Supprimer ${profile.name} et toutes ses données ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try { await set(ref(db, `users/${user!.uid}/profiles/${profile.id}`), null); setProfiles(prev => prev.filter(p => p.id !== profile.id)); }
        catch { Alert.alert("Erreur", "Impossible de supprimer."); }
      }}
    ]);
  };

  const handleCreateProfile = async () => {
    if (!user) return;
    Alert.prompt("Nouveau Profil", "Nom du membre", async (name) => {
      if (!name?.trim()) return;
      Alert.prompt("Code PIN (Optionnel)", "Laissez vide pour aucun", async (pin) => {
        setLoading(true);
        const newId = Date.now().toString();
        const newProfile: Profile = { id: newId, name: name.trim(), color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length] };
        if (pin?.trim()) newProfile.pin = pin.trim();
        await set(ref(db, `users/${user.uid}/profiles/${newId}`), newProfile);
        setProfiles([...profiles, newProfile]);
        setLoading(false);
      }, "secure-text");
    });
  };

  const handleLogout = async () => {
    try { if (user) await AsyncStorage.removeItem(`@biometric_verified_${user.uid}`); await signOut(auth); dispatch(logout()); }
    catch { Alert.alert("Erreur", "Impossible de se déconnecter."); }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ position: 'absolute', top: 12, left: 16, zIndex: 50 }}>
        <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}>
          <Text style={[Typography.caption, { color: Colors.textPrimary }]}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={[Typography.h1, { marginBottom: 40, textAlign: 'center' }]}>Qui consulte ?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
          {profiles.map(p => (
            <TouchableOpacity key={p.id} onPress={() => handleSelectProfile(p)} onLongPress={() => handleDeleteProfile(p)} delayLongPress={800} style={{ margin: 16, alignItems: 'center' }}
              accessibilityRole="button" accessibilityLabel={`Profil ${p.name}`}>
              <View style={{ backgroundColor: p.color, width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...Shadows.md }}>
                <Text style={{ color: '#FFFFFF', fontSize: 40, fontWeight: '700' }}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={[Typography.bodyMedium, { color: Colors.textPrimary }]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={handleCreateProfile} style={{ margin: 16, alignItems: 'center' }}
            accessibilityRole="button" accessibilityLabel="Ajouter un profil">
            <View style={{ width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.sm }}>
              <Text style={{ color: Colors.textMuted, fontSize: 40, fontWeight: '300' }}>+</Text>
            </View>
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Ajouter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

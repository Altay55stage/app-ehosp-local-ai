import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setActiveProfileId, logout } from '../../store/slices/authSlice';
import { db, ref, get, set, child, auth, signOut } from '../../services/FirebaseService';

interface Profile {
  id: string;
  name: string;
  pin?: string;
  color: string;
}

const colors = ['#0EA5E9', '#FFFFFF', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ProfileSelectionScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    if (!user) return;
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles`));
      
      const loaded: Profile[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          loaded.push(childSnapshot.val() as Profile);
        });
      }
      
      // Si aucun profil n'existe, on crée le profil principal
      if (loaded.length === 0) {
        const defaultProfile: Profile = {
          id: 'main',
          name: 'Principal',
          color: colors[0]
        };
        await set(ref(db, `users/${user.uid}/profiles/main`), defaultProfile);
        loaded.push(defaultProfile);
      }
      
      setProfiles(loaded);
    } catch (error) {
      console.error("Erreur chargement profils", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    if (profile.pin) {
      Alert.prompt(
        "Code PIN",
        "Entrez le code PIN de ce profil",
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Valider", 
            onPress: (pin?: string) => {
              if (pin === profile.pin) {
                dispatch(setActiveProfileId(profile.id));
              } else {
                Alert.alert("Erreur", "Code PIN incorrect.");
              }
            } 
          }
        ],
        "secure-text"
      );
    } else {
      dispatch(setActiveProfileId(profile.id));
    }
  };

  const handleCreateProfile = async () => {
    if (!user) {
      Alert.alert("Erreur", "Utilisateur introuvable.");
      return;
    }
    Alert.prompt(
      "Nouveau Profil",
      "Nom du membre de la famille",
      async (name) => {
        if (!name?.trim()) return;
        
        Alert.prompt(
          "Code PIN (Optionnel)",
          "Voulez-vous sécuriser ce profil ? (Laissez vide pour aucun)",
          async (pin) => {
            setLoading(true);
            const newId = Date.now().toString();
            const newProfile: Profile = {
              id: newId,
              name: name.trim(),
              color: colors[profiles.length % colors.length],
            };
            
            if (pin && pin.trim().length > 0) {
              newProfile.pin = pin.trim();
            }

            await set(ref(db, `users/${user.uid}/profiles/${newId}`), newProfile);
            setProfiles([...profiles, newProfile]);
            setLoading(false);
          },
          "secure-text"
        );
      }
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
    } catch (e) {
      Alert.alert("Erreur", "Impossible de se déconnecter.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-dark">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="absolute top-12 left-6 z-50">
        <TouchableOpacity onPress={handleLogout} className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
          <Text className="text-white text-sm">🚪 Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-3xl text-white font-bold mb-10">Qui consulte ?</Text>

        <View className="flex-row flex-wrap justify-center">
          {profiles.map(p => (
            <TouchableOpacity 
              key={p.id} 
              onPress={() => handleSelectProfile(p)}
              className="m-4 items-center"
            >
              <View 
                style={{ backgroundColor: p.color }} 
                className="w-24 h-24 rounded-2xl items-center justify-center mb-2"
              >
                <Text className="text-white text-3xl font-bold">{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text className="text-slate-300 font-bold">{p.name}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            onPress={handleCreateProfile}
            className="m-4 items-center"
          >
            <View className="w-24 h-24 rounded-2xl items-center justify-center mb-2 border-2 border-dashed border-slate-600">
              <Text className="text-slate-400 text-3xl">+</Text>
            </View>
            <Text className="text-slate-400 font-bold">Ajouter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

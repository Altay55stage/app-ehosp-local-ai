import React, { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setUserRole } from '../../store/slices/authSlice';
import { firestore, auth, doc, setDoc } from '../../services/FirebaseService';

import { Colors, Typography, Shadows } from '../../theme';

const ROLES = [
  { id: 'patient' as const, icon: 'person' as const, color: '#3B82F6', title: 'Compte Patient', description: 'Consultez Dr. IA, obtenez des ordonnances et consultez de vrais médecins.', badge: 'Accès immédiat' },
  { id: 'doctor' as const, icon: 'medical' as const, color: '#A855F7', title: 'Compte Médecin', description: 'Recevez des patients, émettez des ordonnances. Gagnez 70% par consultation.', badge: 'Validation requise' },
];

export default function RoleSelectionScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (role: 'patient' | 'doctor') => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    const confirmSelection = async () => {
      setLoading(role);
      try {
        const collection = role === 'patient' ? 'patients' : 'doctors';
        await setDoc(doc(firestore, collection, firebaseUser.uid), { role, uid: firebaseUser.uid, email: firebaseUser.email, createdAt: Date.now() }, { merge: true });
        dispatch(setUserRole(role));
        navigation.replace('Main');
      } catch { Alert.alert("Erreur", "Impossible de sauvegarder votre choix."); } finally { setLoading(null); }
    };
    if (role === 'doctor') {
      Alert.alert('Compte Médecin', 'Vous aurez besoin de votre licence médicale (PDF).\n\nAprès vérification, vous pourrez recevoir des patients.', [
        { text: 'Annuler', style: 'cancel' }, { text: 'Continuer', onPress: confirmSelection },
      ]);
    } else { confirmSelection(); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 48, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 64, height: 64, backgroundColor: Colors.primaryLight, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.primary + '40' }}>
            <Ionicons name="heart-half" size={32} color={Colors.primary} />
          </View>
          <Text style={[Typography.h1, { textAlign: 'center' }]}>Bienvenue sur eHosp</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            Choisissez votre type de compte
          </Text>
        </View>

        <View style={{ gap: 16, flex: 1, justifyContent: 'center' }}>
          {ROLES.map((role) => (
            <TouchableOpacity key={role.id} onPress={() => handleSelect(role.id)} disabled={loading !== null}
              style={{ borderRadius: 24, padding: 24, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.sm }}
              accessibilityRole="button" accessibilityLabel={role.title}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: role.color + '15' }}>
                  {loading === role.id ? <ActivityIndicator color={role.color} /> : <Ionicons name={role.icon} size={32} color={role.color} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={[Typography.h3]}>{role.title}</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: role.color + '15' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: role.color }}>{role.badge}</Text>
                    </View>
                  </View>
                  <Text style={[Typography.caption, { color: Colors.textSecondary, lineHeight: 20 }]}>{role.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={[Typography.caption, { textAlign: 'center', lineHeight: 18 }]}>
            Vos données sont chiffrées et protégées. Vous pouvez modifier votre rôle plus tard.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

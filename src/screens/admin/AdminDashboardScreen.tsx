import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { firestore, collection, query, where, doc, updateDoc, onSnapshot } from '../../services/FirebaseService';

import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

interface Candidacy { uid: string; email: string; licenseUrl: string; status: 'pending' | 'approved' | 'rejected'; submittedAt: number; specialization?: string; experience?: string; bio?: string; }

export default function AdminDashboardScreen() {
  const [candidacies, setCandidacies] = useState<Candidacy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(firestore, 'doctors'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snapshot) => { setCandidacies(snapshot.docs.map(d => d.data() as Candidacy)); setLoading(false); });
    return () => unsub();
  }, []);

  const handleApprove = (uid: string) => {
    Alert.alert("Approuver", "Valider ce médecin ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Approuver", onPress: async () => { try { await updateDoc(doc(firestore, 'doctors', uid), { status: 'approved' }); } catch { Alert.alert("Erreur"); } } }
    ]);
  };

  const handleReject = (uid: string) => {
    Alert.alert("Rejeter", "Confirmer le rejet ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Rejeter", style: "destructive", onPress: async () => { try { await updateDoc(doc(firestore, 'doctors', uid), { status: 'rejected' }); } catch { Alert.alert("Erreur"); } } }
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark }}>
      <ActivityIndicator size="large" color={Colors.warning} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={[Typography.h1, { color: '#FFFFFF' }]}>Console Admin</Text>
          <Text style={[Typography.caption, { color: Colors.warning, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }]}>Modération des Médecins</Text>
        </View>

        <Text style={[Typography.bodyMedium, { color: '#FFFFFF', marginBottom: 16 }]}>Candidatures en attente ({candidacies.length})</Text>

        {candidacies.length === 0 ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 40, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.primary} />
            <Text style={[Typography.body, { color: '#94A3B8', marginTop: 16, textAlign: 'center' }]}>Aucune candidature à traiter.</Text>
          </View>
        ) : candidacies.map((c) => (
          <View key={c.uid} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyMedium, { color: '#FFFFFF' }]}>{c.email}</Text>
                <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase', marginTop: 4 }]}>{c.specialization || 'Spécialité non précisée'}</Text>
                <Text style={[Typography.caption, { color: '#94A3B8', marginTop: 4 }]}>Expérience : {c.experience || '0'} ans</Text>
                {c.bio && <Text style={[Typography.caption, { color: '#64748B', marginTop: 8, fontStyle: 'italic' }]} numberOfLines={2}>"{c.bio}"</Text>}
                <Text style={[Typography.caption, { color: '#475569', marginTop: 8 }]}>Soumis le : {new Date(c.submittedAt).toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity onPress={() => Linking.openURL(c.licenseUrl)}
                style={{ backgroundColor: Colors.primary + '30', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '50' }}
                accessibilityRole="button" accessibilityLabel="Voir le PDF">
                <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                <Text style={[Typography.caption, { color: Colors.primary, marginLeft: 4 }]}>Voir PDF</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => handleReject(c.uid)}
                style={{ backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '40', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, width: '48%', alignItems: 'center' }}
                accessibilityRole="button" accessibilityLabel="Rejeter">
                <Text style={[Typography.bodyMedium, { color: Colors.error }]}>Rejeter</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleApprove(c.uid)}
                style={{ backgroundColor: Colors.primary + '15', borderWidth: 1, borderColor: Colors.primary + '40', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, width: '48%', alignItems: 'center' }}
                accessibilityRole="button" accessibilityLabel="Approuver">
                <Text style={[Typography.bodyMedium, { color: Colors.primary }]}>Approuver</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

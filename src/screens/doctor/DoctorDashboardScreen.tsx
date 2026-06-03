import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

const PATIENTS: any[] = [];

export default function DoctorDashboardScreen({ navigation }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface }}>
        <View>
          <Text style={[Typography.h2]}>Espace Pro</Text>
          <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase', letterSpacing: 2 }]}>eHosp 5.0 Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => Alert.alert("Ajout Patient", "Saisissez l'email ou le SSN.", [{text: "Annuler"}, {text: "Chercher"}])}
            style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '40' }}
            accessibilityRole="button" accessibilityLabel="Ajouter un patient">
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border }}
            accessibilityRole="button" accessibilityLabel="Notifications">
            <Ionicons name="notifications" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
          <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary + '30', borderRadius: 24, padding: 20, width: '48%', ...Shadows.sm }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: Colors.primary }}>{PATIENTS.length}</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>Patients en attente</Text>
          </View>
          <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.error + '30', borderRadius: 24, padding: 20, width: '48%', ...Shadows.sm }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: Colors.error }}>0</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>Urgences vitales</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[Typography.h3]}>Triage IA Actif</Text>
          <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' }}>En direct</Text>
          </View>
        </View>

        {PATIENTS.length === 0 ? (
          <View style={{ backgroundColor: Colors.surface, borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border, ...Shadows.sm }}>
            <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="checkmark-done-circle" size={32} color={Colors.primary} />
            </View>
            <Text style={[Typography.bodyMedium]}>Salle d'attente vide</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>Tous les patients traités. L'IA surveille les nouvelles arrivées.</Text>
          </View>
        ) : PATIENTS.map((patient) => (
          <TouchableOpacity key={patient.id} onPress={() => navigation.navigate('Teleconsultation', { patient })}
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, padding: 20, marginBottom: 16, ...Shadows.sm }}
            accessibilityRole="button" accessibilityLabel={`Consultation avec ${patient.name}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyMedium]}>{patient.name}</Text>
                <Text style={[Typography.caption, { marginTop: 4, lineHeight: 20 }]}>{patient.summary}</Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, backgroundColor: patient.urgency >= 8 ? '#FEF2F2' : Colors.primaryLight, borderWidth: 1, borderColor: patient.urgency >= 8 ? '#FECACA' : Colors.primary + '40' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: patient.urgency >= 8 ? Colors.error : Colors.primary }}>
                  SCORE {patient.urgency}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time" size={16} color={Colors.textMuted} />
                <Text style={[Typography.caption, { marginLeft: 4 }]}>Attente: 12 min</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={{ backgroundColor: Colors.primaryLight, padding: 10, borderRadius: 999, marginRight: 8 }} accessibilityRole="button" accessibilityLabel="Vidéo">
                  <Ionicons name="videocam" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: Colors.background, padding: 10, borderRadius: 999 }} accessibilityRole="button" accessibilityLabel="Documents">
                  <Ionicons name="document-text" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

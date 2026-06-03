import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AzureVisionService } from '../../services/AzureVisionService';
import GradientButton from '../../components/ui/GradientButton';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateProfile } from '../../store/slices/healthSlice';
import { db, ref, set } from '../../services/FirebaseService';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

export default function MedicationScannerScreen({ navigation }: any) {
  const cameraRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const dispatch = useDispatch();
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.health.profile);

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const ocrText = await AzureVisionService.analyzeImage(photo.base64);
      const medInfo = await AzureVisionService.extractMedicationInfo(ocrText);
      if (medInfo.name && medInfo.name !== 'Inconnu') {
        Alert.alert('Médicament détecté', `Ajouter "${medInfo.name} ${medInfo.dosage}" à votre traitement ?`, [
          { text: 'Annuler', style: 'cancel', onPress: () => setIsProcessing(false) },
          { text: 'Ajouter', onPress: () => saveMedication(medInfo.name, medInfo.dosage) }
        ]);
      } else { Alert.alert('Échec', 'Impossible de lire le médicament. Essayez plus proche.'); setIsProcessing(false); }
    } catch { Alert.alert('Erreur', 'Erreur technique.'); setIsProcessing(false); }
  };

  const saveMedication = async (name: string, dosage: string) => {
    if (!user || !activeProfileId) return;
    const newMedList = profile.medications ? `${profile.medications}, ${name} ${dosage}` : `${name} ${dosage}`;
    try {
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord/medications`), newMedList);
      dispatch(updateProfile({ medications: newMedList }));
      Alert.alert('Succès', 'Médicament ajouté.'); navigation.goBack();
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder.'); } finally { setIsProcessing(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ borderWidth: 2, borderColor: Colors.primary, borderRadius: 24, width: width * 0.8, height: 200 }} />
        <Text style={[Typography.bodyMedium, { marginTop: 16, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }]}>
          Cadrez le nom du médicament
        </Text>
      </View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32, paddingBottom: 48 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={[Typography.bodyMedium, { color: '#FFFFFF' }]}>Scanner intelligent</Text>
            <Text style={[Typography.caption, { color: '#94A3B8' }]}>Analyse OCR par Azure AI</Text>
          </View>
          {isProcessing ? (
            <ActivityIndicator color={Colors.info} />
          ) : (
            <TouchableOpacity onPress={takePicture} style={{ backgroundColor: Colors.primary, width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' }}
              accessibilityRole="button" accessibilityLabel="Prendre une photo">
              <View style={{ width: 24, height: 24, backgroundColor: '#FFFFFF', borderRadius: 999 }} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={[Typography.bodyMedium, { color: '#94A3B8' }]}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

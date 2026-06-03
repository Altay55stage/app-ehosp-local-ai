import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MistralVisionService } from '../../services/MistralVisionService';
import GradientButton from '../../components/ui/GradientButton';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateProfile } from '../../store/slices/healthSlice';
import { db, ref, set } from '../../services/FirebaseService';

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
      
      const ocrText = await MistralVisionService.analyzeImage(photo.base64);
      const medInfo = await MistralVisionService.extractMedicationInfo(ocrText);

      if (medInfo.name && medInfo.name !== 'Inconnu') {
        Alert.alert(
          'Médicament détecté',
          `Voulez-vous ajouter "${medInfo.name} ${medInfo.dosage}" à votre traitement ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => setIsProcessing(false) },
            { 
              text: 'Ajouter', 
              onPress: () => saveMedication(medInfo.name, medInfo.dosage) 
            }
          ]
        );
      } else {
        Alert.alert('Échec', 'Impossible de lire le nom du médicament. Essayez d\'être plus proche et stable.');
        setIsProcessing(false);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur technique est survenue.');
      setIsProcessing(false);
    }
  };

  const saveMedication = async (name: string, dosage: string) => {
    if (!user || !activeProfileId) return;

    const newMedList = profile.medications 
      ? `${profile.medications}, ${name} ${dosage}`
      : `${name} ${dosage}`;

    try {
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord/medications`), newMedList);
      dispatch(updateProfile({ medications: newMedList }));
      Alert.alert('Succès', 'Médicament ajouté à votre dossier.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      
      {/* Overlay de capture */}
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        <View 
          className="border-2 border-primary rounded-3xl"
          style={{ width: width * 0.8, height: 200, backgroundColor: 'transparent' }}
        />
        <Text className="text-white font-bold mt-4 bg-black/50 px-4 py-2 rounded-full">
          Cadrez le nom du médicament ici
        </Text>
      </View>

      <View className="p-8 pb-12">
        <View className="flex-row justify-between items-center bg-black/60 p-4 rounded-3xl border border-white/10">
          <View className="flex-1 mr-4">
            <Text className="text-white font-bold">Scanner intelligent</Text>
            <Text className="text-slate-400 text-xs">Analyse OCR par Mistral AI</Text>
          </View>
          {isProcessing ? (
            <ActivityIndicator color="#0EA5E9" />
          ) : (
            <TouchableOpacity 
              onPress={takePicture}
              className="bg-primary w-14 h-14 rounded-full items-center justify-center border-4 border-white/20"
            >
              <View className="w-6 h-6 bg-dark rounded-full" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mt-6 items-center"
        >
          <Text className="text-slate-500">Annuler</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

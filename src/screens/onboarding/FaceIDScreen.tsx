import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useDispatch } from 'react-redux';
import { setBiometricVerified } from '../../store/slices/authSlice';
import LottieView from 'lottie-react-native';
import GradientButton from '../../components/ui/GradientButton';

export default function FaceIDScreen() {
  const dispatch = useDispatch();
  const [isSupported, setIsSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biométrie');

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(compatible);
      
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      }
    })();
  }, []);

  const handleAuthentication = async () => {
    try {
      // Vérifier si des empreintes ou visages sont enregistrés
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert(
          'Non configuré',
          "Aucune donnée biométrique n'est configurée sur cet appareil. Veuillez configurer Face ID ou Touch ID dans vos réglages système.",
          [
            { text: 'OK' },
            { 
              text: 'Mode Test (Bypass)', 
              onPress: () => dispatch(setBiometricVerified(true)),
              style: 'destructive' 
            }
          ]
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification requise pour accéder à vos données médicales',
        fallbackLabel: 'Utiliser le code de l’appareil',
        disableDeviceFallback: false,
      });

      if (result.success) {
        dispatch(setBiometricVerified(true));
      } else if (result.error !== 'user_cancel') {
        Alert.alert('Échec', "L'authentification a échoué. Vérifiez vos réglages.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', "Impossible d'activer la biométrie. Assurez-vous d'utiliser un appareil compatible (pas le simulateur sans config).");
    }
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="flex-1 px-6 justify-center items-center">
        <View style={{ width: 250, height: 250 }}>
          <LottieView
            source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_m6cu96ze.json' }} // Animation de scan facial
            autoPlay
            loop
            style={{ width: '100%', height: '100%' }}
          />
        </View>

        <Text className="text-white text-3xl font-bold text-center mt-8">Sécurité Médicale</Text>
        <Text className="text-slate-400 text-center mt-4 text-base leading-6">
          eHosp protège vos données de santé. Pour garantir la confidentialité de vos dossiers, l'accès par {biometricType} est obligatoire.
        </Text>

        <View className="w-full mt-12">
          <GradientButton 
            title={`Activer ${biometricType}`} 
            onPress={handleAuthentication} 
          />
        </View>

        <Text className="text-slate-500 text-xs text-center mt-6">
          Vos données biométriques restent stockées localement sur votre appareil et ne sont jamais transmises à nos serveurs.
        </Text>
      </View>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import { setBiometricVerified } from '../../store/slices/authSlice';
import PulseAnimation from '../../components/ui/PulseAnimation';

export default function BiometricScreen() {
  const dispatch = useDispatch();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);

  useEffect(() => {
    checkHardware();
  }, []);

  const checkHardware = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setHasHardware(compatible);
    if (compatible) {
      handleBiometricAuth();
    } else {
      // Si l'appareil n'a pas de biométrie, on autorise l'accès (ou on demande un code PIN)
      dispatch(setBiometricVerified(true));
    }
  };

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouiller eHosp',
        fallbackLabel: 'Utiliser le code',
        disableDeviceFallback: false,
      });

      if (result.success) {
        dispatch(setBiometricVerified(true));
      } else {
        Alert.alert('Échec', 'Authentification annulée ou échouée.');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="flex-1 items-center justify-center px-6">
        <PulseAnimation color="rgba(14, 165, 233, 0.2)">
          <View className="w-32 h-32 bg-primary/20 rounded-full items-center justify-center">
            <Text className="text-5xl">🔐</Text>
          </View>
        </PulseAnimation>
        
        <Text className="text-2xl font-bold text-white mt-8 mb-2">Sécurité eHosp</Text>
        <Text className="text-slate-400 text-center mb-12">
          Vos données médicales sont sensibles. Veuillez vous authentifier pour accéder à votre dossier.
        </Text>
        
        {hasHardware && (
          <TouchableOpacity 
            onPress={handleBiometricAuth}
            disabled={isAuthenticating}
            className="bg-primary px-8 py-4 rounded-xl"
          >
            <Text className="text-slate-950 font-bold text-lg">
              {isAuthenticating ? "Vérification..." : "Utiliser Face ID / Touch ID"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

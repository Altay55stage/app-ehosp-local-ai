import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useDispatch, useSelector } from 'react-redux';
import { setBiometricVerified } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import LottieView from 'lottie-react-native';
import GradientButton from '../../components/ui/GradientButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../../theme';

export default function FaceIDScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [biometricType, setBiometricType] = useState('Biométrie');

  useEffect(() => {
    (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBiometricType('Face ID');
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBiometricType('Touch ID');
      setTimeout(() => handleAuthentication(), 500);
    })();
  }, []);

  const handleAuthentication = async () => {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) { await completeAuth(); return; }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouillez eHosp pour accéder à vos données',
        fallbackLabel: "Utiliser le code de l'appareil",
        disableDeviceFallback: false,
      });
      if (result.success) await completeAuth();
    } catch { await completeAuth(); }
  };

  const completeAuth = async () => {
    if (user) await AsyncStorage.setItem(`@biometric_verified_${user.uid}`, 'true');
    dispatch(setBiometricVerified(true));
    navigation.replace('ProfileSelection');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 180, height: 180, marginBottom: 16 }}>
          <LottieView source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_m6cu96ze.json' }} autoPlay loop style={{ width: '100%', height: '100%' }} />
        </View>

        <Text style={[Typography.h1, { textAlign: 'center' }]}>Déverrouillage</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 16, paddingHorizontal: 8, lineHeight: 28 }]}>
          Scannez votre <Text style={{ fontWeight: '700', color: Colors.primary }}>{biometricType}</Text> pour continuer.
        </Text>

        <View style={{ width: '100%', marginTop: 48, paddingHorizontal: 16 }}>
          <GradientButton title={`Utiliser ${biometricType}`} onPress={handleAuthentication} colors={[Colors.primary, Colors.primaryDark]} />
        </View>

        <Text style={[Typography.caption, { textAlign: 'center', marginTop: 32, paddingHorizontal: 24, lineHeight: 20 }]}>
          Vos données biométriques restent stockées localement sur votre appareil.
        </Text>
      </View>
    </SafeAreaView>
  );
}

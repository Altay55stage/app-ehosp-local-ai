import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { auth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from '../../services/FirebaseService';
import { setUser } from '../../store/slices/authSlice';
import GradientButton from '../../components/ui/GradientButton';
import Input from '../../components/ui/Input';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const [_request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          dispatch(setUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
          }));
        })
        .catch((error) => {
          Alert.alert('Erreur Google', error.message);
        })
        .finally(() => setLoading(false));
    }
  }, [response]);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      dispatch(setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      }));
    } catch (error: any) {
      Alert.alert('Erreur d\'inscription', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    if (!_request) {
      Alert.alert(
        'Google non prêt',
        'La requête Google n’est pas encore initialisée. Attendez 1 seconde puis réessayez.'
      );
      return;
    }
    promptAsync();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-white mb-2">Rejoignez eHosp</Text>
        <Text className="text-slate-400 mb-8">Créez votre dossier médical sécurisé.</Text>
        
        <Input 
          label="Email" 
          placeholder="votre@email.com" 
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Input 
          label="Mot de passe" 
          placeholder="••••••••" 
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Input 
          label="Confirmer le mot de passe" 
          placeholder="••••••••" 
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        
        <View className="mt-8">
          <GradientButton 
            title={loading ? "Création en cours..." : "Créer mon compte"} 
            onPress={handleRegister} 
            disabled={loading}
          />
        </View>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px] bg-white/10" />
          <Text className="text-slate-400 px-4">OU</Text>
          <View className="flex-1 h-[1px] bg-white/10" />
        </View>

        <TouchableOpacity 
          onPress={handleGoogleRegister}
          disabled={loading}
          className={`w-full bg-white rounded-2xl py-4 items-center justify-center mb-6 flex-row ${loading ? 'opacity-50' : ''}`}
        >
          <Text className="text-black font-bold text-lg">Continuer avec Google</Text>
        </TouchableOpacity>
        
        <View className="flex-row justify-center">
          <Text className="text-slate-400">Déjà membre ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-slate-950 font-semibold">Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

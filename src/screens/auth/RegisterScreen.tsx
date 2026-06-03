import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { auth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from '../../services/FirebaseService';
import { setUser } from '../../store/slices/authSlice';
import GradientButton from '../../components/ui/GradientButton';
import Input from '../../components/ui/Input';
import Toast, { useToast } from '../../components/ui/Toast';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Colors, Typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { toast, show: showToast, hide: hideToast } = useToast();

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const [googleRequest, response, promptAsync] = Google.useAuthRequest({
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
          navigation.getParent()?.navigate('Consent');
        })
        .catch(() => {
          showToast('Erreur de connexion Google. Réessayez.', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [response]);

  const getFirebaseErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Un compte existe déjà avec cet email.';
      case 'auth/invalid-email':
        return 'Adresse email invalide.';
      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères.';
      default:
        return 'Erreur d\'inscription. Réessayez.';
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showToast('Veuillez remplir tous les champs.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas.', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('Le mot de passe doit contenir au moins 6 caractères.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      dispatch(setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      }));
      navigation.getParent()?.navigate('Consent');
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error.code);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    if (!googleRequest) {
      showToast('Patientez une seconde puis réessayez.', 'info');
      return;
    }
    promptAsync();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 mt-4">
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-8 justify-center pb-10">
            <Text style={[Typography.h1, { marginBottom: 8 }]}>Rejoignez eHosp</Text>
            <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: 32 }]}>
              Créez votre dossier médical sécurisé et accédez à l'IA locale.
            </Text>
            
            <Input 
              label="Email" 
              placeholder="votre@email.com" 
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
            />
            <Input 
              label="Mot de passe" 
              placeholder="••••••••" 
              secureTextEntry
              showPasswordToggle
              value={password}
              onChangeText={setPassword}
              leftIcon="lock-closed-outline"
            />
            <Input 
              label="Confirmer le mot de passe" 
              placeholder="••••••••" 
              secureTextEntry
              showPasswordToggle
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              leftIcon="lock-closed-outline"
            />
            
            <View className="mt-8">
              <GradientButton 
                title="Créer mon compte" 
                loading={loading}
                loadingText="Création en cours..."
                onPress={handleRegister} 
                colors={[Colors.primary, Colors.primaryDark]}
              />
            </View>

            <View className="flex-row items-center my-8">
              <View className="flex-1 h-[1px]" style={{ backgroundColor: Colors.border }} />
              <Text style={[Typography.caption, { paddingHorizontal: 16 }]}>OU</Text>
              <View className="flex-1 h-[1px]" style={{ backgroundColor: Colors.border }} />
            </View>

            <TouchableOpacity 
              onPress={handleGoogleRegister}
              disabled={loading}
              className="w-full py-4 rounded-xl items-center justify-center mb-6"
              style={{ 
                backgroundColor: Colors.background,
                borderWidth: 1.5,
                borderColor: Colors.border,
                opacity: loading ? 0.5 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Continuer avec Google"
            >
              <Text style={[Typography.button, { color: Colors.textPrimary }]}>
                Continuer avec Google
              </Text>
            </TouchableOpacity>
            
            <View className="flex-row justify-center mt-4">
              <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                Déjà membre ?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[Typography.bodyMedium, { color: Colors.primary }]}>
                  Se connecter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

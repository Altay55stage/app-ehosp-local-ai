import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, ref, get, child } from '../services/FirebaseService';
import { setUser, setHasAcceptedConsent, setHasCompletedQuestionnaire } from '../store/slices/authSlice';
import { RootState } from '../store/store';

import MainTabNavigator from './MainTabNavigator';
import AuthNavigator from './AuthNavigator';
import BiometricScreen from '../screens/auth/BiometricScreen';
import ProfileSelectionScreen from '../screens/auth/ProfileSelectionScreen';
import ConsentScreen from '../screens/onboarding/ConsentScreen';
import HealthQuestionnaireScreen from '../screens/onboarding/HealthQuestionnaireScreen';
import CGUScreen from '../screens/onboarding/CGUScreen';
import FaceIDScreen from '../screens/onboarding/FaceIDScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, isBiometricVerified, activeProfileId, hasAcceptedConsent, hasCompletedQuestionnaire } =
    useSelector((state: RootState) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      const initializeUserState = async () => {
        if (user) {
          dispatch(setUser({ uid: user.uid, email: user.email }));
          try {
            const dbRef = ref(db);
            const consentSnapshot = await get(child(dbRef, `users/${user.uid}/onboarding/consent`));
            const questionnaireSnapshot = await get(child(dbRef, `users/${user.uid}/onboarding/questionnaire`));
            dispatch(setHasAcceptedConsent(!!consentSnapshot.val()?.accepted));
            dispatch(setHasCompletedQuestionnaire(!!questionnaireSnapshot.val()?.completedAt));
          } catch {
            dispatch(setHasAcceptedConsent(false));
            dispatch(setHasCompletedQuestionnaire(false));
          }
        } else {
          dispatch(setUser(null));
          dispatch(setHasAcceptedConsent(false));
          dispatch(setHasCompletedQuestionnaire(false));
        }
        if (isInitializing) setIsInitializing(false);
      };

      initializeUserState();
    });
    return subscriber;
  }, []);

  if (isInitializing) {
    return (
      <View className="flex-1 justify-center items-center bg-dark">
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !hasAcceptedConsent ? (
          <>
            <Stack.Screen name="Consent" component={ConsentScreen} />
            <Stack.Screen name="CGU" component={CGUScreen} />
          </>
        ) : !hasCompletedQuestionnaire ? (
          <Stack.Screen name="HealthQuestionnaire" component={HealthQuestionnaireScreen} />
        ) : !isBiometricVerified ? (
          <Stack.Screen name="Biometric" component={FaceIDScreen} />
        ) : !activeProfileId ? (
          <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}


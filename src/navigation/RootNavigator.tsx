import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, ref, get, child, firestore, doc, getDoc } from '../services/FirebaseService';

import { setUser, setUserRole, setUserStatus, setUserSSN, setHasAcceptedConsent, setHasCompletedQuestionnaire, setBiometricVerified } from '../store/slices/authSlice';
import { RootState } from '../store/store';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { notificationDoctorService } from '../services/NotificationDoctorService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';

import MainTabNavigator from './MainTabNavigator';
import AuthNavigator from './AuthNavigator';
import ConsentScreen from '../screens/onboarding/ConsentScreen';
import HealthQuestionnaireScreen from '../screens/onboarding/HealthQuestionnaireScreen';
import CGUScreen from '../screens/onboarding/CGUScreen';
import FaceIDScreen from '../screens/onboarding/FaceIDScreen';
import RoleSelectionScreen from '../screens/onboarding/RoleSelectionScreen';
import DoctorCandidacyScreen from '../screens/onboarding/DoctorCandidacyScreen';
import ProfileSelectionScreen from '../screens/auth/ProfileSelectionScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, isBiometricVerified, activeProfileId, hasAcceptedConsent, hasCompletedQuestionnaire, user } = useSelector((state: RootState) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let failsafe: ReturnType<typeof setTimeout>;
    failsafe = setTimeout(() => { if (!cancelled) setIsInitializing(false); }, 8000);

    const subscriber = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;
      if (!firebaseUser) { dispatch(setUser(null)); clearTimeout(failsafe); setIsInitializing(false); return; }

      const uid = firebaseUser.uid;
      try {
        dispatch(setUser({ uid, email: firebaseUser.email }));

        if (firebaseUser.email === 'altayinvestpro@gmail.com') {
          dispatch(setUserRole('admin')); dispatch(setUserStatus('approved'));
        } else {
          try {
            const patientDoc = await getDoc(doc(firestore, 'patients', uid));
            if (patientDoc.exists()) {
              dispatch(setUserRole('patient'));
              if (patientDoc.data().socialSecurityNumber) dispatch(setUserSSN(patientDoc.data().socialSecurityNumber));
            } else {
              const doctorDoc = await getDoc(doc(firestore, 'doctors', uid));
              if (doctorDoc.exists()) { dispatch(setUserRole('doctor')); if (doctorDoc.data().status) dispatch(setUserStatus(doctorDoc.data().status)); }
            }
          } catch { dispatch(setUserRole('patient')); }
        }

        let isConsentAccepted = false;
        let isQuestionnaireCompleted = false;
        try {
          const [lc, lb] = await Promise.all([AsyncStorage.getItem(`@consent_${uid}`), AsyncStorage.getItem(`@biometric_verified_${uid}`)]);
          if (lc === 'true') isConsentAccepted = true;
          if (lb === 'true') dispatch(setBiometricVerified(true));
        } catch {}
        try {
          const dbRef = ref(db);
          const [cs, qs] = await Promise.all([get(child(dbRef, `users/${uid}/onboarding/consent`)), get(child(dbRef, `users/${uid}/onboarding/questionnaire`))]);
          if (cs.val()?.accepted) isConsentAccepted = true;
          if (qs.val()?.completedAt) isQuestionnaireCompleted = true;
        } catch {}
        dispatch(setHasAcceptedConsent(isConsentAccepted));
        dispatch(setHasCompletedQuestionnaire(isQuestionnaireCompleted));

        try {
          await notificationDoctorService.initializePushNotifications();
          const pid = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          if (pid) { const t = await Notifications.getExpoPushTokenAsync({ projectId: pid }); if (t.data) await notificationDoctorService.saveExpoPushToken(uid, t.data); }
        } catch {}
      } catch (err) { console.error('Init error:', err); }
      finally { clearTimeout(failsafe); if (!cancelled) setIsInitializing(false); }
    });
    return () => { cancelled = true; subscriber(); clearTimeout(failsafe); };
  }, [dispatch]);

  // Détermine la route initiale APRÈS l'initialisation
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) setInitialRoute('Auth');
    else if (!hasAcceptedConsent) setInitialRoute('Consent');
    else if (!isBiometricVerified) setInitialRoute('Biometric');
    else if (!activeProfileId) setInitialRoute('ProfileSelection');
    else if (!hasCompletedQuestionnaire) setInitialRoute('HealthQuestionnaire');
    else if (!user?.role) setInitialRoute('RoleSelection');
    else if (user.role === 'doctor' && user.status !== 'approved') setInitialRoute('DoctorCandidacy');
    else setInitialRoute('Main');
  }, [isInitializing, isAuthenticated, hasAcceptedConsent, isBiometricVerified, activeProfileId, hasCompletedQuestionnaire, user?.role, user?.status]);

  if (isInitializing || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Consent" component={ConsentScreen} />
        <Stack.Screen name="CGU" component={CGUScreen} />
        <Stack.Screen name="Biometric" component={FaceIDScreen} />
        <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
        <Stack.Screen name="HealthQuestionnaire" component={HealthQuestionnaireScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="DoctorCandidacy" component={DoctorCandidacyScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

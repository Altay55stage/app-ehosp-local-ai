import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateProfile, clearProfile } from '../store/slices/healthSlice';
import { db, ref, get, child } from '../services/FirebaseService';
import { NotificationService } from '../services/NotificationService';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import MedicalTimelineScreen from '../screens/records/MedicalTimelineScreen';
import FamilyScreen from '../screens/family/FamilyScreen';
import ProfileScreen from '../screens/records/ProfileScreen';
import TriageScreen from '../screens/triage/TriageScreen';
import HeartRateSensorScreen from '../screens/sensors/HeartRateSensorScreen';
import MedicationScannerScreen from '../screens/sensors/MedicationScannerScreen';
import VoiceConsultationScreen from '../screens/chat/VoiceConsultationScreen';
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import TeleconsultationScreen from '../screens/doctor/TeleconsultationScreen';
import NutritionScreen from '../screens/analysis/NutritionScreen';
import SubscriptionScreen from '../screens/shop/SubscriptionScreen';
import BookConsultationScreen from '../screens/consultation/BookConsultationScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Le Navigator des Onglets (Bottom Tabs)
 */
function TabNavigator() {
  const { user } = useSelector((state: RootState) => state.auth);
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.email === 'altayinvestpro@gmail.com'; // Votre compte Admin

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          height: 60,
          paddingBottom: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: isAdmin ? '#F59E0B' : (isDoctor ? '#A855F7' : '#2C5545'),
        tabBarInactiveTintColor: '#94A3B8',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Home' || route.name === 'DoctorHome') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Chat') iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          else if (route.name === 'Triage') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Timeline') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Family') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Admin') iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {isDoctor ? (
        <Tab.Screen name="DoctorHome" component={DoctorDashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      ) : (
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Accueil' }} />
      )}
      
      {isAdmin && <Tab.Screen name="Admin" component={AdminDashboardScreen} options={{ tabBarLabel: 'Admin' }} />}
      
      {!isDoctor && <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Dr. IA' }} />}
      {!isDoctor && <Tab.Screen name="Triage" component={TriageScreen} options={{ tabBarLabel: 'Urgences' }} />}
      
      <Tab.Screen name="Timeline" component={MedicalTimelineScreen} options={{ tabBarLabel: isDoctor ? 'Consultations' : 'Timeline' }} />
      {!isDoctor && <Tab.Screen name="Family" component={FamilyScreen} options={{ tabBarLabel: 'Famille' }} />}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

/**
 * Le Navigator Principal qui englobe les Tabs + les écrans globaux (accessible depuis n'importe quel onglet)
 */
export default function MainTabNavigator() {
  const dispatch = useDispatch();
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    NotificationService.requestPermissions();
    const loadProfileData = async () => {
      if (!user || !activeProfileId) return;
      try {
        dispatch(clearProfile());
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord`));
        if (snapshot.exists()) dispatch(updateProfile(snapshot.val()));
        const profileSnap = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}`));
        if (profileSnap.exists()) dispatch(updateProfile({ name: profileSnap.val().name || '' }));
      } catch (error) {
        console.error("Erreur chargement profil global:", error);
      }
    };
    loadProfileData();
  }, [user, activeProfileId, dispatch]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Les onglets sont l'écran racine */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      
      {/* Écrans partagés accessibles depuis n'importe quel onglet */}
      <Stack.Screen name="HeartRate" component={HeartRateSensorScreen} />
      <Stack.Screen name="Scanner" component={MedicationScannerScreen} />
      <Stack.Screen name="VoiceConsultation" component={VoiceConsultationScreen} />
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Stack.Screen name="Teleconsultation" component={TeleconsultationScreen} />
      <Stack.Screen name="Nutrition" component={NutritionScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="BookConsultation" component={BookConsultationScreen} />
    </Stack.Navigator>
  );
}

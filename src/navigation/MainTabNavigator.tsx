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
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="HeartRate" component={HeartRateSensorScreen} />
      <Stack.Screen name="Scanner" component={MedicationScannerScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabNavigator() {
  const dispatch = useDispatch();
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Demander les permissions notifications au démarrage
    NotificationService.requestPermissions();

    const loadProfileData = async () => {
      if (!user || !activeProfileId) return;
      try {
        dispatch(clearProfile());
        const dbRef = ref(db);

        // Charge le dossier médical
        const snapshot = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}/medicalRecord`));
        if (snapshot.exists()) {
          dispatch(updateProfile(snapshot.val()));
        }

        // Charge le nom du profil (crucial pour le check isProfileIncomplete)
        const profileSnap = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}`));
        if (profileSnap.exists()) {
          dispatch(updateProfile({ name: profileSnap.val().name || '' }));
        }
      } catch (error) {
        console.error("Erreur chargement profil global:", error);
      }
    };

    loadProfileData();
  }, [user, activeProfileId, dispatch]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B0B0D',
          borderTopColor: '#262626',
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#A3A3A3',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Chat') iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          else if (route.name === 'Triage') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Timeline') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Family') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Dr. IA' }} />
      <Tab.Screen name="Triage" component={TriageScreen} options={{ tabBarLabel: 'Urgences' }} />
      <Tab.Screen name="Timeline" component={MedicalTimelineScreen} options={{ tabBarLabel: 'Timeline' }} />
      <Tab.Screen name="Family" component={FamilyScreen} options={{ tabBarLabel: 'Famille' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

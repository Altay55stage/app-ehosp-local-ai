import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { db, ref, get, child } from '../../services/FirebaseService';
import { Ionicons } from '@expo/vector-icons';

interface TimelineEvent {
  id: string;
  type: 'consultation' | 'triage' | 'medication' | 'onboarding';
  title: string;
  subtitle: string;
  timestamp: number;
  data?: any;
}

export default function MedicalTimelineScreen() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchTimeline();
  }, [activeProfileId]);

  const fetchTimeline = async () => {
    if (!user || !activeProfileId) return;
    setLoading(true);
    try {
      const dbRef = ref(db);
      const profilePath = `users/${user.uid}/profiles/${activeProfileId}`;
      
      const timelineEvents: TimelineEvent[] = [];

      // 1. Fetch Consultations (Sessions)
      const sessionsSnap = await get(child(dbRef, `${profilePath}/sessions`));
      if (sessionsSnap.exists()) {
        Object.values(sessionsSnap.val()).forEach((session: any) => {
          if (session.metadata) {
            timelineEvents.push({
              id: session.metadata.id,
              type: 'consultation',
              title: 'Consultation Dr. IA',
              subtitle: session.metadata.title || 'Analyse médicale',
              timestamp: session.metadata.timestamp,
            });
          }
        });
      }

      // 2. Fetch Triage results (si stockés, sinon on simule ou on attend la prochaine étape)
      // Note: On pourrait ajouter une branche 'triage' dans Firebase lors du calcul du score

      // 3. Onboarding
      const onboardingSnap = await get(child(dbRef, `users/${user.uid}/onboarding/questionnaire`));
      if (onboardingSnap.exists()) {
        timelineEvents.push({
          id: 'onboarding',
          type: 'onboarding',
          title: 'Calibration Initiale',
          subtitle: 'Questionnaire de santé complété',
          timestamp: onboardingSnap.val().completedAt,
        });
      }

      // Sort by timestamp desc
      timelineEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(timelineEvents);
    } catch (e) {
      console.error("Timeline error:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Ionicons name="chatbubble-ellipses" size={20} color="#0EA5E9" />;
      case 'medication': return <Ionicons name="medical" size={20} color="#FFFFFF" />;
      case 'triage': return <Ionicons name="alert-circle" size={20} color="#EF4444" />;
      case 'onboarding': return <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />;
      default: return <Ionicons name="calendar" size={20} color="#94A3B8" />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="px-6 pt-6 pb-4">
        <Text className="text-white text-3xl font-black">Timeline</Text>
        <Text className="text-slate-400 mt-1">Historique interactif de votre santé</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#0EA5E9" />
        </View>
      ) : events.length === 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <Text className="text-slate-500 text-center italic">Aucun événement médical enregistré pour le moment.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 mt-4">
          {events.map((event, index) => (
            <View key={event.id} className="flex-row">
              {/* Ligne de la timeline */}
              <View className="items-center mr-4">
                <View className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center z-10">
                  {renderIcon(event.type)}
                </View>
                {index !== events.length - 1 && (
                  <View className="w-0.5 flex-1 bg-white/10 my-1" />
                )}
              </View>

              {/* Card de l'événement */}
              <TouchableOpacity 
                className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-5 mb-6"
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-slate-500 text-xs font-bold">
                    {new Date(event.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                    <Text className="text-primary text-[10px] font-bold uppercase">{event.type}</Text>
                  </View>
                </View>
                <Text className="text-white font-bold text-lg">{event.title}</Text>
                <Text className="text-slate-400 text-sm mt-1 leading-5">{event.subtitle}</Text>
                
                <View className="flex-row items-center mt-4">
                  <Text className="text-primary text-xs font-semibold">Voir les détails</Text>
                  <Ionicons name="chevron-forward" size={12} color="#0EA5E9" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

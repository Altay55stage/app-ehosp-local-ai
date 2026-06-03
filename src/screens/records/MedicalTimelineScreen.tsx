import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { db, ref, get, child } from '../../services/FirebaseService';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../../components/ui/Skeleton';
import { Colors, Typography, Shadows } from '../../theme';

interface TimelineEvent {
  id: string;
  type: 'consultation' | 'triage' | 'medication' | 'onboarding';
  title: string;
  subtitle: string;
  timestamp: number;
  data?: any;
}

export default function MedicalTimelineScreen({ navigation }: any) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

      timelineEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(timelineEvents);
    } catch (e) {
      console.error("Timeline error:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimeline();
    setRefreshing(false);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Ionicons name="chatbubble-ellipses" size={20} color={Colors.info} />;
      case 'medication': return <Ionicons name="medical" size={20} color={Colors.primary} />;
      case 'triage': return <Ionicons name="alert-circle" size={20} color={Colors.error} />;
      case 'onboarding': return <Ionicons name="shield-checkmark" size={20} color={Colors.warning} />;
      default: return <Ionicons name="calendar" size={20} color={Colors.textMuted} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return Colors.info;
      case 'medication': return Colors.primary;
      case 'triage': return Colors.error;
      case 'onboarding': return Colors.warning;
      default: return Colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark }}>
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text style={[Typography.h1, { color: '#FFFFFF' }]}>Timeline</Text>
          <Text style={[Typography.caption, { marginTop: 4 }]}>Historique interactif de votre santé</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-6 mt-4"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View>
            {[1, 2, 3].map((i) => (
              <View key={i} className="flex-row mb-6">
                <View className="items-center mr-4">
                  <Skeleton width={40} height={40} borderRadius={20} />
                  {i < 3 && <Skeleton width={2} height={60} style={{ marginTop: 8 }} />}
                </View>
                <View className="flex-1 rounded-3xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <Skeleton width={100} height={12} style={{ marginBottom: 8 }} />
                  <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
                  <Skeleton width="60%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : events.length === 0 ? (
          <View className="items-center justify-center px-10" style={{ marginTop: 80 }}>
            <View 
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={[Typography.h3, { color: '#FFFFFF', textAlign: 'center', marginBottom: 8 }]}>
              Aucun événement
            </Text>
            <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }]}>
              Vos consultations et analyses apparaîtront ici une fois complétées.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Chat')}
              className="rounded-2xl px-6 py-3"
              style={{ backgroundColor: Colors.primary }}
              accessibilityRole="button"
              accessibilityLabel="Commencer une consultation"
            >
              <Text style={[Typography.button, { color: '#FFFFFF' }]}>Commencer une consultation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {events.map((event, index) => (
              <TouchableOpacity 
                key={event.id} 
                className="flex-row"
                activeOpacity={0.7}
                onPress={() => {
                  // Navigation future vers les détails
                }}
                accessibilityRole="button"
                accessibilityLabel={`Détails de ${event.title}`}
              >
                <View className="items-center mr-4">
                  <View 
                    className="w-10 h-10 rounded-full items-center justify-center z-10"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {renderIcon(event.type)}
                  </View>
                  {index !== events.length - 1 && (
                    <View style={{ width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 }} />
                  )}
                </View>

                <View 
                  className="flex-1 rounded-3xl p-5 mb-6"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text style={[Typography.caption, { color: '#94A3B8' }]}>
                      {new Date(event.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: getTypeColor(event.type) + '20' }}>
                      <Text style={[Typography.caption, { color: getTypeColor(event.type), textTransform: 'uppercase', fontSize: 10 }]}>
                        {event.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={[Typography.h3, { color: '#FFFFFF' }]}>{event.title}</Text>
                  <Text style={[Typography.body, { color: '#94A3B8', marginTop: 4 }]}>{event.subtitle}</Text>
                  
                  <View className="flex-row items-center mt-4">
                    <Text style={[Typography.caption, { color: Colors.primary }]}>Voir les détails</Text>
                    <Ionicons name="chevron-forward" size={12} color={Colors.primary} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

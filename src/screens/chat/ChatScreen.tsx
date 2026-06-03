import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ScrollView, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addMessage, setLoading, setUrgencyScore, clearMessages, setSessions, setActiveSessionId, addSession } from '../../store/slices/chatSlice';
import { AgentOrchestrator } from '../../ai/AgentOrchestrator';
import MessageBubble from '../../components/chat/MessageBubble';
import UrgencyScore from '../../components/chat/UrgencyScore';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { db, ref, get, set, child } from '../../services/FirebaseService';

const specialists = [
  "👨‍⚕️ Généraliste", "🫀 Cardiologie", "🧴 Dermatologie", "🧬 Généticien", "🧠 Psychiatrie",
  "👶 Pédiatrie", "🦴 Rhumatologie", "🦠 Infectiologie", "🌴 Médecine Tropicale",
  "👁️ Ophtalmologie", "🦷 Dentaire", "👂 ORL", "🤰 Gynécologie", "🩺 Pneumologie",
  "🩸 Hématologie", "⚕️ Oncologie", "🚑 Urgences", "🥗 Nutrition", "🧪 Endocrinologie",
  "💤 Médecine du Sommeil", "☢️ Radiologie"
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [activeAgentOverride, setActiveAgentOverride] = useState<string | undefined>();
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  
  const { messages, loading, currentUrgencyScore, sessions, activeSessionId } = useSelector((state: RootState) => state.chat);
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.health.profile);
  const dispatch = useDispatch();

  const isProfileIncomplete = !profile.name || !profile.age || !profile.gender || !profile.birthCountry || !profile.currentCountry;

  interface LocalMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: number;
    imageBase64?: string;
    imageUrl?: string;
  }

  useEffect(() => {
    loadSessions();
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [activeProfileId]);

  useEffect(() => {
    if (activeSessionId) {
      loadChatHistory(activeSessionId);
    } else {
      dispatch(clearMessages());
    }
  }, [activeSessionId]);

  const loadSessions = async () => {
    if (!user || !activeProfileId) return;
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}/sessions`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedSessions = Object.values(data).map((s: any) => s.metadata).filter(Boolean);
        loadedSessions.sort((a: any, b: any) => b.timestamp - a.timestamp); // Descending (newest first)
        dispatch(setSessions(loadedSessions as any));
        
        if (loadedSessions.length > 0) {
          dispatch(setActiveSessionId(loadedSessions[0].id));
        } else {
          startNewSession();
        }
      } else {
        dispatch(setSessions([]));
        startNewSession();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startNewSession = () => {
    const newSessionId = Date.now().toString();
    dispatch(setActiveSessionId(newSessionId));
    dispatch(clearMessages());
    setIsHistoryModalVisible(false);
  };

  const loadChatHistory = async (sessionId: string) => {
    if (!user || !activeProfileId) return;
    try {
      dispatch(clearMessages());
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}/profiles/${activeProfileId}/sessions/${sessionId}/messages`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedMessages = Object.values(data).sort((a: any, b: any) => a.timestamp - b.timestamp);
        loadedMessages.forEach((msg: any) => {
          dispatch(addMessage(msg));
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveMessageToFirebase = async (msg: any, titleHint?: string) => {
    if (!user || !activeProfileId || !activeSessionId) return;
    try {
      // Create session metadata if it's the first message
      if (messages.length === 0 && msg.isUser) {
        const metadata = {
          id: activeSessionId,
          title: titleHint || msg.text.substring(0, 30) + '...',
          timestamp: Date.now()
        };
        await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/sessions/${activeSessionId}/metadata`), metadata);
        dispatch(addSession(metadata));
      }

      const dbMsg = {
        ...msg,
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp || Date.now()
      };
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/sessions/${activeSessionId}/messages/${msg.id}`), dbMsg);
    } catch (e) {
      console.error("Erreur sauvegarde message", e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isProfileIncomplete || !activeSessionId) return;
    if (!user || !activeProfileId) {
      Alert.alert("Session invalide", "Reconnectez-vous et re-selectionnez un profil.");
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: Date.now(),
    };

    dispatch(addMessage(userMsg));
    saveMessageToFirebase(userMsg, inputText);
    setInputText('');
    dispatch(setLoading(true));

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await AgentOrchestrator.processMessage(
        userMsg.text, 
        history, 
        profile, 
        activeAgentOverride,
        user.uid,
        activeProfileId
      );

      dispatch(setUrgencyScore(response.urgencyScore));
      
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        isUser: false,
        timestamp: Date.now(),
        agent: response.agent,
        urgencyScore: response.urgencyScore,
        xaiExplanation: response.xaiExplanation,
        sources: response.sources,
        isStreaming: true, // Active l'animation lettre par lettre
      };
      dispatch(addMessage(aiMsg));
      saveMessageToFirebase(aiMsg);

      // Alerte urgence critique
      if (response.urgencyScore >= 8) {
        const country = profile.currentCountry || 'France';
        const emergencyNumbers: Record<string, string> = {
          'France': '15', 'Belgique': '112', 'Suisse': '144',
          'Canada': '911', '\u00c9tats-Unis': '911', 'Royaume-Uni': '999',
        };
        const num = emergencyNumbers[country] || '112';
        Alert.alert(
          '🚨 Urgence Détectée',
          `Score d'urgence élevé (${response.urgencyScore}/10). Voulez-vous appeler le ${num} ?`,
          [
            { text: 'Non, continuer', style: 'cancel' },
            { text: `📞 Appeler le ${num}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${num}`) },
          ]
        );
      }

      if (response.recommendedSpecialist && specialists.includes(response.recommendedSpecialist)) {
        setActiveAgentOverride(response.recommendedSpecialist);
        
        const systemMsg = {
          id: (Date.now() + 2).toString(),
          text: `🔄 Le Généraliste a évalué vos symptômes et vous a transféré vers : ${response.recommendedSpecialist}`,
          isUser: false,
          timestamp: Date.now() + 1,
          agent: "Système de Triage",
          urgencyScore: response.urgencyScore
        };
        dispatch(addMessage(systemMsg));
        saveMessageToFirebase(systemMsg);
      }

    } catch (error) {
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const startRecording = async () => {
    if (isProfileIncomplete) return;
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      setRecording(undefined);
      setInputText("J'ai une forte douleur dans la poitrine depuis ce matin.");
    } catch (error) {}
  };

  const pickImage = async () => {
    if (isProfileIncomplete || !activeSessionId) return;

    // Affiche le choix : Caméra ou Galerie
    Alert.alert(
      "Ajouter une image médicale",
      "Choisissez la source de votre image :",
      [
        {
          text: "📷 Prendre une photo",
          onPress: () => launchImageSource('camera'),
        },
        {
          text: "🖼️ Choisir depuis la galerie",
          onPress: () => launchImageSource('gallery'),
        },
        { text: "Annuler", style: "cancel" },
      ]
    );
  };

  const launchImageSource = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5 as const,
        base64: true,
      };

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission refusée", "Autorisez l'accès à la caméra dans les Réglages.");
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        const userMsg: LocalMessage = {
          id: Date.now().toString(),
          text: "Pouvez-vous analyser cette image médicale ?",
          isUser: true,
          timestamp: Date.now(),
          imageBase64: asset.base64 || undefined,
          imageUrl: asset.uri
        };

        dispatch(addMessage(userMsg));
        saveMessageToFirebase(userMsg, "Analyse Image Visuelle");
        processImageWithAI(userMsg);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger l'image.");
    }
  };

  const processImageWithAI = async (userMsg: LocalMessage) => {
    dispatch(setLoading(true));
    try {
      const history = messages.slice(-5).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text
      }));

      // On passe le message en entier (qui contient imageBase64) à l'orchestrateur
      const response = await AgentOrchestrator.processMessage(
        userMsg, 
        history, 
        profile, 
        activeAgentOverride,
        user?.uid,
        activeProfileId ?? undefined
      );

      dispatch(setUrgencyScore(response.urgencyScore));
      
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        isUser: false,
        timestamp: Date.now(),
        agent: response.agent,
        urgencyScore: response.urgencyScore,
        xaiExplanation: response.xaiExplanation,
        sources: response.sources,
      };
      dispatch(addMessage(aiMsg));
      saveMessageToFirebase(aiMsg);

      if (response.recommendedSpecialist && specialists.includes(response.recommendedSpecialist)) {
        setActiveAgentOverride(response.recommendedSpecialist);
        const systemMsg = {
          id: (Date.now() + 2).toString(),
          text: `🔄 Le système a évalué l'image et vous a transféré vers : ${response.recommendedSpecialist}`,
          isUser: false,
          timestamp: Date.now() + 1,
          agent: "Système de Triage",
          urgencyScore: response.urgencyScore
        };
        dispatch(addMessage(systemMsg));
        saveMessageToFirebase(systemMsg);
      }
    } catch (error) {
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="p-4 border-b border-white/10 flex-row justify-between items-center bg-dark">
          <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} className="bg-white/10 px-3 py-2 rounded-lg flex-row items-center">
            <Text className="text-white text-xs mr-2">☰ Historique</Text>
          </TouchableOpacity>
          <Text className="text-xl text-white font-bold ml-4">Dr. IA</Text>
          <View className="flex-1 items-end">
            <Text className="text-secondary text-xs">{profile.name ? `Patient: ${profile.name}` : ''}</Text>
          </View>
        </View>

        <View className="border-b border-white/5 bg-dark">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 px-2">
            {specialists.map((spec, i) => {
              const isActive = activeAgentOverride === spec || (!activeAgentOverride && spec.includes("Généraliste"));
              return (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setActiveAgentOverride(spec)}
                  className={`border px-3 py-1 rounded-full mr-2 ${isActive ? 'bg-secondary/20 border-secondary' : 'bg-white/5 border-white/10'}`}
                >
                  <Text className={`text-xs ${isActive ? 'text-secondary font-bold' : 'text-slate-300'}`}>{spec}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Bandeau urgence critique */}
        {currentUrgencyScore >= 8 && (
          <TouchableOpacity
            onPress={() => {
              const country = profile.currentCountry || 'France';
              const nums: Record<string, string> = { 'France': '15', 'Belgique': '112', 'Suisse': '144', 'Canada': '911' };
              Linking.openURL(`tel:${nums[country] || '112'}`);
            }}
            className="mx-4 mb-2 bg-red-600 rounded-xl p-3 flex-row items-center justify-center border border-red-400"
          >
            <Text className="text-white font-black text-base">📞 Appeler le 15 — Urgence Détectée</Text>
          </TouchableOpacity>
        )}

        <FlatList
          className="flex-1 px-4"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListHeaderComponent={() => <UrgencyScore score={currentUrgencyScore} />}
          contentContainerStyle={{ paddingVertical: 16 }}
        />

        {isProfileIncomplete ? (
          <View className="p-4 bg-urgent/20 border border-urgent m-4 rounded-xl">
            <Text className="text-white text-center font-bold mb-2">⚠️ Profil Médical Incomplet</Text>
            <Text className="text-slate-300 text-center text-sm">Par mesure de sécurité, le diagnostic IA nécessite de connaître votre âge, sexe, et géographie. Veuillez remplir votre profil.</Text>
          </View>
        ) : (
          <View className="p-4 flex-row items-center border-t border-white/10 bg-dark">
            <TouchableOpacity 
              onPress={pickImage}
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-2"
            >
              <Text className="text-white text-lg">📷</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isRecording ? 'bg-urgent' : 'bg-white/10'}`}
            >
              <Text className="text-white text-lg">🎙️</Text>
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-white/10 text-white rounded-2xl px-4 py-3 mr-3"
              placeholder={isRecording ? "Enregistrement..." : "Décrivez vos symptômes..."}
              placeholderTextColor="#64748B"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isRecording}
            />
            <TouchableOpacity 
              onPress={sendMessage}
              disabled={loading || isRecording}
              className="w-12 h-12 bg-primary rounded-full items-center justify-center"
            >
              <Text className="text-slate-950 font-bold">{loading ? "..." : "↑"}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={isHistoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsHistoryModalVisible(false)}
        >
          <View className="flex-1 bg-black/80 flex-row">
            <View className="flex-1" />
            <View className="w-4/5 bg-dark h-full border-l border-white/10 pt-12 px-4 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl text-white font-bold">Consultations</Text>
                <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
                  <Text className="text-slate-400 font-bold text-lg">X</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={startNewSession}
                className="bg-primary/20 border border-primary p-4 rounded-xl mb-6 items-center"
              >
                <Text className="text-primary font-bold">+ Nouvelle Consultation</Text>
              </TouchableOpacity>

              <FlatList
                data={sessions}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    className={`p-4 rounded-xl mb-2 border ${item.id === activeSessionId ? 'border-secondary bg-secondary/10' : 'border-white/5 bg-white/5'}`}
                    onPress={() => {
                      dispatch(setActiveSessionId(item.id));
                      setIsHistoryModalVisible(false);
                    }}
                  >
                    <Text className="text-white font-semibold" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-slate-500 text-xs mt-1">{new Date(item.timestamp).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text className="text-slate-500 text-center mt-10">Aucun historique.</Text>}
              />
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

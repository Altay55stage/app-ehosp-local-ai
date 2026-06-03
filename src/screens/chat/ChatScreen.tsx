import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ScrollView, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addMessage, updateMessage, setLoading, setUrgencyScore, clearMessages, setSessions, setActiveSessionId, addSession, deleteSession } from '../../store/slices/chatSlice';
import { AgentOrchestrator } from '../../ai/AgentOrchestrator';
import MessageBubble from '../../components/chat/MessageBubble';
import UrgencyScore from '../../components/chat/UrgencyScore';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { db, ref, get, set, child } from '../../services/FirebaseService';
import * as DocumentPicker from 'expo-document-picker';
import { PDFService } from '../../services/PDFService';
import { Ionicons } from '@expo/vector-icons';


const specialists = [
  "👨‍⚕️ Généraliste", "🫀 Cardiologie", "🧴 Dermatologie", "🧬 Généticien", "🧠 Neurologie",
  "🧠 Psychiatrie", "👶 Pédiatrie", "🦴 Rhumatologie", "🦠 Infectiologie", "🌴 Médecine Tropicale",
  "👁️ Ophtalmologie", "🦷 Dentaire", "👂 ORL", "🤰 Gynécologie", "🩺 Pneumologie",
  "🩸 Hématologie", "⚕️ Oncologie", "🚑 Urgences", "🥗 Nutrition", "🧪 Endocrinologie",
  "💤 Médecine du Sommeil", "☢️ Radiologie", "🦴 Orthopédie"
];

export default function ChatScreen({ navigation }: any) {
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [activeAgentOverride, setActiveAgentOverride] = useState<string | null>(null);

  const resetToGeneralist = () => {
    setActiveAgentOverride(null);
    Alert.alert("Retour au Généraliste", "Vous parlez de nouveau avec le Dr. IA Généraliste.");
  };

  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  
  const { messages, loading, currentUrgencyScore, sessions, activeSessionId } = useSelector((state: RootState) => state.chat);
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.health.profile);
  const dispatch = useDispatch();

  // Minimum vital pour un diagnostic IA sécurisé
  const isProfileIncomplete = !profile.name || !profile.birthDate || !profile.gender || !profile.birthCountry || !profile.currentCountry;

  interface LocalMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: number;
    imageBase64?: string;
    imageUrl?: string;
  }

  useEffect(() => {
    loadSessions().then(() => {
      if (!activeSessionId) {
        startNewSession();
      }
    });
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
          // On charge la liste mais on ne l'active pas par défaut
          // dispatch(setActiveSessionId(loadedSessions[0].id)); 
          startNewSession();
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
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    dispatch(setActiveSessionId(newSessionId));
    dispatch(clearMessages());
    setIsHistoryModalVisible(false);
  };

  const deleteConsultation = (sessionId: string) => {
    Alert.alert(
      "Supprimer la consultation",
      "Voulez-vous vraiment supprimer définitivement cet historique ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            try {
              await set(ref(db, `users/${user!.uid}/profiles/${activeProfileId}/sessions/${sessionId}`), null);
              dispatch(deleteSession(sessionId));
              if (activeSessionId === sessionId) {
                startNewSession();
              }
            } catch (e) {
              Alert.alert("Erreur", "Impossible de supprimer la session.");
            }
          } 
        }
      ]
    );
  };



  const saveMessageToFirebase = async (msg: any, titleHint?: string, forcedSessionId?: string) => {
    const sessionId = forcedSessionId || activeSessionId;
    if (!user || !activeProfileId || !sessionId) return;
    
    try {
      // SÉCURITÉ : On ne crée les métadonnées QUE si la session n'existe pas déjà dans notre liste
      const sessionExists = sessions.some(s => s.id === sessionId);
      
      if (!sessionExists && msg.isUser) {
        const metadata = {
          id: sessionId,
          title: titleHint || (msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text),
          timestamp: Date.now()
        };
        await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/sessions/${sessionId}/metadata`), metadata);
        dispatch(addSession(metadata));
      }

      const dbMsg = {
        ...msg,
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
        imageBase64: msg.imageBase64 || null, // On sauve l'image !
        timestamp: msg.timestamp || Date.now()
      };
      
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/sessions/${sessionId}/messages/${msg.id}`), dbMsg);
    } catch (e) {
      console.error("Erreur sauvegarde message", e);
    }
  };

  const loadChatHistory = async (sessionId: string) => {
    dispatch(setLoading(true));
    dispatch(clearMessages());
    dispatch(setActiveSessionId(sessionId));
    
    try {
      const messagesRef = ref(db, `users/${user!.uid}/profiles/${activeProfileId}/sessions/${sessionId}/messages`);
      const snapshot = await get(messagesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const historyArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          isUser: data[key].role === 'user',
          text: data[key].content // On mappe content vers text
        })).sort((a, b) => a.timestamp - b.timestamp);

        historyArray.forEach(msg => dispatch(addMessage(msg)));
      }
    } catch (e) {
      console.error("Erreur chargement historique", e);
    } finally {
      dispatch(setLoading(false));
      setIsHistoryModalVisible(false);
    }
  };

  const openDocumentMenu = () => {
    Alert.alert(
      "Ajouter un document",
      "Choisissez le type de document à envoyer au Dr. IA :",
      [
        { text: "Fichier PDF / Document", onPress: pickDocument },
        { text: "Captures du PDF (Protégé) - Max 5", onPress: pickMultipleScreenshots },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const pickMultipleScreenshots = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        base64: true,
      });

      if (!result.canceled) {
        dispatch(setLoading(true));
        const assets = result.assets;
        
        // SÉCURITÉ : On s'assure d'avoir une session active AVANT la boucle
        let currentSessionId = activeSessionId;
        if (!currentSessionId) {
          const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          currentSessionId = newId;
          
          const metadata = {
            id: newId,
            title: `Consultation du ${new Date().toLocaleDateString()}`,
            timestamp: Date.now()
          };

          // On met à jour Redux et Firebase AVANT la boucle
          dispatch(setActiveSessionId(newId));
          dispatch(addSession(metadata));
          await set(ref(db, `users/${user!.uid}/profiles/${activeProfileId}/sessions/${newId}/metadata`), metadata);
        }

        assets.forEach((asset, index) => {
          const uniqueId = `img-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
          const userMsg = {
            id: uniqueId,
            text: `[CAPTURE PDF] : ${asset.fileName || 'image.jpg'}`,
            isUser: true,
            timestamp: Date.now() + index,
            imageBase64: asset.base64
          };
          dispatch(addMessage(userMsg));
          // On passe l'ID de session forcé pour éviter les doublons de conv
          saveMessageToFirebase(userMsg, undefined, currentSessionId);
        });

        setInputText(`Voici ${assets.length} captures d'écran de mon PDF médical protégé. Peux-tu en faire une analyse complète (OCR) et me donner tes conclusions ?`);
        dispatch(setLoading(false));
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sélectionner les captures.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const doc = result.assets[0];
        
        // On demande si le PDF est protégé
        Alert.prompt(
          "Document Protégé ?",
          "Si ce PDF nécessite un mot de passe pour être ouvert, veuillez le saisir ici. Sinon, laissez vide.",
          [
            {
              text: "Annuler",
              style: "cancel"
            },
            {
              text: "Envoyer",
              onPress: async (password) => {
                dispatch(setLoading(true));
                const extractedText = await PDFService.extractText(doc.uri);
                
                const userMsg = {
                  id: Date.now().toString(),
                  text: `[DOCUMENT] : ${doc.name}${password ? ' (Déverrouillé)' : ''}`,
                  isUser: true,
                  timestamp: Date.now(),
                  metadata: {
                    fileName: doc.name,
                    content: extractedText, // Voici le vrai contenu !
                    password: password || null
                  }
                };
                dispatch(addMessage(userMsg));
                saveMessageToFirebase(userMsg);
                
                setInputText(`ANALYSE COMPLÈTE DE DOCUMENT VOLUMINEUX (40+ pages possibles) : "${doc.name}". Voici l'intégralité du contenu extrait : \n\n${extractedText.substring(0, 15000)}\n\n[FIN DU DOCUMENT]`);
                dispatch(setLoading(false));
              }
            }
          ],
          'secure-text'
        );
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de lire le document.');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeSessionId) return;
    if (!user || !activeProfileId) {
      Alert.alert("Session invalide", "Reconnectez-vous et re-selectionnez un profil.");
      return;
    }
    // QOTA GRATUIT (Freemium logic)
    const currentSubscription = user?.subscription || 'free'; 
    const FREE_LIMIT = 5;
    
    const isAllFree = process.env.EXPO_PUBLIC_ALL_FREE === 'true';
    if (!isAllFree && currentSubscription === 'free' && messages.filter(m => m.isUser).length >= FREE_LIMIT) {
      Alert.alert(
        "🏥 Quota Atteint",
        "L'Intelligence Médicale eHosp 5.0 nécessite d'énormes ressources pour fonctionner localement sur votre appareil. Vous avez atteint votre limite gratuite.\n\nPassez au Premium pour continuer à consulter le Dr. IA en illimité.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "⭐ Passer au Premium", onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }
    const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const userMsg = {
      id: generateId(),
      text: inputText,
      isUser: true,
      timestamp: Date.now(),
    };

    dispatch(addMessage(userMsg));
    saveMessageToFirebase(userMsg, inputText);
    setInputText('');
    dispatch(setLoading(true));

    try {
      // On récupère les images des messages récents (les 5 derniers) pour les joindre au message actuel
      const recentImages = messages
        .slice(-5)
        .filter(m => m.imageBase64)
        .map(m => m.imageBase64!);

      const history = messages.slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text
      }));

      const aiMsgId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const aiMsg = {
        id: aiMsgId,
        text: "...",
        isUser: false,
        timestamp: Date.now(),
        agent: activeAgentOverride || "👨‍⚕️ Généraliste",
        isStreaming: true,
      };
      dispatch(addMessage(aiMsg));

      // On joint les images au message de texte pour forcer la vision de l'IA
      const payload = recentImages.length > 0 
        ? { text: userMsg.text, images: recentImages } 
        : userMsg.text;

      const response = await AgentOrchestrator.processMessageStreaming(
        payload, 
        history, 
        profile, 
        activeAgentOverride,
        user.uid,
        activeProfileId,
        currentUrgencyScore,
        (partialText) => {
          dispatch(updateMessage({ id: aiMsgId, text: partialText }));
        }
      );

      dispatch(setUrgencyScore(response.urgencyScore));
      
      // Update with final parsed data
      dispatch(updateMessage({ 
        id: aiMsgId, 
        text: response.text,
        isStreaming: false // Désactive l'animation pour ce message
      } as any));
      
      // On met à jour les métadonnées (agent, score, etc.) dans une version plus propre si besoin
      // Mais ici on ré-ajoute les champs manquants au message existant via une astuce ou on le remplace
      // Pour faire simple, on garde le message et on sauve en Firebase avec les vraies data
      saveMessageToFirebase({
        ...aiMsg,
        text: response.text,
        agent: response.agent,
        urgencyScore: response.urgencyScore,
        xaiExplanation: response.xaiExplanation,
        sources: response.sources,
        isStreaming: false // Sauvegarde comme terminé
      });

      if (response.urgencyScore >= 8) {
        const country = profile.currentCountry || 'France';
        const emergencyNumbers: Record<string, string> = {
          'France': '15', 'Belgique': '112', 'Suisse': '144',
          'Canada': '911', 'États-Unis': '911', 'Royaume-Uni': '999',
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

      if (response.recommendedSpecialist) {
        const foundSpecialist = specialists.find(s => 
          s.toLowerCase().includes(response.recommendedSpecialist!.toLowerCase()) ||
          response.recommendedSpecialist!.toLowerCase().includes(s.toLowerCase().replace(/[^\w\s]/g, '').trim())
        );

          if (foundSpecialist && foundSpecialist !== activeAgentOverride) {
            setActiveAgentOverride(foundSpecialist);
            const systemMsg = {
              id: `sys-${Date.now()}`,
              text: `🔄 Transfert vers le spécialiste : ${foundSpecialist}. (Analyse approfondie en cours...)`,
              isUser: false,
              timestamp: Date.now(),
              agent: "Système de Triage"
            };
            dispatch(addMessage(systemMsg));
            saveMessageToFirebase(systemMsg);

            // AUTO-RÉPONSE DU SPÉCIALISTE (AVEC IMAGES)
            setTimeout(async () => {
              const specialistTriggerMsg = `En tant qu'expert en ${foundSpecialist}, j'ai repris votre dossier. Voici mon analyse spécialisée de vos derniers documents et les points critiques que je relève :`;
              
              // On récupère les images pour que l'expert puisse les VOIR aussi !
              const recentImagesForSpec = messages.slice(-5).filter(m => m.imageBase64).map(m => m.imageBase64!);
              
              dispatch(setLoading(true));
              
              try {
                // On prépare un historique qui contient aussi les images pour une vision totale
                const fullHistoryForSpec = messages.slice(-10).map(m => {
                  if (m.imageBase64) return { role: m.isUser ? 'user' : 'assistant', content: { text: m.text, imageBase64: m.imageBase64 } };
                  return { role: m.isUser ? 'user' : 'assistant', content: m.text };
                });

                const specResponse = await AgentOrchestrator.processMessageStreaming(
                  { text: specialistTriggerMsg, images: recentImagesForSpec }, // <--- ON LUI DONNE LA VUE !
                  fullHistoryForSpec,
                  profile,
                  foundSpecialist,
                  user.uid,
                  activeProfileId,
                  response.urgencyScore,
                  (token) => {}
                );

                const finalSpecMsg = {
                  id: `ai-spec-${Date.now()}`,
                  text: specResponse.text,
                  isUser: false,
                  timestamp: Date.now(),
                  agent: foundSpecialist,
                  xaiExplanation: specResponse.xaiExplanation,
                  sources: specResponse.sources
                };
                dispatch(addMessage(finalSpecMsg));
                saveMessageToFirebase(finalSpecMsg);
              } catch (e) {
                console.error("Auto-specialist error:", e);
              } finally {
                dispatch(setLoading(false));
              }
            }, 1000);
          }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="p-4 border-b border-white/5 flex-row justify-between items-center bg-transparent">
          <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl flex-row items-center">
            <Text className="text-white text-xs mr-2">☰ Historique</Text>
          </TouchableOpacity>
          <Text className="text-xl text-white font-black tracking-tight ml-4">Dr. IA</Text>
          <View className="flex-1 items-end">
            <Text className="text-primary text-xs font-bold">{profile.name ? `${profile.name}` : ''}</Text>
          </View>
        </View>

        <View className="border-b border-white/5 bg-transparent">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-3 px-2">
            {specialists.map((spec, i) => {
              const isActive = activeAgentOverride === spec || (!activeAgentOverride && spec.includes("Généraliste"));
              return (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setActiveAgentOverride(spec)}
                  className={`border px-4 py-1.5 rounded-full mr-2 ${isActive ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/10'}`}
                >
                  <Text className={`text-xs ${isActive ? 'text-primary font-black' : 'text-slate-400 font-medium'}`}>{spec}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Bandeau profil incomplet */}
        {isProfileIncomplete && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            className="mx-4 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex-row items-center"
          >
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text className="text-amber-500 text-xs ml-2 flex-1 font-medium">
              Profil incomplet. Cliquez ici pour finaliser votre dossier (âge, poids...) pour un meilleur diagnostic.
            </Text>
          </TouchableOpacity>
        )}

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
            <Text className="text-slate-300 text-center text-sm">
              Pour votre sécurité, le Dr. IA a besoin de connaître votre sexe, date de naissance et pays de résidence pour établir un diagnostic précis.
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              className="mt-4 bg-primary p-3 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Compléter mon profil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="p-4 flex-row items-center border-t border-white/5 bg-transparent pb-6">
            <TouchableOpacity 
              onPress={openDocumentMenu}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center mr-2 shadow-sm"
            >
              <Ionicons name="document-attach" size={18} color="#0EA5E9" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={pickImage}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center mr-2 shadow-sm"
            >
              <Ionicons name="camera" size={18} color="#0EA5E9" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('VoiceConsultation')}
              className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-primary/20 border border-primary/30 shadow-sm"
            >
              <Ionicons name="mic" size={20} color="#0EA5E9" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 mr-3 shadow-sm"
              placeholder={isRecording ? "Enregistrement..." : "Saisissez un message..."}
              placeholderTextColor="#64748B"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isRecording}
            />
            <TouchableOpacity 
              onPress={sendMessage}
              disabled={loading || isRecording}
              className="w-12 h-12 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/30"
            >
              {loading ? (
                <Text className="text-white font-bold text-xs">...</Text>
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
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
                data={Array.from(new Map(sessions.map(s => [s.id, s])).values())}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View className="flex-row items-center mb-2">
                    <TouchableOpacity 
                      className={`flex-1 p-4 rounded-xl border ${item.id === activeSessionId ? 'border-secondary bg-secondary/10' : 'border-white/5 bg-white/5'}`}
                      onPress={() => {
                        dispatch(setActiveSessionId(item.id));
                        setIsHistoryModalVisible(false);
                      }}
                    >
                      <Text className="text-white font-semibold" numberOfLines={1}>{item.title}</Text>
                      <Text className="text-slate-500 text-xs mt-1">{new Date(item.timestamp).toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => deleteConsultation(item.id)}
                      className="ml-2 w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl items-center justify-center"
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
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

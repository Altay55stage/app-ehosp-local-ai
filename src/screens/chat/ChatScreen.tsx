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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface }}>
          <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: Colors.textPrimary, fontSize: 12, fontWeight: '600' }}>☰ Historique</Text>
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: Colors.textPrimary, fontWeight: '700' }]}>Dr. IA</Text>
          <View style={{ flex: 1, alignItems: 'end' }}>
            {activeAgentOverride ? (
              <TouchableOpacity onPress={resetToGeneralist} style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>← Généraliste</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>{profile.name ? `${profile.name}` : ''}</Text>
            )}
          </View>
        </View>

        {/* Specialists Scrollbar */}
        <View style={{ borderBottomWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
              {specialists.map((spec, i) => {
                const isActive = activeAgentOverride === spec || (!activeAgentOverride && spec.includes("Généraliste"));
                return (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => setActiveAgentOverride(spec)}
                    style={{
                      borderWidth: 1,
                      borderColor: isActive ? Colors.primary : Colors.border,
                      backgroundColor: isActive ? Colors.primaryLight : Colors.background,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 99,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: isActive ? Colors.primary : Colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    }}>{spec}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Incomplete profile warning */}
        {isProfileIncomplete && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: Colors.warning + '10',
              borderWidth: 1,
              borderColor: Colors.warning + '30',
              borderRadius: 16,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            <Text style={{ color: Colors.warning, fontSize: 12, marginLeft: 8, flex: 1, fontWeight: '500' }}>
              Profil incomplet. Cliquez ici pour finaliser votre dossier (âge, poids...) pour un meilleur diagnostic.
            </Text>
          </TouchableOpacity>
        )}

        {/* Urgency critical banner */}
        {currentUrgencyScore >= 8 && (
          <TouchableOpacity
            onPress={() => {
              const country = profile.currentCountry || 'France';
              const nums: Record<string, string> = { 'France': '15', 'Belgique': '112', 'Suisse': '144', 'Canada': '911' };
              Linking.openURL(`tel:${nums[country] || '112'}`);
            }}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: Colors.error,
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.error,
              ...Shadows.primary,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>📞 Appeler le 15 — Urgence Détectée</Text>
          </TouchableOpacity>
        )}

        <FlatList
          style={{ flex: 1, paddingHorizontal: 16 }}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListHeaderComponent={() => <UrgencyScore score={currentUrgencyScore} />}
          contentContainerStyle={{ paddingVertical: 16 }}
        />

        {isProfileIncomplete ? (
          <View style={{ padding: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, margin: 16, borderRadius: 24, ...Shadows.sm }}>
            <Text style={[Typography.h3, { textAlign: 'center', marginBottom: 8, color: Colors.textPrimary }]}>⚠️ Profil Médical Incomplet</Text>
            <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', fontSize: 14 }]}>
              Pour votre sécurité, le Dr. IA a besoin de connaître votre sexe, date de naissance et pays de résidence pour établir un diagnostic précis.
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              style={{
                marginTop: 20,
                backgroundColor: Colors.primary,
                padding: 16,
                borderRadius: 16,
                alignItems: 'center',
                ...Shadows.primary,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Compléter mon profil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingBottom: Platform.OS === 'ios' ? 24 : 12 }}>
            <TouchableOpacity 
              onPress={openDocumentMenu}
              style={{ width: 42, height: 42, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 21, items: 'center', justifyContent: 'center', marginRight: 8, alignItems: 'center' }}
            >
              <Ionicons name="document-attach" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={pickImage}
              style={{ width: 42, height: 42, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 21, items: 'center', justifyContent: 'center', marginRight: 8, alignItems: 'center' }}
            >
              <Ionicons name="camera" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('VoiceConsultation')}
              style={{ width: 42, height: 42, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '20', borderRadius: 21, items: 'center', justifyContent: 'center', marginRight: 12, alignItems: 'center' }}
            >
              <Ionicons name="mic" size={20} color={Colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={{ flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 12, maxHeight: 100, fontSize: 15 }}
              placeholder={isRecording ? "Enregistrement..." : "Saisissez un message..."}
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isRecording}
            />
            <TouchableOpacity 
              onPress={sendMessage}
              disabled={loading || isRecording}
              style={{ width: 44, height: 44, backgroundColor: Colors.primary, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...Shadows.primary }}
            >
              {loading ? (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>...</Text>
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* History Modal Sidebar */}
        <Modal
          visible={isHistoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsHistoryModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' }}>
            <View style={{ flex: 1 }} />
            <View style={{ width: '80%', backgroundColor: Colors.background, height: '100%', borderLeftWidth: 1, borderColor: Colors.border, paddingTop: 50, paddingHorizontal: 16, ...Shadows.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={[Typography.h2, { color: Colors.textPrimary }]}>Consultations</Text>
                <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={startNewSession}
                style={{
                  backgroundColor: Colors.primaryLight,
                  borderWidth: 1.5,
                  borderColor: Colors.primary,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 20,
                  alignItems: 'center',
                  ...Shadows.sm,
                }}
              >
                <Text style={{ color: Colors.primary, fontWeight: '700' }}>+ Nouvelle Consultation</Text>
              </TouchableOpacity>

              <FlatList
                data={Array.from(new Map(sessions.map(s => [s.id, s])).values())}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <TouchableOpacity 
                      style={{
                        flex: 1,
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: item.id === activeSessionId ? Colors.primary : Colors.border,
                        backgroundColor: item.id === activeSessionId ? Colors.primaryLight : Colors.surface,
                        ...Shadows.sm,
                      }}
                      onPress={() => {
                        dispatch(setActiveSessionId(item.id));
                        setIsHistoryModalVisible(false);
                      }}
                    >
                      <Text style={{ color: item.id === activeSessionId ? Colors.primary : Colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4 }}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => deleteConsultation(item.id)}
                      style={{
                        marginLeft: 12,
                        width: 48,
                        height: 48,
                        backgroundColor: Colors.error + '10',
                        borderWidth: 1,
                        borderColor: Colors.error + '20',
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 40 }}>Aucun historique.</Text>}
              />
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

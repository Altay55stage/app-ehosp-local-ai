import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { AzureAIService } from '../../services/AzureAIService';
import { AgentOrchestrator } from '../../ai/AgentOrchestrator';
import { Colors, Typography, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

export default function VoiceConsultationScreen({ navigation }: any) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Prêt pour la consultation');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('fr-FR');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    Audio.requestPermissionsAsync();
    return () => { Speech.stop(); if (recordingRef.current) recordingRef.current.stopAndUnloadAsync(); };
  }, []);

  useEffect(() => {
    if (isListening || isSpeaking) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])).start();
    } else { pulseAnim.stopAnimation(); pulseAnim.setValue(1); }
  }, [isListening, isSpeaking]);

  const handleSpeech = (text: string) => {
    if (!text) return;
    Speech.stop(); setIsSpeaking(true); setStatus('Dr. IA vous répond');
    Speech.speak(text, { language: selectedLanguage, pitch: 1.0, rate: 0.9,
      onStart: () => setIsSpeaking(true),
      onDone: () => { setIsSpeaking(false); setStatus('Consultation en cours'); },
      onStopped: () => setIsSpeaking(false),
      onError: () => { setIsSpeaking(false); setStatus('Erreur audio'); },
    });
  };

  const openSettings = () => {
    Alert.alert("Paramètres Vocaux", "Choisissez la langue du Dr. IA", [
      { text: "Français", onPress: () => setSelectedLanguage('fr-FR') },
      { text: "English", onPress: () => setSelectedLanguage('en-US') },
      { text: "Español", onPress: () => setSelectedLanguage('es-ES') },
      { text: "Annuler", style: "cancel" }
    ]);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert("Erreur", "Microphone requis.");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording; setIsListening(true); setStatus('Je vous écoute...'); Speech.stop();
    } catch {}
  };

  const stopRecordingAndSend = async () => {
    if (!isListening) return;
    setIsListening(false); setStatus('Analyse de votre demande...');
    try {
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      setTimeout(() => handleQuery("J'ai une douleur persistante dans le bas du dos."), 1000);
    } catch { setStatus('Erreur micro'); }
  };

  const handleQuery = async (text: string) => {
    setTranscript(text);
    const systemPrompt = AgentOrchestrator.getTriagePrompt({ weight: '70', height: '175' } as any);
    setStatus('Dr. IA réfléchit...');
    try {
      const response = await AzureAIService.sendMessage([{ role: 'user', content: text }], systemPrompt);
      const parsed = JSON.parse(response); setAiResponse(parsed.reponse); handleSpeech(parsed.reponse);
    } catch { setIsSpeaking(false); setStatus('Erreur de connexion'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 48 }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase', letterSpacing: 2 }]}>Consultation Live</Text>
          <Text style={[Typography.h1, { marginTop: 8, textAlign: 'center' }]}>Dr. IA Vocal</Text>
          <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginTop: 16, borderWidth: 1, borderColor: Colors.primary + '20' }}>
            <Text style={[Typography.caption, { color: Colors.primary }]}>{status}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], opacity: isListening || isSpeaking ? 1 : 0.4 }}>
            <View style={{ width: width * 0.65, height: width * 0.65, backgroundColor: Colors.primaryLight, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary + '40', overflow: 'hidden' }}>
              <LottieView source={{ uri: 'https://assets1.lottiefiles.com/packages/lf20_96bov88m.json' }} autoPlay loop style={{ width: '120%', height: '120%' }} />
            </View>
          </Animated.View>
        </View>

        <View style={{ width: '100%', paddingHorizontal: 32, minHeight: 160 }}>
          {transcript ? (
            <View style={{ backgroundColor: Colors.background, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, ...Shadows.sm }}>
              <Text style={[Typography.caption, { textTransform: 'uppercase', marginBottom: 4 }]}>Vous :</Text>
              <Text style={[Typography.body, { color: Colors.textPrimary, fontStyle: 'italic' }]}>"{transcript}"</Text>
            </View>
          ) : null}
          {aiResponse ? (
            <View style={{ backgroundColor: Colors.primaryLight, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: Colors.primary + '20', ...Shadows.md }}>
              <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase', marginBottom: 4 }]}>Dr. IA :</Text>
              <Text style={[Typography.body, { color: Colors.textPrimary, lineHeight: 24 }]}>{aiResponse}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={[Typography.caption, { textAlign: 'center', fontStyle: 'italic' }]}>Maintenez le micro pour parler</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 48 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, ...Shadows.sm }}
            accessibilityRole="button" accessibilityLabel="Fermer">
            <Ionicons name="close" size={28} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecordingAndSend}
            style={{ width: 96, height: 96, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 8,
              borderColor: isListening ? Colors.error + '30' : Colors.primary + '30',
              backgroundColor: isListening ? Colors.error : Colors.primary, ...Shadows.lg }}
            accessibilityRole="button" accessibilityLabel={isListening ? 'Arrêter' : 'Parler'}>
            <Ionicons name={isListening ? "mic" : "mic-outline"} size={40} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openSettings} style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, ...Shadows.sm }}
            accessibilityRole="button" accessibilityLabel="Paramètres">
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

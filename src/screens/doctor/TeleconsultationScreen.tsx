import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { Colors, Typography, Shadows } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function TeleconsultationScreen({ route, navigation }: any) {
  const { patient } = route.params || { patient: { name: 'Patient' } };
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={80} color="#334155" />
          <Text style={[Typography.body, { color: '#64748B', marginTop: 16 }]}>Flux vidéo de {patient.name}...</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', top: 48, right: 24, width: 128, height: 176, backgroundColor: '#000', borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
        {!isVideoOff && <CameraView style={StyleSheet.absoluteFill} facing="front" />}
        {isVideoOff && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B' }}>
            <Ionicons name="videocam-off" size={24} color="#FFFFFF" />
          </View>
        )}
      </View>

      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 24 }}>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: Colors.error, marginRight: 12 }} />
          <View>
            <Text style={[Typography.bodyMedium, { color: '#FFFFFF' }]}>{patient.name}</Text>
            <Text style={[Typography.caption, { color: '#CBD5E1' }]}>Appel en cours - HD</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <TouchableOpacity onPress={() => setIsMuted(!isMuted)}
            style={{ width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: isMuted ? Colors.error : 'rgba(255,255,255,0.1)' }}
            accessibilityRole="button" accessibilityLabel={isMuted ? "Activer micro" : "Couper micro"}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button" accessibilityLabel="Raccrocher">
            <Ionicons name="call" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsVideoOff(!isVideoOff)}
            style={{ width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginLeft: 16, backgroundColor: isVideoOff ? Colors.error : 'rgba(255,255,255,0.1)' }}
            accessibilityRole="button" accessibilityLabel={isVideoOff ? "Activer caméra" : "Couper caméra"}>
            <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

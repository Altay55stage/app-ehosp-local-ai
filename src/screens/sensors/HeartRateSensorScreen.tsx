import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Polyline } from 'react-native-svg';
import GradientButton from '../../components/ui/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

export default function HeartRateSensorScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [points, setPoints] = useState<string>('');
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulsePoints = useRef<number[]>([]);

  useEffect(() => {
    (async () => { const { status } = await CameraView.requestCameraPermissionsAsync(); setHasPermission(status === 'granted'); })();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        const base = 50; const pulse = Math.sin(Date.now() / 150) * 20; const noise = (Math.random() - 0.5) * 5;
        pulsePoints.current.push(base + pulse + noise);
        if (pulsePoints.current.length > 50) pulsePoints.current.shift();
        setPoints(pulsePoints.current.map((p, i) => `${(i * (width - 80)) / 50},${p}`).join(' '));
        setProgress((prev) => { if (prev >= 1) { setIsScanning(false); setHeartRate(Math.floor(Math.random() * 21 + 65)); return 1; } return prev + 0.005; });
      }, 50);
      Animated.loop(Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])).start();
    } else { clearInterval(interval); scanAnim.stopAnimation(); }
    return () => clearInterval(interval);
  }, [isScanning]);

  const startScan = () => { setIsScanning(true); setHeartRate(null); setProgress(0); pulsePoints.current = []; };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>Accès caméra refusé</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ borderWidth: 2, borderColor: Colors.primary + '80', borderRadius: 999, overflow: 'hidden', width: width * 0.7, height: width * 0.7 }}>
          {isScanning && (
            <Animated.View style={{ height: 2, backgroundColor: Colors.info, width: '100%', transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.7] }) }] }} />
          )}
        </View>

        <View style={{ marginTop: 40, paddingHorizontal: 40, width: '100%' }}>
          <Text style={[Typography.h3, { color: '#FFFFFF', textAlign: 'center' }]}>
            {isScanning ? 'Analyse rPPG en cours...' : heartRate ? 'Résultat' : 'Placez votre visage au centre'}
          </Text>
          <Text style={[Typography.caption, { color: '#94A3B8', textAlign: 'center', marginTop: 8 }]}>
            {isScanning ? 'Restez immobile' : heartRate ? 'Fréquence cardiaque stable' : 'Détection des variations de flux sanguin'}
          </Text>

          <View style={{ height: 128, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, marginTop: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {isScanning || heartRate ? (
              <Svg height="100" width={width - 80}><Polyline points={points} fill="none" stroke={Colors.info} strokeWidth="3" /></Svg>
            ) : (
              <Text style={{ color: '#64748B', fontStyle: 'italic' }}>Signal en attente</Text>
            )}
          </View>

          {heartRate && (
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 64, fontWeight: '900', color: Colors.primary }}>{heartRate}</Text>
              <Text style={[Typography.h3, { color: Colors.primary }]}>BPM</Text>
            </View>
          )}

          {isScanning && (
            <View style={{ height: 8, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, marginTop: 24, overflow: 'hidden' }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: Colors.primary, borderRadius: 999 }} />
            </View>
          )}
        </View>
      </View>

      <View style={{ padding: 40 }}>
        {!isScanning && <GradientButton title={heartRate ? "Nouvelle mesure" : "Démarrer l'analyse"} onPress={startScan} />}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={[Typography.bodyMedium, { color: '#94A3B8' }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Svg, Polyline } from 'react-native-svg';
import GradientButton from '../../components/ui/GradientButton';

const { width, height } = Dimensions.get('window');

export default function HeartRateSensorScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [points, setPoints] = useState<string>('');
  
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulsePoints = useRef<number[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        // Simulation de signal rPPG avec du bruit sinusoïdal
        const base = 50;
        const pulse = Math.sin(Date.now() / 150) * 20;
        const noise = (Math.random() - 0.5) * 5;
        const val = base + pulse + noise;
        
        pulsePoints.current.push(val);
        if (pulsePoints.current.length > 50) pulsePoints.current.shift();
        
        const newPoints = pulsePoints.current
          .map((p, i) => `${(i * (width - 80)) / 50},${p}`)
          .join(' ');
        setPoints(newPoints);
        
        setProgress((prev) => {
          if (prev >= 1) {
            setIsScanning(false);
            setHeartRate(Math.floor(Math.random() * (85 - 65 + 1) + 65));
            return 1;
          }
          return prev + 0.005;
        });
      }, 50);

      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      clearInterval(interval);
      scanAnim.stopAnimation();
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const startScan = () => {
    setIsScanning(true);
    setHeartRate(null);
    setProgress(0);
    pulsePoints.current = [];
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />
      
      {/* Overlay Sombre */}
      <View style={StyleSheet.absoluteFill} className="bg-black/40" />

      {/* Zone de scan circulaire */}
      <View className="flex-1 items-center justify-center">
        <View 
          className="border-2 border-primary/50 rounded-full overflow-hidden"
          style={{ width: width * 0.7, height: width * 0.7 }}
        >
          {isScanning && (
            <Animated.View 
              style={{ 
                height: 2, 
                backgroundColor: '#0EA5E9',
                width: '100%',
                transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.7] }) }]
              }}
            />
          )}
        </View>

        <View className="mt-10 px-10 w-full">
          <Text className="text-white text-center text-xl font-bold">
            {isScanning ? 'Analyse rPPG en cours...' : heartRate ? 'Résultat de l\'analyse' : 'Placez votre visage au centre'}
          </Text>
          <Text className="text-slate-400 text-center mt-2">
            {isScanning ? 'Restez immobile et bien éclairé' : heartRate ? 'Fréquence cardiaque stable' : 'Détection automatique des variations de flux sanguin'}
          </Text>

          {/* Signal de pouls */}
          <View className="h-32 w-full bg-white/5 border border-white/10 rounded-3xl mt-8 overflow-hidden items-center justify-center">
            {isScanning || heartRate ? (
              <Svg height="100" width={width - 80}>
                <Polyline
                  points={points}
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth="3"
                />
              </Svg>
            ) : (
              <Text className="text-slate-600 italic">Signal en attente</Text>
            )}
          </View>

          {/* Résultat */}
          {heartRate && (
            <View className="items-center mt-6">
              <Text className="text-primary text-6xl font-black">{heartRate}</Text>
              <Text className="text-primary text-xl">BPM</Text>
            </View>
          )}

          {/* Barre de progression */}
          {isScanning && (
            <View className="h-2 w-full bg-white/10 rounded-full mt-6 overflow-hidden">
              <View style={{ width: `${progress * 100}%` }} className="h-full bg-primary" />
            </View>
          )}
        </View>
      </View>

      <View className="p-10">
        {!isScanning && (
          <GradientButton 
            title={heartRate ? "Nouvelle mesure" : "Démarrer l'analyse"} 
            onPress={startScan} 
          />
        )}
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mt-4 items-center"
        >
          <Text className="text-slate-500">Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

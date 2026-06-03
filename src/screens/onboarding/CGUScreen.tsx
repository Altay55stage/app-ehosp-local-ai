import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';

export default function CGUScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  useEffect(() => {
    const preparePdf = async () => {
      try {
        const asset = Asset.fromModule(require('../../../cgu-ehosp.pdf'));
        await asset.downloadAsync();
        setPdfUri(asset.localUri || asset.uri || null);
      } catch {
        setPdfUri(null);
      } finally {
        setLoadingPdf(false);
      }
    };

    preparePdf();
  }, []);

  const openPdf = async () => {
    if (!pdfUri) {
      Alert.alert('CGU indisponibles', "Le PDF n'a pas pu etre charge sur cet appareil.");
      return;
    }

    try {
      await Linking.openURL(pdfUri);
    } catch {
      Alert.alert('Ouverture impossible', "Aucune application ne peut ouvrir ce PDF sur cet appareil.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-6 pb-4">
          <Text className="text-white text-3xl font-bold mb-2">CGU eHosp</Text>
          <Text className="text-slate-300">
            Consultez le document officiel complet des Conditions Generales d'Utilisation.
          </Text>
        </View>

        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <Text className="text-white font-bold mb-2">Document juridique officiel</Text>
          <Text className="text-slate-300 text-sm leading-6">
            Le fichier `cgu-ehosp.pdf` est integre localement a l'application. Vous pouvez l'ouvrir
            dans votre lecteur PDF systeme pour lecture complete.
          </Text>
        </View>

        {loadingPdf ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text className="text-slate-300 mt-3">Preparation du PDF...</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={openPdf}
            className="bg-primary rounded-2xl p-4 items-center justify-center"
          >
            <Text className="text-slate-950 font-bold text-lg">Ouvrir le PDF complet</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

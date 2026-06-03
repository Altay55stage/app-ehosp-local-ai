import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../theme';

export default function CGUScreen({ navigation }: any) {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  useEffect(() => {
    const preparePdf = async () => {
      try {
        const asset = Asset.fromModule(require('../../../cgu-ehosp.pdf'));
        await asset.downloadAsync();
        setPdfUri(asset.localUri || asset.uri || null);
      } catch { setPdfUri(null); } finally { setLoadingPdf(false); }
    };
    preparePdf();
  }, []);

  const openPdf = async () => {
    if (!pdfUri) { Alert.alert('CGU indisponibles', "Le PDF n'a pas pu être chargé."); return; }
    try { await Linking.openURL(pdfUri); } catch { Alert.alert('Ouverture impossible', "Aucune application ne peut ouvrir ce PDF."); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 12 }}
          accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.h2]}>CGU eHosp</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: 8, marginBottom: 24 }]}>
          Consultez le document officiel complet des Conditions Générales d'Utilisation.
        </Text>

        <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, padding: 24, marginBottom: 24, ...Shadows.sm }}>
          <Text style={[Typography.h3, { marginBottom: 8 }]}>Document juridique officiel</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]}>
            Le fichier CGU est intégré localement à l'application. Vous pouvez l'ouvrir dans votre lecteur PDF système.
          </Text>
        </View>

        {loadingPdf ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.caption, { marginTop: 12 }]}>Préparation du PDF...</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={openPdf}
            style={{ backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', ...Shadows.primary }}
            accessibilityRole="button" accessibilityLabel="Ouvrir le PDF complet">
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Ouvrir le PDF complet</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { setSubscriptionStatus } from '../../store/slices/authSlice';
import { PurchasesService } from '../../services/PurchasesService';
import GradientButton from '../../components/ui/GradientButton';
import { Colors, Typography, Shadows } from '../../theme';

export default function SubscriptionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>('yearly');
  const dispatch = useDispatch();

  useEffect(() => {
    const loadOfferings = async () => {
      const offers = await PurchasesService.getOfferings();
      setPackages(offers);
      if (offers.length > 0 && !selectedPackageId) setSelectedPackageId(offers[0].identifier);
    };
    loadOfferings();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPackageId) return;
    setLoading(true);
    const selectedPack = packages.find(p => p.identifier === selectedPackageId);
    const success = await PurchasesService.purchasePackage(selectedPack);
    if (success) {
      dispatch(setSubscriptionStatus('premium'));
      Alert.alert("Paiement Réussi", "Bienvenue Premium !", [{ text: "C'est parti", onPress: () => navigation.goBack() }]);
    } else { Alert.alert("Erreur", "Paiement annulé ou échoué."); }
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    const success = await PurchasesService.restorePurchases();
    if (success) { dispatch(setSubscriptionStatus('premium')); Alert.alert("Succès", "Achats restaurés.", [{ text: "OK", onPress: () => navigation.goBack() }]); }
    else { Alert.alert("Erreur", "Aucun abonnement actif."); }
    setLoading(false);
  };

  const FEATURES = [
    { icon: 'infinite', title: 'Consultations IA Illimitées', desc: 'Parlez avec le Dr. IA sans restriction.' },
    { icon: 'scan', title: 'Vision Médicale HD', desc: "Analyse d'ordonnances, IRM, radios en temps réel." },
    { icon: 'document-text', title: 'Rapports PDF Détaillés', desc: 'Exportez vos dossiers pour votre médecin.' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button" accessibilityLabel="Fermer">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={[Typography.bodyMedium, { color: '#94A3B8' }]}>Restaurer</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <View style={{ backgroundColor: Colors.primary + '20', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: Colors.primary + '40', marginBottom: 16 }}>
            <Text style={[Typography.caption, { color: Colors.primary, textTransform: 'uppercase', letterSpacing: 2 }]}>eHosp Premium</Text>
          </View>
          <Text style={[Typography.h1, { color: '#FFFFFF', textAlign: 'center' }]}>Débloquez la médecine du futur.</Text>
          <Text style={[Typography.body, { color: '#94A3B8', textAlign: 'center', marginTop: 16, paddingHorizontal: 16, lineHeight: 26 }]}>
            Accès illimité à l'intelligence artificielle médicale la plus avancée.
          </Text>
        </View>

        <View style={{ marginTop: 40, gap: 16 }}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name={f.icon as any} size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyMedium, { color: '#FFFFFF' }]}>{f.title}</Text>
                <Text style={[Typography.caption, { color: '#94A3B8', marginTop: 2 }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 40 }}>
          {packages.length === 0 ? (
            <ActivityIndicator size="large" color={Colors.info} />
          ) : packages.map((pack) => (
            <TouchableOpacity key={pack.identifier} onPress={() => setSelectedPackageId(pack.identifier)}
              style={{ borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                borderColor: selectedPackageId === pack.identifier ? Colors.primary : 'rgba(255,255,255,0.1)',
                backgroundColor: selectedPackageId === pack.identifier ? Colors.primary + '15' : 'rgba(255,255,255,0.05)',
                ...(selectedPackageId === pack.identifier ? Shadows.lg : {}) }}
              accessibilityRole="radio" accessibilityState={{ selected: selectedPackageId === pack.identifier }}>
              <View>
                <Text style={[Typography.bodyMedium, { color: '#FFFFFF' }]}>{pack.product.title}</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.primary, marginTop: 4 }}>{pack.product.priceString}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                borderColor: selectedPackageId === pack.identifier ? Colors.primary : 'rgba(255,255,255,0.3)' }}>
                {selectedPackageId === pack.identifier && <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: Colors.primary }} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 24, marginBottom: 48 }}>
          <GradientButton title={loading ? "Sécurisation..." : "S'abonner maintenant"} onPress={handleSubscribe} disabled={loading || !selectedPackageId} loading={loading} colors={[Colors.info, '#0369A1']} />
          <Text style={[Typography.caption, { textAlign: 'center', marginTop: 16, lineHeight: 18 }]}>
            Abonnement récurrent. Annulable à tout moment. En vous abonnant, vous acceptez nos CGU.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import GradientButton from '../../components/ui/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { doctorService } from '../../services/DoctorService';
import { setUserRole } from '../../store/slices/authSlice';
import { Colors, Typography, Shadows } from '../../theme';

interface DoctorLicenseUploadScreenProps {
  onComplete: (licenseUrl: string) => void;
}

export default function DoctorLicenseUploadScreen({ onComplete }: DoctorLicenseUploadScreenProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [file, setFile] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.cancelled && result.assets?.length > 0) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 10 * 1024 * 1024) { setError('Fichier trop volumineux (max 10MB)'); return; }
        setFile({ name: asset.name, uri: asset.uri, type: asset.mimeType || 'application/pdf' });
        setError('');
      }
    } catch { setError('Erreur lors de la sélection'); }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setLoading(true);
    try {
      const licenseUrl = await doctorService.uploadLicense(user.uid, file);
      try { await doctorService.createDoctorProfile(user.uid, user.email || '', user.displayName || '', ['généraliste'], 'UNKNOWN', 'france', ['fr']); } catch {}
      dispatch(setUserRole('doctor'));
      onComplete(licenseUrl);
    } catch { setError("Erreur lors de l'upload"); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'space-between' }}>
        <View>
          <Text style={[Typography.h1, { marginBottom: 8 }]}>Vos Credentials</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>Uploadez votre diplôme/licence médicale (PDF)</Text>
        </View>

        <View style={{ gap: 24 }}>
          {!file ? (
            <TouchableOpacity onPress={pickDocument}
              style={{ backgroundColor: Colors.surface, borderRadius: 24, padding: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, alignItems: 'center', ...Shadows.sm }}
              accessibilityRole="button" accessibilityLabel="Sélectionner un fichier PDF">
              <Ionicons name="cloud-upload-outline" size={48} color={Colors.primary} />
              <Text style={[Typography.h3, { marginTop: 16 }]}>Cliquez pour sélectionner</Text>
              <Text style={[Typography.caption, { marginTop: 4 }]}>PDF — Max 10MB</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: Colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#FEF2F2', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document" size={28} color={Colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodyMedium]} numberOfLines={1}>{file.name}</Text>
                  <Text style={[Typography.caption, { marginTop: 2 }]}>Prêt à uploader</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setFile(null)} style={{ marginTop: 16, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, alignItems: 'center' }}>
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Changer de fichier</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ backgroundColor: Colors.primaryLight, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.primary + '40' }}>
            <Text style={[Typography.label, { marginBottom: 12 }]}>Documents Acceptés</Text>
            {['Diplôme/Certification médicale', "Licence d'exercice (RPPS, ADELI)", 'Enregistrement ordre des médecins', 'CV ou justificatif'].map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={[Typography.caption, { color: Colors.textSecondary, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={{ flexDirection: 'row', gap: 12, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA' }}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={[Typography.bodyMedium, { color: Colors.error, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          <View style={{ backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={[Typography.caption, { lineHeight: 20 }]}>
              Vos documents sont vérifiés par nos administrateurs. Ils ne seront partagés qu'avec les patients.
            </Text>
          </View>
        </View>

        <View>
          {loading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[Typography.caption, { marginTop: 12 }]}>Upload en cours...</Text>
            </View>
          ) : (
            <GradientButton title={file ? 'Uploader & Continuer' : 'Sélectionner un Fichier'} onPress={file ? handleUpload : pickDocument} disabled={!file && !loading} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

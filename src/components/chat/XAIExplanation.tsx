import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors, Typography } from '../../theme';

export default function XAIExplanation({ explanation, sources }: { explanation: string, sources?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ marginTop: 10, width: '100%' }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>
          🤖 {expanded ? "Cacher le raisonnement" : "Pourquoi cette réponse ?"}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12 }}>
          <Text style={{ color: Colors.textPrimary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Raisonnement :</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 11, marginBottom: 10, lineHeight: 16 }}>{explanation}</Text>
          <Text style={{ color: Colors.textPrimary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>📚 Sources :</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 11, lineHeight: 16 }}>{sources || "Sources médicales générales (HAS, PubMed)."}</Text>
        </View>
      )}
    </View>
  );
}


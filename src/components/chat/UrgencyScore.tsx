import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../theme';

export default function UrgencyScore({ score }: { score: number }) {
  let dotColor = Colors.success;
  let bgColor = 'rgba(16,185,129,0.08)';
  let borderColor = 'rgba(16,185,129,0.2)';
  let textColor = Colors.success;
  
  if (score >= 4 && score <= 6) {
    dotColor = Colors.warning;
    bgColor = 'rgba(245,158,11,0.08)';
    borderColor = 'rgba(245,158,11,0.2)';
    textColor = Colors.warning;
  }
  if (score >= 7) {
    dotColor = Colors.error;
    bgColor = 'rgba(239,68,68,0.08)';
    borderColor = 'rgba(239,68,68,0.2)';
    textColor = Colors.error;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: bgColor, borderRadius: 999, marginBottom: 12, alignSelf: 'center', borderWidth: 1, borderColor }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 8, backgroundColor: dotColor }} />
      <Text style={{ color: textColor, fontWeight: '700', fontSize: 13 }}>Niveau d'urgence : {score}/10</Text>
    </View>
  );
}


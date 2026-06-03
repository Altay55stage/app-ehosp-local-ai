import React from 'react';
import { View, Text } from 'react-native';

export default function UrgencyScore({ score }: { score: number }) {
  let color = 'bg-secondary';
  if (score >= 4 && score <= 6) color = 'bg-orange-500';
  if (score >= 7) color = 'bg-urgent';

  return (
    <View className="flex-row items-center px-4 py-2 bg-white/5 rounded-full mb-4 self-center">
      <View className={`w-3 h-3 rounded-full mr-2 ${color}`} />
      <Text className="text-white font-bold">Niveau d'urgence : {score}/10</Text>
    </View>
  );
}

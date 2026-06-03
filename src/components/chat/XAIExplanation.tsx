import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function XAIExplanation({ explanation, sources }: { explanation: string, sources?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="mt-2 w-full">
      <TouchableOpacity onPress={() => setExpanded(!expanded)} className="flex-row items-center">
        <Text className="text-secondary text-xs">🤖 {expanded ? "Cacher le raisonnement" : "Pourquoi cette réponse ?"}</Text>
      </TouchableOpacity>
      {expanded && (
        <View className="mt-2 bg-dark/50 border border-white/10 rounded-lg p-3">
          <Text className="text-slate-300 text-xs font-bold mb-1">Raisonnement :</Text>
          <Text className="text-slate-400 text-xs mb-3">{explanation}</Text>
          
          <Text className="text-slate-300 text-xs font-bold mb-1">📚 Sources :</Text>
          <Text className="text-slate-400 text-xs">{sources || "Sources médicales générales (HAS, PubMed)."}</Text>
        </View>
      )}
    </View>
  );
}

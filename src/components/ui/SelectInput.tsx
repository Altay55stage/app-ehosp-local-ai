import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';

interface SelectInputProps {
  label: string;
  placeholder?: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

export default function SelectInput({ label, placeholder, value, options, onSelect }: SelectInputProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="text-white mb-2 text-sm font-semibold ml-1">{label}</Text>
      
      <TouchableOpacity 
        onPress={() => setModalVisible(true)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4"
      >
        <Text className={value ? "text-white" : "text-slate-500"}>
          {value || placeholder || "Sélectionner..."}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-dark rounded-t-3xl border-t border-white/10 overflow-hidden" style={{ maxHeight: Dimensions.get('window').height * 0.7 }}>
            <View className="p-4 border-b border-white/5 flex-row justify-between items-center bg-dark z-10 shadow-sm">
              <Text className="text-white font-bold text-lg">{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-secondary font-bold">Fermer</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  className={`p-4 border-b border-white/5 ${value === item ? 'bg-secondary/20' : ''}`}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text className={`text-center text-lg ${value === item ? 'text-secondary font-bold' : 'text-white'}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

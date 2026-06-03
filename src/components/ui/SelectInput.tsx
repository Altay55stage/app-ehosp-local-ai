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
      <Text className="text-dark mb-2 text-sm font-semibold ml-1">{label}</Text>
      
      <TouchableOpacity 
        onPress={() => setModalVisible(true)}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm shadow-slate-100"
      >
        <Text className={value ? "text-dark font-medium" : "text-slate-400"}>
          {value || placeholder || "Sélectionner..."}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-slate-900/40">
          <View className="bg-white rounded-t-3xl border-t border-slate-200 overflow-hidden" style={{ maxHeight: Dimensions.get('window').height * 0.7 }}>
            <View className="p-4 border-b border-slate-100 flex-row justify-between items-center bg-white z-10 shadow-sm">
              <Text className="text-dark font-bold text-lg">{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-primary font-bold text-base">Fermer</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  className={`p-4 border-b border-slate-50 ${value === item ? 'bg-primary/10' : 'bg-white'}`}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text className={`text-center text-lg ${value === item ? 'text-primary font-black' : 'text-slate-600 font-medium'}`}>
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

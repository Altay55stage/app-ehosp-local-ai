import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import XAIExplanation from './XAIExplanation';

// Composant de texte qui s'écrit lettre par lettre
function StreamingText({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const [displayed, setDisplayed] = useState(isStreaming ? '' : text);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(text);
      return;
    }
    // Réinitialise si le texte change complètement (nouveau message)
    setDisplayed('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 3; // 3 caractères par tick pour vitesse naturelle
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    if (!isStreaming) return;
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [isStreaming]);

  return (
    <Text className="text-white text-base leading-6">
      {displayed}
      {isStreaming && displayed.length < text.length && (
        <Animated.Text style={{ opacity: cursorOpacity, color: '#FFFFFF' }}>▊</Animated.Text>
      )}
    </Text>
  );
}

export default function MessageBubble({ message }: { message: any }) {
  const isUser = message.isUser;
  
  return (
    <View className={`w-full flex-row my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View className={`max-w-[85%] rounded-2xl p-4 ${isUser ? 'bg-white/15 border border-white/20' : 'bg-white/10'}`}>
        {!isUser && message.agent && (
          <View className="flex-row items-center mb-2">
            <View className="bg-secondary/20 border border-secondary/40 rounded-full px-2 py-0.5">
              <Text className="text-secondary text-xs font-bold">{message.agent}</Text>
            </View>
          </View>
        )}
        
        {message.imageBase64 && (
          <Image 
            source={{ uri: `data:image/jpeg;base64,${message.imageBase64}` }} 
            style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} 
            resizeMode="cover"
          />
        )}
        {message.imageUrl && !message.imageBase64 && (
          <Image 
            source={{ uri: message.imageUrl }} 
            style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} 
            resizeMode="cover"
          />
        )}

        {message.text ? (
          <StreamingText text={message.text} isStreaming={!isUser && message.isStreaming} />
        ) : null}
        
        {!isUser && message.xaiExplanation && (
          <XAIExplanation explanation={message.xaiExplanation} sources={message.sources} />
        )}
      </View>
    </View>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import XAIExplanation from './XAIExplanation';

// Composant de texte qui s'écrit lettre par lettre (Optimisé)
const StreamingText = React.memo(({ text, isStreaming, isUser }: { text: string; isStreaming?: boolean; isUser?: boolean }) => {
  const [displayed, setDisplayed] = useState(isStreaming ? '' : text);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(text);
      return;
    }

    if (text.length > displayed.length) {
      const interval = setInterval(() => {
        setDisplayed(prev => {
          if (prev.length >= text.length) {
            clearInterval(interval);
            return prev;
          }
          return text.slice(0, prev.length + 3); // On avance un peu plus vite
        });
      }, 20);
      return () => clearInterval(interval);
    }
  }, [text, isStreaming]);

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
    <Text className={`text-base leading-6 ${isUser ? 'text-white' : 'text-slate-800'}`}>
      {displayed}
      {isStreaming && displayed.length < text.length && (
        <Animated.Text style={{ opacity: cursorOpacity, color: '#10B981', fontWeight: 'bold' }}>▊</Animated.Text>
      )}
    </Text>
  );
}, (prev, next) => prev.text === next.text && prev.isStreaming === next.isStreaming && prev.isUser === next.isUser);

const MessageBubble = React.memo(({ message }: { message: any }) => {
  const isUser = message.isUser;
  
  return (
    <View className={`w-full flex-row my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View className={`max-w-[85%] rounded-2xl p-4 ${isUser ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 shadow-sm'}`}>
        {!isUser && (
          <View className="flex-row items-center mb-3">
            <View className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1 flex-row items-center">
              <Text className="text-primary text-[10px] font-black mr-1">●</Text>
              <Text className="text-primary text-xs font-bold uppercase tracking-widest">
                {message.agent ? message.agent.replace(/^Gén\s+|^Généraliste\s+/, '👨‍⚕️ ') : "👨‍⚕️ Généraliste"}
              </Text>
            </View>
          </View>
        )}
        
        {message.imageBase64 && (
          <Image 
            source={{ uri: `data:image/jpeg;base64,${message.imageBase64}` }} 
            style={{ width: 220, height: 220, borderRadius: 12, marginBottom: 8 }} 
            resizeMode="cover"
          />
        )}

        {message.text ? (
          <StreamingText text={message.text} isStreaming={!isUser && message.isStreaming} isUser={isUser} />
        ) : null}
        
        {!isUser && message.xaiExplanation && (
          <XAIExplanation explanation={message.xaiExplanation} sources={message.sources} />
        )}
      </View>
    </View>
  );
}, (prev, next) => {
  // On ne re-rend que si le texte change ou si l'état de streaming change
  return (
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.isStreaming === next.message.isStreaming
  );
});

export default MessageBubble;

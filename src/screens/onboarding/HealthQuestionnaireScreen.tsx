import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { db, ref, set } from '../../services/FirebaseService';
import { setHasCompletedQuestionnaire } from '../../store/slices/authSlice';
import LottieView from 'lottie-react-native';
import { Colors, Typography, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

const QUESTIONS = [
  { id: 'q1', label: 'Douleurs thoraciques récurrentes ?', choices: ['Jamais', 'Parfois', 'Souvent'] },
  { id: 'q2', label: 'Antécédents de diabète ?', choices: ['Non', 'Famille', 'Personnel'] },
  { id: 'q3', label: 'Allergies connues ?', choices: ['Aucune', 'Légères', 'Sévères'] },
  { id: 'q4', label: 'Troubles respiratoires ?', choices: ['Non', 'Occasionnels', 'Fréquents'] },
  { id: 'q5', label: 'Consommez-vous du tabac ?', choices: ['Non', 'Occasionnel', 'Quotidien'] },
  { id: 'q6', label: 'Niveau de stress récent ?', choices: ['Faible', 'Moyen', 'Élevé'] },
  { id: 'q7', label: 'Qualité du sommeil ?', choices: ['Bonne', 'Moyenne', 'Mauvaise'] },
  { id: 'q8', label: 'Activité physique ?', choices: ['Régulière', 'Irrégulière', 'Sédentaire'] },
  { id: 'q9', label: 'Hypertension connue ?', choices: ['Non', 'Suspectée', 'Diagnostiquée'] },
  { id: 'q10', label: 'Traitement quotidien ?', choices: ['Aucun', '1-2 médocs', '3+ médocs'] },
  { id: 'q11', label: 'Épisodes de vertige ?', choices: ['Jamais', 'Rares', 'Répétés'] },
  { id: 'q12', label: 'Antécédents cardiaques ?', choices: ['Non', 'Possible', 'Oui'] },
  { id: 'q13', label: 'Douleur chronique ?', choices: ['Non', 'Modérée', 'Importante'] },
  { id: 'q14', label: 'Troubles digestifs ?', choices: ['Non', 'Parfois', 'Souvent'] },
  { id: 'q15', label: "Baisse d'énergie durable ?", choices: ['Non', 'Par moments', 'Oui'] },
];

type ProcessingStep = 'idle' | 'saving' | 'done';

export default function HealthQuestionnaireScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { user, activeProfileId } = useSelector((state: RootState) => state.auth);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true })
      ]).start(() => {
        setCurrentStep(currentStep + 1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        ]).start();
      });
    } else {
      submitQuestionnaire();
    }
  };

  const selectAnswer = (value: string) => {
    setAnswers({ ...answers, [QUESTIONS[currentStep].id]: value });
    setTimeout(handleNext, 300);
  };

  const submitQuestionnaire = async () => {
    if (!user || !activeProfileId || processingStep !== 'idle') return;

    setProcessingStep('saving');

    try {
      await set(ref(db, `users/${user.uid}/profiles/${activeProfileId}/questionnaire`), {
        answers,
        completedAt: Date.now(),
        version: 'v2_revolutionary',
      });
    } catch {
      // Offline fallback: on continue quand même
    }

    setProcessingStep('done');

    setTimeout(() => {
      dispatch(setHasCompletedQuestionnaire(true));
    }, 800);
  };

  const progress = (currentStep + 1) / QUESTIONS.length;

  // --- Écran de traitement (apres soumission) ---
  if (processingStep !== 'idle') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
        <View className="flex-1 items-center justify-center px-8">
          <View style={{ width: 180, height: 180 }}>
            <LottieView
              source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_49rdyysj.json' }}
              autoPlay
              loop={processingStep === 'saving'}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <Text style={[Typography.h2, { color: Colors.primary, marginTop: 24, textAlign: 'center' }]}>
            {processingStep === 'saving' ? 'Profil enregistré' : 'Profil configuré !'}
          </Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 12, textAlign: 'center' }]}>
            {processingStep === 'saving'
              ? 'Configuration de votre dossier médical...'
              : 'Redirection en cours...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Écran questionnaire ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View className="flex-1 px-6 justify-between py-6">
        {/* Header & Progress */}
        <View>
          <View className="flex-row justify-between items-center mb-3">
            <Text style={[Typography.h3, { color: Colors.primary }]}>Calibration Dr. IA</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
              {currentStep + 1} / {QUESTIONS.length}
            </Text>
          </View>
          <View className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: Colors.border }}>
            <View style={{ width: `${progress * 100}%`, backgroundColor: Colors.primary }} className="h-full rounded-full" />
          </View>
        </View>

        {/* Doctor & Question */}
        <View className="items-center">
          <View style={{ width: 180, height: 180 }}>
            <LottieView
              source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_49rdyysj.json' }}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
            className="w-full mt-4"
          >
            <Text style={[Typography.h1, { textAlign: 'center', fontSize: 26, lineHeight: 36 }]}>
              {QUESTIONS[currentStep].label}
            </Text>
          </Animated.View>
        </View>

        {/* Choices */}
        <View>
          {QUESTIONS[currentStep].choices.map((choice) => {
            const isSelected = answers[QUESTIONS[currentStep].id] === choice;
            return (
              <TouchableOpacity
                key={choice}
                onPress={() => selectAnswer(choice)}
                className="rounded-2xl p-5 mb-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: isSelected ? Colors.primary : Colors.border,
                  backgroundColor: isSelected ? Colors.primaryLight : Colors.surface,
                  ...Shadows.sm,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={choice}
              >
                <Text style={[Typography.h3, { color: isSelected ? Colors.primary : Colors.textPrimary }]}>
                  {choice}
                </Text>
                <View
                  className="w-6 h-6 rounded-full items-center justify-center"
                  style={{
                    borderWidth: 2,
                    borderColor: isSelected ? Colors.primary : Colors.border,
                    backgroundColor: isSelected ? Colors.primary + '20' : 'transparent',
                  }}
                >
                  {isSelected && <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.primary }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View className="flex-row justify-between items-center mt-4">
          <TouchableOpacity
            onPress={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="px-4 py-2"
            accessibilityRole="button"
            accessibilityLabel="Question précédente"
          >
            <Text style={[
              Typography.bodyMedium,
              { color: currentStep === 0 ? Colors.textMuted : Colors.textSecondary }
            ]}>
              ← Précédent
            </Text>
          </TouchableOpacity>

          <Text style={[Typography.caption]}>
            {Math.round(progress * 100)}% complété
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

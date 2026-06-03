import React, { useState, useRef } from 'react';
import { Alert, View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { db, ref, set } from '../../services/FirebaseService';
import { setHasCompletedQuestionnaire } from '../../store/slices/authSlice';
import GradientButton from '../../components/ui/GradientButton';
import LottieView from 'lottie-react-native';

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
  { id: 'q15', label: 'Baisse d’énergie durable ?', choices: ['Non', 'Par moments', 'Oui'] },
];

export default function HealthQuestionnaireScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
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
    if (!user) return;
    setSaving(true);
    try {
      await set(ref(db, `users/${user.uid}/onboarding/questionnaire`), {
        answers,
        completedAt: Date.now(),
        version: 'v2_revolutionary',
      });
      dispatch(setHasCompletedQuestionnaire(true));
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const progress = (currentStep + 1) / QUESTIONS.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
      <View className="flex-1 px-6 justify-between py-10">
        {/* Header & Progress */}
        <View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-primary font-bold">Calibration Dr. IA</Text>
            <Text className="text-slate-500">{currentStep + 1} / {QUESTIONS.length}</Text>
          </View>
          <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <View style={{ width: `${progress * 100}%` }} className="h-full bg-primary" />
          </View>
        </View>

        {/* Doctor & Question */}
        <View className="items-center">
          <View style={{ width: 220, height: 220 }}>
            <LottieView
              source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_49rdyysj.json' }} // Holographic Doctor
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          <Animated.View 
            style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
            className="w-full mt-8"
          >
            <Text className="text-white text-2xl font-bold text-center leading-9">
              {QUESTIONS[currentStep].label}
            </Text>
          </Animated.View>
        </View>

        {/* Choices */}
        <View>
          {QUESTIONS[currentStep].choices.map((choice) => (
            <TouchableOpacity
              key={choice}
              onPress={() => selectAnswer(choice)}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-3 flex-row items-center justify-between"
            >
              <Text className="text-white text-lg font-medium">{choice}</Text>
              <View className="w-6 h-6 rounded-full border-2 border-primary/30 items-center justify-center">
                {answers[QUESTIONS[currentStep].id] === choice && <View className="w-3 h-3 rounded-full bg-primary" />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View className="flex-row justify-between items-center">
          <TouchableOpacity 
            onPress={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <Text className={currentStep === 0 ? "text-slate-700" : "text-slate-400"}>Précédent</Text>
          </TouchableOpacity>
          
          {currentStep === QUESTIONS.length - 1 && (
            <View className="w-40">
              <GradientButton 
                title={saving ? "Fin..." : "Terminer"} 
                onPress={submitQuestionnaire} 
                disabled={!answers[QUESTIONS[currentStep].id] || saving}
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}


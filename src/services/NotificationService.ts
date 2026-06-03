import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Demande la permission pour les notifications
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medications', {
        name: 'Rappels Médicaments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFFFFF',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Programme un rappel médicament quotidien à une heure précise
   */
  static async scheduleMedicationReminder(
    medicationName: string,
    hour: number,
    minute: number
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Rappel Médicament',
        body: `C'est l'heure de prendre votre ${medicationName}`,
        data: { type: 'medication', medicationName },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  }

  /**
   * Annule tous les rappels médicaments
   */
  static async cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Envoie une notification immédiate (test ou urgence)
   */
  static async sendImmediate(title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  }

  /**
   * Programme un suivi post-consultation (J+1)
   */
  static async scheduleFollowUp(patientName: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🩺 Suivi eHosp',
        body: `Comment vous sentez-vous ${patientName} ? Votre consultation d'hier a été enregistrée.`,
        data: { type: 'followup' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 86400, // 24 heures
        repeats: false,
      },
    });
  }
}

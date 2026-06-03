/**
 * NotificationDoctorService - Gérer les notifications push pour les médecins
 * Phase 1: Consultations entrantes, notifications obligatoires
 */

import * as Notifications from 'expo-notifications';
import { 
  firestore,
  doc, 
  updateDoc, 
  Timestamp 
} from './FirebaseService';
import axios from 'axios';

export interface DoctorPushNotification {
  type: 'new_consultation' | 'patient_waiting' | 'consultation_accepted' | 'reminder';
  title: string;
  body: string;
  data: Record<string, any>;
  requiresResponse?: boolean; // Si le médecin doit confirmer/rejeter
}

export class NotificationDoctorService {
  
  private static BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  private static FUNCTIONS_URL = process.env.EXPO_PUBLIC_FUNCTIONS_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  /**
   * Initialiser les notifications push
   * À appeler au démarrage de l'app médecin
   */
  static async initializePushNotifications(): Promise<void> {
    try {
      // Demander la permission
      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== 'granted') {
        console.warn('⚠️ Notifications permission not granted');
        return;
      }

      // Configuration du canal par défaut (Android)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Configuration du canal pour urgences
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250, 250, 250],
        sound: 'default',
        lightColor: '#FF0000',
      });

      console.log('✅ Push notifications initialized');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Envoyer une notification locale au médecin
   * (Utilisé si le médecin a l'app ouverte)
   */
  static async sendLocalNotification(notification: DoctorPushNotification): Promise<void> {
    try {
      const channelId = notification.data.urgencyScore >= 8 ? 'urgent' : 'default';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: channelId === 'urgent' ? 'default' : undefined,
          priority:
            notification.data.urgencyScore >= 8 ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: 1 },
      });

      console.log('✅ Local notification sent');
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Envoyer une notification via backend (Expo Push Notification Service)
   * Utilisé pour notifier même si l'app n'est pas ouverte
   */
  static async sendPushNotification(
    doctorId: string,
    expoPushToken: string,
    notification: DoctorPushNotification
  ): Promise<void> {
    try {
      // Prefer Cloud Functions endpoint when available
      const target = `${this.FUNCTIONS_URL.replace(/\/$/, '')}/sendDoctorNotification`;
      const response = await axios.post(target, {
        doctorId,
        expoPushToken,
        ...notification,
      });

      if (response.status === 200) {
        console.log('✅ Push notification sent to doctor:', doctorId);
        const ticketDocId = response.data && response.data.ticketDocId;
        if (ticketDocId) {
          try {
            const docRef = doc(firestore, 'doctors', doctorId);
            await updateDoc(docRef, {
              lastPushTicketId: ticketDocId,
              lastPushTickets: response.data.tickets || null,
              lastPushAt: Timestamp.now().toMillis(),
            });
            console.log('Saved ticketDocId to doctor profile');
          } catch (err) {
            console.warn('Failed saving ticketDocId to doctor profile', err);
          }
        }
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Notifier un médecin d'une nouvelle consultation
   */
  static async notifyNewConsultation(
    doctorId: string,
    expoPushToken: string,
    consultation: {
      consultationId: string;
      patientName: string;
      symptoms: string;
      urgencyScore: number;
      specialization: string;
      timeoutSeconds: number;
    }
  ): Promise<void> {
    const notification: DoctorPushNotification = {
      type: 'new_consultation',
      title: `🚨 Nouvelle Consultation${consultation.urgencyScore >= 8 ? ' URGENTE' : ''}`,
      body: `${consultation.patientName} - Urgence ${consultation.urgencyScore}/10 (${consultation.timeoutSeconds / 60}min)`,
      data: {
        consultationId: consultation.consultationId,
        patientName: consultation.patientName,
        symptoms: consultation.symptoms,
        urgencyScore: consultation.urgencyScore,
        specialization: consultation.specialization,
        action: 'ACCEPT_REJECT',
      },
      requiresResponse: true,
    };

    // Envoyer la notification
    await this.sendPushNotification(doctorId, expoPushToken, notification);

    // Aussi envoyer une notification locale si l'app est ouverte
    await this.sendLocalNotification(notification);
  }

  /**
   * Rappeler au médecin de confirmer sa présence
   * À faire quotidiennement
   */
  static async notifyConfirmPresence(
    doctorId: string,
    expoPushToken: string
  ): Promise<void> {
    const notification: DoctorPushNotification = {
      type: 'reminder',
      title: '📋 Confirmez votre présence',
      body: 'Activez vos notifications et confirmez votre disponibilité pour recevoir les consultations',
      data: {
        action: 'CONFIRM_PRESENCE',
      },
      requiresResponse: true,
    };

    await this.sendPushNotification(doctorId, expoPushToken, notification);
    await this.sendLocalNotification(notification);
  }

  /**
   * Enregistrer qu'un médecin a accepté/rejeté une consultation
   */
  static async recordDoctorResponse(
    consultationId: string,
    doctorId: string,
    action: 'accept' | 'reject'
  ): Promise<void> {
    try {
      const response = await axios.post(`${this.BACKEND_URL}/api/consultations/${consultationId}/response`, {
        doctorId,
        action,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Doctor ${action} recorded`);
    } catch (error) {
      console.error(`Error recording doctor ${action}:`, error);
    }
  }

  /**
   * Sauvegarder le Expo Push Token du médecin
   * À faire lors du login
   */
  static async saveExpoPushToken(doctorId: string, token: string): Promise<void> {
    try {
      const docRef = doc(firestore, 'doctors', doctorId);
      await updateDoc(docRef, {
        expoPushToken: token,
        pushTokenUpdatedAt: Timestamp.now().toMillis(),
      });

      console.log('✅ Expo Push Token saved for doctor:', doctorId);
    } catch (error) {
      console.error('Error saving expo push token:', error);
    }
  }

  /**
   * Gérer la réponse du médecin à une notification
   * À utiliser dans les listeners de notifications
   */
  static async handleNotificationResponse(
    notification: Notifications.NotificationResponse
  ): Promise<void> {
    const { type, action } = notification.request.content.data;

    if (type === 'new_consultation' && action === 'ACCEPT_REJECT') {
      // Afficher un modal pour accepter/rejeter
      console.log('Doctor should see ACCEPT/REJECT modal');
    }

    if (type === 'reminder' && action === 'CONFIRM_PRESENCE') {
      // Afficher un modal pour confirmer la présence
      console.log('Doctor should confirm presence');
    }
  }
}

export const notificationDoctorService = NotificationDoctorService;

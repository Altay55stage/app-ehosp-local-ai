/**
 * ConsultationService - Gestion des consultations et matching 15min
 * Phase 1: Créer consultation, chercher médecin, expiration 15min
 */

import {
  firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from './FirebaseService';
import { Consultation, FIREBASE_PATHS } from './types';

export class ConsultationService {
  private CONSULTATION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Créer une nouvelle consultation (Patient initiates)
   * 1. Patient lance une consultation
   * 2. IA génère un prédéiagnostic gratuit
   * 3. Cherche les médecins disponibles
   * 4. Les médecins reçoivent une notification
   * 5. 15 min pour accepter
   */
  async createConsultation(
    patientId: string,
    specialization: string,
    symptoms: string,
    urgencyScore: number // 0-10
  ): Promise<Consultation> {
    const consultationId = `consultation_${patientId}_${Date.now()}`;
    const now = Timestamp.now().toMillis();
    const expiresAt = now + this.CONSULTATION_TIMEOUT_MS;

    const consultation: Consultation = {
      id: consultationId,
      patientId,
      patient: {
        uid: patientId,
        name: '', // À remplir depuis le profil patient
        age: 0,
      },
      status: 'pending',
      createdAt: now,
      expiresAt,
      pricing: {
        preDignosticCost: 0, // Gratuit
        consultationCost: 14.99,
        totalPaid: 0,
        status: 'pending',
      },
    };

    const consultationRef = doc(
      firestore,
      FIREBASE_PATHS.CONSULTATIONS,
      consultationId
    );
    await setDoc(consultationRef, consultation);

    // Générer le prédéiagnostic est fait côté client via backend → stocké en consultation.preDignosticPDF

    // Chercher les médecins disponibles pour cette spécialité et notifier
    await this.findAndNotifyDoctors(consultationId, specialization, urgencyScore);

    return consultation;
  }

  /**
   * Trouver les médecins disponibles et les notifier
   */
  private async findAndNotifyDoctors(
    consultationId: string,
    specialization: string,
    urgencyScore: number
  ): Promise<void> {
    try {
      const doctorsRef = collection(firestore, FIREBASE_PATHS.DOCTORS);
      const q = query(
        doctorsRef,
        where('specialization', 'array-contains', specialization),
        where('isVerified', '==', true),
        where('isAvailable', '==', true)
      );
      const snapshot = await getDocs(q);

      // Envoyer des notifications via backend relay en utilisant le token stocké sur le profil doctor
      const doctorDocs = snapshot.docs.map((d) => d.data() as any);
      for (const doctor of doctorDocs) {
        try {
          const expoPushToken = doctor.expoPushToken || null;
          // Use NotificationDoctorService to forward to backend
          const timeoutSeconds = 15 * 60;
          await import('./NotificationDoctorService').then(async (mod) => {
            const svc = mod.notificationDoctorService;
            if (expoPushToken) {
              await svc.notifyNewConsultation(doctor.uid, expoPushToken, {
                consultationId,
                patientName: '',
                symptoms: '',
                urgencyScore,
                specialization,
                timeoutSeconds,
              });
            }
          });
        } catch (err) {
          console.warn('notify doctor failed', err);
        }
      }
    } catch (error) {
      console.error('Erreur find doctors:', error);
    }
  }

  /**
   * Médecin accepte une consultation
   */
  async acceptConsultation(consultationId: string, doctorId: string): Promise<void> {
    const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId);
    const consultation = (await getDoc(consultationRef)).data() as Consultation;

    // Vérifier que la consultation n'a pas expiré
    if (Timestamp.now().toMillis() > consultation.expiresAt) {
      throw new Error('Consultation expired (15 min timeout)');
    }

    // Vérifier qu'aucun autre médecin n'a accepté
    if (consultation.doctorId) {
      throw new Error('Consultation already accepted by another doctor');
    }

    // Accepter la consultation
    await updateDoc(consultationRef, {
      doctorId,
      status: 'accepted',
      startedAt: Timestamp.now().toMillis(),
    });

    // TODO: Notifier le patient
    // await sendPushNotification(consultation.patientId, {
    //   title: 'Médecin trouvé!',
    //   body: 'Un médecin a accepté votre consultation',
    //   data: { consultationId },
    // });

    // TODO: Faire payer le patient via Stripe
    // await this.processPayment(consultationId, consultation.pricing.consultationCost);
  }

  /**
   * Médecin rejette une consultation
   */
  async rejectConsultation(consultationId: string, doctorId: string): Promise<void> {
    // Juste ignorer la notification - le système passera au prochain médecin
    console.log(`Doctor ${doctorId} rejected consultation ${consultationId}`);
  }

  /**
   * Terminer une consultation et enregistrer le diagnostic
   */
  async completeConsultation(
    consultationId: string,
    diagnosis: string,
    medicines?: string[]
  ): Promise<void> {
    const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId);

    await updateDoc(consultationRef, {
      diagnosis,
      status: 'completed',
      completedAt: Timestamp.now().toMillis(),
    });

    // TODO: Générer l'ordonnance signée PDF
  }

  /**
   * Annuler une consultation
   */
  async cancelConsultation(consultationId: string, reason: string): Promise<void> {
    const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId);

    await updateDoc(consultationRef, {
      status: 'cancelled',
      completedAt: Timestamp.now().toMillis(),
    });

    // TODO: Rembourser le patient si paiement effectué
  }

  /**
   * Récupérer une consultation
   */
  async getConsultation(consultationId: string): Promise<Consultation | null> {
    const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId);
    const snapshot = await getDoc(consultationRef);
    return snapshot.exists() ? (snapshot.data() as Consultation) : null;
  }

  /**
   * Récupérer les consultations d'un patient
   */
  async getPatientConsultations(patientId: string): Promise<Consultation[]> {
    try {
      const consultationsRef = collection(firestore, FIREBASE_PATHS.CONSULTATIONS);
      const q = query(consultationsRef, where('patientId', '==', patientId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as Consultation);
    } catch (error) {
      console.error('Erreur fetch patient consultations:', error);
      return [];
    }
  }

  /**
   * Récupérer les consultations d'un médecin
   */
  async getDoctorConsultations(doctorId: string): Promise<Consultation[]> {
    try {
      const consultationsRef = collection(firestore, FIREBASE_PATHS.CONSULTATIONS);
      const q = query(consultationsRef, where('doctorId', '==', doctorId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as Consultation);
    } catch (error) {
      console.error('Erreur fetch doctor consultations:', error);
      return [];
    }
  }

  /**
   * Traiter le paiement Stripe
   * €14.99 pour consultation
   * 70% au médecin, 30% à eHosp
   */
  async processPayment(
    consultationId: string,
    patientId: string,
    amount: number
  ): Promise<string> {
    try {
      // TODO: Intégrer Stripe Payment Intent
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: Math.round(amount * 100), // En centimes
      //   currency: 'eur',
      //   customer: customer_id,
      //   metadata: { consultationId, patientId },
      // });
      // return paymentIntent.client_secret;

      return 'stripe_intent_mock'; // Mock pour Phase 1
    } catch (error) {
      console.error('Erreur Stripe:', error);
      throw error;
    }
  }

  /**
   * Confirmer le paiement après que le patient ait soumis son token Stripe
   */
  async confirmPayment(consultationId: string, paymentIntentId: string): Promise<void> {
    const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId);

    await updateDoc(consultationRef, {
      'pricing.stripePyamentIntentId': paymentIntentId,
      'pricing.status': 'paid',
    });
  }

  /**
   * Vérifier les consultations expirées et les annuler
   * À exécuter en backend (Cloud Function)
   */
  async expireConsultations(): Promise<number> {
    try {
      const consultationsRef = collection(firestore, FIREBASE_PATHS.CONSULTATIONS);
      const q = query(
        consultationsRef,
        where('status', '==', 'pending'),
        where('expiresAt', '<', Timestamp.now().toMillis())
      );
      const snapshot = await getDocs(q);

      let count = 0;
      for (const doc of snapshot.docs) {
        await updateDoc(doc.ref, { status: 'cancelled' });
        count++;
      }

      return count;
    } catch (error) {
      console.error('Erreur expire consultations:', error);
      return 0;
    }
  }
}

export const consultationService = new ConsultationService();

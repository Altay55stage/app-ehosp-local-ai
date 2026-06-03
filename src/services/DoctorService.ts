/**
 * DoctorService - Gestion des profils médecins, disponibilités, et candidatures
 * Phase 1: Auto-signup + Notification candidatures à admin
 */

import {
  firestore,
  storage,
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
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { Doctor, DoctorAvailability, DoctorCandidature, FIREBASE_PATHS } from './types';

export class DoctorService {

  /**
   * Créer un nouveau profil médecin (lors de l'inscription)
   */
  async createDoctorProfile(
    uid: string,
    email: string,
    displayName: string,
    specialization: string[],
    licenseNumber: string,
    country: string,
    languages: string[] = ['fr']
  ): Promise<Doctor> {
    const now = Timestamp.now().toMillis();
    const doctor: Doctor = {
      uid,
      email,
      displayName,
      role: 'doctor',
      phoneNumber: '',
      specialization,
      licenseNumber,
      licenseFileUrl: '', // Sera rempli après upload
      languages,
      consultationFee: 14.99,
      isVerified: false, // Attends validation admin
      isAvailable: false,
      consultationsCount: 0,
      rating: 0,
      totalEarnings: 0,
      createdAt: now,
      updatedAt: now,
    };

    const doctorRef = doc(firestore, FIREBASE_PATHS.DOCTORS, uid);
    await setDoc(doctorRef, doctor);

    // Créer une candidature admin
    await this.createDoctorCandidature(uid, email, displayName, specialization, '');

    return doctor;
  }

  /**
   * Upload du fichier de licence (PDF)
   * Stockage: Firebase Storage → gs://bucket/doctors/{doctorId}/license.pdf
   */
  async uploadLicense(
    doctorId: string,
    file: { name: string; uri: string; type: string }
  ): Promise<string> {
    try {
      const storagePath = `doctors/${doctorId}/license.pdf`;
      const fileRef = storageRef(storage, storagePath);

      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });

      const fileUrl = await getDownloadURL(fileRef);

      const doctorRef = doc(firestore, FIREBASE_PATHS.DOCTORS, doctorId);
      await updateDoc(doctorRef, { licenseFileUrl: fileUrl });

      return fileUrl;
    } catch (error) {
      console.error('Erreur upload licence:', error);
      throw error;
    }
  }

  /**
   * Récupérer un profil médecin
   */
  async getDoctor(doctorId: string): Promise<Doctor | null> {
    const doctorRef = doc(firestore, FIREBASE_PATHS.DOCTORS, doctorId);
    const snapshot = await getDoc(doctorRef);
    return snapshot.exists() ? (snapshot.data() as Doctor) : null;
  }

  /**
   * Chercher des médecins par spécialité
   */
  async searchDoctorsBySpecialization(specialization: string): Promise<Doctor[]> {
    try {
      const doctorsRef = collection(firestore, FIREBASE_PATHS.DOCTORS);
      const q = query(
        doctorsRef,
        where('specialization', 'array-contains', specialization),
        where('isVerified', '==', true),
        where('isAvailable', '==', true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as Doctor);
    } catch (error) {
      console.error('Erreur recherche médecins:', error);
      return [];
    }
  }

  /**
   * Mettre à jour la disponibilité d'un médecin
   */
  async updateAvailability(doctorId: string, isAvailable: boolean): Promise<void> {
    const doctorRef = doc(firestore, FIREBASE_PATHS.DOCTORS, doctorId);
    await updateDoc(doctorRef, {
      isAvailable,
      lastAvailabilityConfirm: isAvailable ? Timestamp.now().toMillis() : undefined,
    });
  }

  /**
   * Confirmer la présence du médecin (notification obligatoire)
   * Cette action doit être faite chaque jour/avant chaque consultation
   */
  async confirmPresence(doctorId: string): Promise<void> {
    const doctorRef = doc(firestore, FIREBASE_PATHS.DOCTORS, doctorId);
    await updateDoc(doctorRef, {
      isAvailable: true,
      lastAvailabilityConfirm: Timestamp.now().toMillis(),
    });
  }

  /**
   * Créer une candidature médecin pour validation admin
   * Envoie une notification à altayinvestpro@gmail.com
   */
  private async createDoctorCandidature(
    doctorId: string,
    email: string,
    displayName: string,
    specialization: string[],
    licenseFileUrl: string
  ): Promise<DoctorCandidature> {
    const now = Timestamp.now().toMillis();
    const candidatureId = `${doctorId}_${now}`;

    const candidature: DoctorCandidature = {
      id: candidatureId,
      doctorId,
      doctor: {
        name: displayName,
        email,
        phone: '', // À remplir ultérieurement
      },
      specialization,
      licenseFileUrl,
      status: 'pending',
      submittedAt: now,
    };

    const candidatureRef = doc(
      firestore,
      FIREBASE_PATHS.CANDIDATURES,
      candidatureId
    );
    await setDoc(candidatureRef, candidature);

    // TODO: Envoyer une notification email à l'admin
    // await sendEmailNotification('altayinvestpro@gmail.com', {
    //   subject: `Nouvelle candidature médecin: ${displayName}`,
    //   template: 'doctor_candidature',
    //   data: candidature,
    // });

    return candidature;
  }

  /**
   * Récupérer les candidatures en attente (Admin only)
   */
  async getPendingCandidatures(): Promise<DoctorCandidature[]> {
    try {
      const candidaturesRef = collection(firestore, FIREBASE_PATHS.CANDIDATURES);
      const q = query(candidaturesRef, where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as DoctorCandidature);
    } catch (error) {
      console.error('Erreur fetch candidatures:', error);
      return [];
    }
  }

  /**
   * Valider une candidature médecin (Admin only)
   */
  async approveCandidature(candidatureId: string, notes?: string): Promise<void> {
    const candidatureRef = doc(firestore, FIREBASE_PATHS.CANDIDATURES, candidatureId);
    const candidature = (await getDoc(candidatureRef)).data() as DoctorCandidature;

    // Mettre à jour la candidature
    await updateDoc(candidatureRef, {
      status: 'approved',
      reviewedAt: Timestamp.now().toMillis(),
      reviewedBy: 'admin', // TODO: utc.uid de l'admin
      notes,
    });

    // Mettre à jour le profil médecin
    const doctorRef = doc(firestore, FIREBASE_PATHS.DOCTORS, candidature.doctorId);
    await updateDoc(doctorRef, { isVerified: true });

    // TODO: Envoyer une notification email au médecin
    // await sendEmailNotification(candidature.doctor.email, {
    //   subject: 'Votre candidature eHosp a été acceptée!',
    //   template: 'doctor_approved',
    //   data: { doctor: candidature.doctor },
    // });
  }

  /**
   * Rejeter une candidature médecin (Admin only)
   */
  async rejectCandidature(candidatureId: string, reason: string): Promise<void> {
    const candidatureRef = doc(firestore, FIREBASE_PATHS.CANDIDATURES, candidatureId);
    const candidature = (await getDoc(candidatureRef)).data() as DoctorCandidature;

    // Mettre à jour la candidature
    await updateDoc(candidatureRef, {
      status: 'rejected',
      reviewedAt: Timestamp.now().toMillis(),
      reviewedBy: 'admin', // TODO: utilisé uid de l'admin
      notes: reason,
    });

    // TODO: Envoyer une notification email au médecin
  }

  /**
   * Valider le numéro de licence (par pays)
   */
  static validateLicenseNumber(license: string, country: string): boolean {
    license = license.replace(/\s/g, '');

    if (country.toLowerCase() === 'france') {
      // RPPS ou ADELI: format alphanumériques
      return /^[A-Z0-9]{11,15}$/.test(license);
    } else if (country.toLowerCase() === 'spain') {
      // Colegio de Médicos
      return /^\d{8}[A-Z]$/.test(license);
    } else {
      // Format générique
      return license.length >= 6;
    }
  }

  /**
   * Obtenir les stats d'un médecin pour le dashboard
   */
  async getDoctorStats(doctorId: string): Promise<{
    consultationsThisMonth: number;
    earningsThisMonth: number;
    rating: number;
    totalConsultations: number;
  }> {
    const doctor = await this.getDoctor(doctorId);
    if (!doctor) {
      return { consultationsThisMonth: 0, earningsThisMonth: 0, rating: 0, totalConsultations: 0 };
    }

    // TODO: Implémenter les stats
    return {
      consultationsThisMonth: 0,
      earningsThisMonth: 0,
      rating: doctor.rating,
      totalConsultations: doctor.consultationsCount,
    };
  }
}

export const doctorService = new DoctorService();

/**
 * PatientService - Gestion des patients et uploads PDFs
 * Utilise les singletons Firebase centralisés dans FirebaseService
 */

import {
  firestore,
  storage,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  Timestamp,
} from './FirebaseService';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { Patient, MedicalRecord, FIREBASE_PATHS } from './types';

export class PatientService {
  /**
   * Créer un nouveau patient (lors de l'inscription)
   */
  async createPatient(
    uid: string,
    email: string,
    displayName: string,
    socialSecurityNumber: string,
    country: string,
    language: 'fr' | 'en' | 'es' = 'fr'
  ): Promise<Patient> {
    const now = Timestamp.now().toMillis();
    const patient: Patient = {
      uid,
      email,
      displayName,
      role: 'patient',
      socialSecurityNumber,
      country,
      language,
      phoneNumber: '',
      dateOfBirth: '',
      gender: 'Other',
      medicalRecords: [],
      subscription: 'free',
      createdAt: now,
      updatedAt: now,
    };

    const patientRef = doc(firestore, FIREBASE_PATHS.PATIENTS, uid);
    await setDoc(patientRef, patient);
    return patient;
  }

  /**
   * Récupérer un patient
   */
  async getPatient(patientId: string): Promise<Patient | null> {
    const patientRef = doc(firestore, FIREBASE_PATHS.PATIENTS, patientId);
    const snapshot = await getDoc(patientRef);
    return snapshot.exists() ? (snapshot.data() as Patient) : null;
  }

  /**
   * Mettre à jour un profil patient
   */
  async updatePatientProfile(patientId: string, data: Partial<Patient>): Promise<void> {
    const patientRef = doc(firestore, FIREBASE_PATHS.PATIENTS, patientId);
    const snapshot = await getDoc(patientRef);
    if (!snapshot.exists()) {
      // Créer le document s'il n'existe pas encore
      await setDoc(patientRef, { ...data, updatedAt: Timestamp.now().toMillis() }, { merge: true });
    } else {
      await updateDoc(patientRef, { ...data, updatedAt: Timestamp.now().toMillis() });
    }
  }

  /**
   * Upload PDF médical (prise de sang, imagerie, etc.)
   */
  async uploadMedicalRecord(
    patientId: string,
    file: { name: string; uri: string; type: string },
    recordType: 'lab_test' | 'imaging' | 'prescription' | 'other',
    description: string
  ): Promise<MedicalRecord> {
    const recordId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storagePath = `patients/${patientId}/records/${recordId}.pdf`;
    const fileRef = storageRef(storage, storagePath);

    const response = await fetch(file.uri);
    const blob = await response.blob();
    await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });
    const fileUrl = await getDownloadURL(fileRef);

    const medicalRecord: MedicalRecord = {
      id: recordId,
      type: recordType,
      title: file.name,
      description,
      fileUrl,
      date: Timestamp.now().toMillis(),
    };

    const recordRef = doc(firestore, FIREBASE_PATHS.PATIENT_RECORDS(patientId), recordId);
    await setDoc(recordRef, medicalRecord);

    // Ajouter à la liste du patient
    const patient = await this.getPatient(patientId);
    if (patient) {
      const patientRef = doc(firestore, FIREBASE_PATHS.PATIENTS, patientId);
      await updateDoc(patientRef, {
        medicalRecords: [...(patient.medicalRecords || []), medicalRecord],
      });
    }

    return medicalRecord;
  }

  /**
   * Obtenir les enregistrements médicaux d'un patient
   */
  async getMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
    try {
      const recordsRef = collection(firestore, FIREBASE_PATHS.PATIENT_RECORDS(patientId));
      const snapshot = await getDocs(recordsRef);
      return snapshot.docs.map((d) => d.data() as MedicalRecord);
    } catch (error) {
      console.error('Erreur fetch medical records:', error);
      return [];
    }
  }

  /**
   * Upload PDF prédéiagnostic généré par l'IA
   */
  async uploadPreDiagnosticPDF(
    patientId: string,
    consultationId: string,
    pdfBase64: string,
    language: 'fr' | 'en' | 'es'
  ): Promise<string> {
    const storagePath = `consultations/${consultationId}/prediagnostic_${language}.pdf`;
    const fileRef = storageRef(storage, storagePath);

    const byteCharacters = atob(pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });

    await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });
    return await getDownloadURL(fileRef);
  }

  /**
   * Valider le numéro de sécurité sociale
   */
  static validateSecurityNumber(ssn: string, country: string): boolean {
    ssn = ssn.replace(/\s/g, '');
    if (country.toLowerCase() === 'france') {
      return /^\d{15}$/.test(ssn);
    } else if (country.toLowerCase() === 'spain') {
      return /^[KLMNPQRSW]\d{7}[0-9KLM]$|^\d{8}[A-Z]$/.test(ssn);
    } else {
      return ssn.length >= 8;
    }
  }
}

export const patientService = new PatientService();

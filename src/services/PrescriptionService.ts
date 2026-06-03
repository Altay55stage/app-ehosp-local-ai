/**
 * PrescriptionService - Gestion des ordonnances signées numériquement
 * Utilise react-native-qrcode-svg (compatible React Native, pas qrcode Node.js)
 */

import {
  firestore,
  storage,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
} from './FirebaseService';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { Consultation, Medicine, FIREBASE_PATHS } from './types';

export class PrescriptionService {
  /**
   * Générer un hash simple pour l'intégrité de l'ordonnance
   */
  private hashPrescription(prescriptionData: any): string {
    const data = JSON.stringify(prescriptionData);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Générer l'HTML de l'ordonnance
   * QR Code: La valeur est une string JSON avec le hash — le composant <QRCode> est affiché dans l'UI React Native
   */
  generatePrescriptionQRValue(consultationId: string, prescriptionData: any): string {
    return JSON.stringify({
      consultationId,
      timestamp: new Date().toISOString(),
      hash: this.hashPrescription(prescriptionData),
    });
  }

  /**
   * Générer et uploader l'ordonnance en PDF (via le backend Node.js)
   * Le backend reçoit le HTML et retourne un PDF base64
   */
  async generateSignedPrescription(
    consultationId: string,
    consultation: Consultation,
    medicines: Medicine[],
    doctorName: string,
    doctorLicense: string
  ): Promise<string> {
    const prescriptionData = {
      consultationId,
      patientName: consultation.patient.name,
      doctorName,
      doctorLicense,
      issuedAt: new Date().toISOString(),
      medicines,
    };

    const qrValue = this.generatePrescriptionQRValue(consultationId, prescriptionData);
    const hash = this.hashPrescription(prescriptionData);

    // Générer le HTML de l'ordonnance
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #1B4332; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #1B4332; }
          .section { margin: 20px 0; }
          .section h2 { color: #40916C; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #1B4332; color: white; padding: 8px; text-align: left; font-size: 12px; }
          td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>eHosp — ORDONNANCE MÉDICALE</h1>
          <p>Numéro: ${consultationId}</p>
          <p>Date: ${new Date(prescriptionData.issuedAt).toLocaleDateString('fr-FR')}</p>
        </div>
        <div class="section">
          <h2>Patient</h2>
          <p><strong>Nom:</strong> ${prescriptionData.patientName}</p>
        </div>
        <div class="section">
          <h2>Médecin Prescripteur</h2>
          <p><strong>Dr.</strong> ${doctorName} — Licence: ${doctorLicense}</p>
        </div>
        <div class="section">
          <h2>Médicaments prescrits</h2>
          <table>
            <tr><th>Médicament</th><th>Dosage</th><th>Fréquence</th><th>Durée</th></tr>
            ${medicines.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.dosage}</td>
                <td>${m.frequency}</td>
                <td>${m.duration}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        <div class="footer">
          <p>Hash de vérification: ${hash.substring(0, 16)}...</p>
          <p>Ordonnance générée numériquement via eHosp. Valide 1 an.</p>
        </div>
      </body>
      </html>
    `;

    // Appeler le backend pour convertir HTML → PDF
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/generate-prediagnostic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationId,
        text: htmlContent,
        language: 'fr',
        patientName: prescriptionData.patientName,
        type: 'prescription',
      }),
    });

    const { pdfBase64 } = await response.json();

    // Upload en Firebase Storage
    const storagePath = `consultations/${consultationId}/prescription.pdf`;
    const fileRef = storageRef(storage, storagePath);
    const byteNumbers = Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });
    const fileUrl = await getDownloadURL(fileRef);

    // Mettre à jour la consultation Firestore
    const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId);
    await updateDoc(consultationRef, {
      'prescription.medicines': medicines,
      'prescription.prescriptionPDF.fileUrl': fileUrl,
      'prescription.prescriptionPDF.signedBy': doctorName,
      'prescription.prescriptionPDF.timestamp': Timestamp.now().toMillis(),
      'prescription.prescriptionPDF.signatureQR': qrValue,
    });

    return fileUrl;
  }

  /**
   * Vérifier l'authenticité d'une ordonnance via la valeur QR décodée
   */
  async verifyPrescription(qrData: string): Promise<boolean> {
    try {
      const data = JSON.parse(qrData);
      const consultationRef = doc(firestore, FIREBASE_PATHS.CONSULTATIONS, data.consultationId);
      const snap = await getDoc(consultationRef);
      if (!snap.exists()) return false;

      const issuedTime = new Date(data.timestamp).getTime();
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 an
      return Date.now() - issuedTime < maxAge;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir l'URL de téléchargement d'une ordonnance
   */
  async downloadPrescription(consultationId: string): Promise<string | null> {
    try {
      const snap = await getDoc(doc(firestore, FIREBASE_PATHS.CONSULTATIONS, consultationId));
      const data = snap.data() as Consultation;
      return data?.prescription?.prescriptionPDF?.fileUrl || null;
    } catch {
      return null;
    }
  }
}

export const prescriptionService = new PrescriptionService();

/**
 * NotificationAdminService - Gérer les notifications de l'admin
 * Phase 1: Envoyer les candidatures médecins par email à altayinvestpro@gmail.com
 */

import axios from 'axios';

export interface AdminNotificationPayload {
  type:
    | 'new_doctor_candidature'
    | 'doctor_approved'
    | 'new_consultation'
    | 'consultation_completed'
    | 'payment_received';
  subject: string;
  emailTo?: string; // Default: altayinvestpro@gmail.com
  data: Record<string, any>;
  template?: string; // HTML template name
}

export class NotificationAdminService {
  private static ADMIN_EMAIL = 'altayinvestpro@gmail.com';
  private static BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  private static FUNCTIONS_URL = process.env.EXPO_PUBLIC_FUNCTIONS_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  /**
   * Envoyer une notification email à l'admin
   * Backend reçoit la requête et envoie via SendGrid/NodeMailer
   */
  static async sendAdminNotification(payload: AdminNotificationPayload): Promise<void> {
    try {
      // Prefer calling Cloud Functions endpoint if FUNCTIONS_URL is set
      const target = `${this.FUNCTIONS_URL.replace(/\/$/, '')}/sendAdminNotification`;
      const response = await axios.post(target, {
        ...payload,
        emailTo: payload.emailTo || this.ADMIN_EMAIL,
      });

      if (response.status !== 200) {
        throw new Error(`Backend error: ${response.status}`);
      }

      console.log('✅ Admin notification sent:', payload.type);
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      // Ne pas lever d'erreur pour ne pas bloquer le flux utilisateur
    }
  }

  /**
   * Notifier l'admin d'une nouvelle candidature médecin
   */
  static async notifyNewDoctorCandidature(candidature: {
    doctorId: string;
    doctor: {
      name: string;
      email: string;
      phone: string;
    };
    specialization: string[];
    licenseFileUrl: string;
    submittedAt: number;
  }): Promise<void> {
    await this.sendAdminNotification({
      type: 'new_doctor_candidature',
      subject: `[eHosp Admin] Nouvelle candidature médecin: ${candidature.doctor.name}`,
      data: {
        doctorName: candidature.doctor.name,
        doctorEmail: candidature.doctor.email,
        doctorPhone: candidature.doctor.phone,
        specialization: candidature.specialization.join(', '),
        licenseFileUrl: candidature.licenseFileUrl,
        submittedAt: new Date(candidature.submittedAt).toLocaleString('fr-FR'),
        actionUrl: `${this.BACKEND_URL}/admin/candidatures/${candidature.doctorId}`,
      },
      template: 'admin_new_doctor_candidature',
    });
  }

  /**
   * Notifier l'admin d'une nouvelle consultation
   */
  static async notifyNewConsultation(consultation: {
    consultationId: string;
    patientName: string;
    patientSSN: string;
    symptoms: string;
    urgencyScore: number;
    specialization: string;
  }): Promise<void> {
    await this.sendAdminNotification({
      type: 'new_consultation',
      subject: `[eHosp Stats] Nouvelle consultation - Urgence ${consultation.urgencyScore}/10`,
      data: {
        consultationId: consultation.consultationId,
        patientName: consultation.patientName,
        symptoms: consultation.symptoms,
        urgencyScore: consultation.urgencyScore,
        specialization: consultation.specialization,
        timestamp: new Date().toLocaleString('fr-FR'),
      },
      template: 'admin_new_consultation',
    });
  }

  /**
   * Notifier l'admin d'une consultation complétée + paiement
   */
  static async notifyConsultationCompleted(consultation: {
    consultationId: string;
    patientName: string;
    doctorName: string;
    amount: number;
    commission: number;
    doctorEarnings: number;
  }): Promise<void> {
    await this.sendAdminNotification({
      type: 'consultation_completed',
      subject: `[eHosp Revenue] Consultation complétée - €${consultation.amount.toFixed(2)}`,
      data: {
        consultationId: consultation.consultationId,
        patientName: consultation.patientName,
        doctorName: consultation.doctorName,
        totalAmount: consultation.amount.toFixed(2),
        eHospCommission: consultation.commission.toFixed(2),
        doctorEarnings: consultation.doctorEarnings.toFixed(2),
        timestamp: new Date().toLocaleString('fr-FR'),
      },
      template: 'admin_consultation_completed',
    });
  }

  /**
   * Envoyer un résumé quotidien à l'admin
   */
  static async sendDailyDigest(stats: {
    totalConsultations: number;
    totalRevenue: number;
    newDoctorCandidatures: number;
    newUsers: number;
    urgentCases: number;
  }): Promise<void> {
    await this.sendAdminNotification({
      type: 'new_consultation', // Réutiliser le type
      subject: `[eHosp Daily] Résumé du ${new Date().toLocaleDateString('fr-FR')}`,
      data: {
        date: new Date().toLocaleDateString('fr-FR'),
        totalConsultations: stats.totalConsultations,
        totalRevenue: `€${stats.totalRevenue.toFixed(2)}`,
        newDoctorCandidatures: stats.newDoctorCandidatures,
        newUsers: stats.newUsers,
        urgentCases: stats.urgentCases,
        timestamp: new Date().toLocaleString('fr-FR'),
      },
      template: 'admin_daily_digest',
    });
  }
}

export const notificationAdminService = NotificationAdminService;

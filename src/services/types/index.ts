/**
 * eHosp Global Types Definition
 * Shared between Patient, Doctor, and Admin portals
 */

// ============ USER TYPES ============
export type UserRole = 'patient' | 'doctor' | 'admin';

export interface BaseUser {
  uid: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
}

// ============ PATIENT TYPES ============
export interface Patient extends BaseUser {
  role: 'patient';
  phoneNumber: string;
  socialSecurityNumber: string; // NEW
  dateOfBirth: string;
  gender: 'M' | 'F' | 'Other';
  country: string;
  language: 'fr' | 'en' | 'es';
  medicalRecords: MedicalRecord[];
  emergencyContact?: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
  stripe_customer_id?: string;
  subscription: 'free' | 'premium';
  subscriptionEndDate?: number;
}

export interface MedicalRecord {
  id: string;
  type: 'consultation' | 'lab_test' | 'imaging' | 'prescription' | 'other';
  title: string;
  description?: string;
  fileUrl?: string; // NEW - PDF stored in Firebase Storage
  date: number;
  doctor?: {
    id: string;
    name: string;
  };
}

// ============ DOCTOR TYPES ============
export interface Doctor extends BaseUser {
  role: 'doctor';
  phoneNumber: string;
  specialization: string[];
  licenseNumber: string;
  licenseFileUrl: string; // PDF in Firebase Storage
  hospitalAffiliation?: string;
  biography?: string;
  languages: string[];
  consultationFee: number; // €14.99
  isVerified: boolean; // Admin approval status
  isAvailable: boolean;
  lastAvailabilityConfirm?: number;
  consultationsCount: number;
  rating: number; // 0-5
  totalEarnings: number;
  bankAccount?: {
    iban: string;
    bic: string;
  };
}

export interface DoctorAvailability {
  doctorId: string;
  date: string; // YYYY-MM-DD
  timeSlots: TimeSlot[];
  lastConfirmedAt?: number; // When doctor last confirmed they're available
}

export interface TimeSlot {
  id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
  consultationId?: string; // Booked consultation
}

// ============ CONSULTATION TYPES ============
export interface Consultation {
  id: string;
  patientId: string;
  patient: {
    uid: string;
    name: string;
    age: number;
  };
  doctorId?: string;
  doctor?: {
    uid: string;
    name: string;
    specialization: string;
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  expiresAt: number; // 15 minutes from creation
  
  // AI Pre-diagnosis
  preDignosticPDF?: {
    fileUrl: string;
    language: string;
    createdAt: number;
    aiAnalysis: string;
  };
  
  // Doctor Consultation
  diagnosis?: string;
  
  // Prescription
  prescription?: {
    id: string;
    medicines: Medicine[];
    instructions: string;
    prescriptionPDF?: {
      fileUrl: string;
      signedBy: string;
      signatureQR?: string;
      timestamp: number;
    };
  };
  
  // Payment
  pricing: {
    preDignosticCost: number; // €0 (gratuit)
    consultationCost: number; // €14.99
    totalPaid: number;
    stripePyamentIntentId?: string;
    status: 'pending' | 'paid' | 'failed';
  };
  
  // Real-time communication
  rtcSessionId?: string; // WebRTC
  wsSessionId?: string; // WebSocket
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// ============ ADMIN TYPES ============
export interface AdminDashboard {
  adminId: string;
  doctorCandidatures: DoctorCandidature[];
  totalRevenue: number;
  totalConsultations: number;
  activeUsers: number;
}

export interface DoctorCandidature {
  id: string;
  doctorId: string;
  doctor: {
    name: string;
    email: string;
    phone: string;
  };
  specialization: string[];
  licenseFileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  notes?: string;
}

// ============ NOTIFICATION TYPES ============
export interface PushNotification {
  id: string;
  recipientId: string;
  type: 'new_consultation' | 'doctor_accepted' | 'doctor_rejected' | 'consultation_reminder' | 'new_candidature' | 'candidature_approved';
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: number;
  sentAt?: number;
  readAt?: number;
}

// ============ FIREBASE REFERENCES ============
export const FIREBASE_PATHS = {
  // Patients
  PATIENTS: 'patients',
  PATIENT_RECORDS: (patientId: string) => `patients/${patientId}/medicalRecords`,
  PATIENT_CONSULTATIONS: (patientId: string) => `patients/${patientId}/consultations`,
  
  // Doctors
  DOCTORS: 'doctors',
  DOCTOR_AVAILABILITY: (doctorId: string) => `doctors/${doctorId}/availability`,
  DOCTOR_CONSULTATIONS: (doctorId: string) => `doctors/${doctorId}/consultations`,
  
  // Consultations
  CONSULTATIONS: 'consultations',
  CONSULTATION_DETAIL: (consultationId: string) => `consultations/${consultationId}`,
  
  // Admin
  ADMIN: 'admin',
  CANDIDATURES: 'admin/candidatures',
  
  // Notifications
  NOTIFICATIONS: 'notifications',
  USER_NOTIFICATIONS: (userId: string) => `notifications/${userId}`,
};

"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  ArrowLeft, 
  User, 
  FileText, 
  Pill, 
  FileSignature, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  MessageSquare,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, doctorProfile } = useAuth();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Prescription Form
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [newMedicine, setNewMedicine] = useState({ name: "", dosage: "", frequency: "", duration: "" });

  useEffect(() => {
    const fetchConsultation = async () => {
      if (!id) return;
      const docRef = doc(firestore, "consultations", id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConsultation({ id: docSnap.id, ...data });
        setDiagnosis(data.diagnosis || "");
        setMedicines(data.prescription?.medicines || []);
      }
      setLoading(false);
    };

    fetchConsultation();
  }, [id]);

  const addMedicine = () => {
    if (!newMedicine.name) return;
    setMedicines([...medicines, newMedicine]);
    setNewMedicine({ name: "", dosage: "", frequency: "", duration: "" });
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (!diagnosis) return alert("Veuillez entrer un diagnostic.");
    setSubmitting(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      
      // 1. Generate Signed Prescription via Backend
      const response = await fetch(`${backendUrl}/api/generate-prediagnostic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultation.id,
          text: `DIAGNOSTIC:\n${diagnosis}\n\nPRESCRIPTION:\n${medicines.map(m => `- ${m.name}: ${m.dosage} (${m.duration})`).join("\n")}`,
          language: "fr",
          patientName: consultation.patient?.name,
          type: "prescription"
        }),
      });

      const { pdfBase64 } = await response.json();
      
      // 2. Update Firestore
      const docRef = doc(firestore, "consultations", consultation.id);
      await updateDoc(docRef, {
        status: "completed",
        diagnosis,
        completedAt: Timestamp.now().toMillis(),
        "prescription.medicines": medicines,
        "prescription.prescriptionPDF.signedBy": doctorProfile?.displayName,
        "prescription.prescriptionPDF.timestamp": Timestamp.now().toMillis(),
        // Note: In a real app, the backend would upload to Firebase Storage and return the URL
        // Here we simulate the process for the demo
        "prescription.prescriptionPDF.fileUrl": `data:application/pdf;base64,${pdfBase64}`
      });

      router.push("/dashboard/consultations");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation de la consultation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="text-primary w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!consultation) {
    return (
      <DashboardLayout>
        <div className="text-center p-12 glass rounded-3xl border border-dashed border-border">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-white font-bold">Consultation non trouvée.</p>
          <Link href="/dashboard/consultations" className="text-primary text-sm mt-4 inline-block hover:underline">
            Retourner à l'historique
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/consultations" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour à l'historique</span>
          </Link>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
            consultation.status === "completed" ? "text-green-400 bg-green-400/10 border-green-400/20" :
            "text-blue-400 bg-blue-400/10 border-blue-400/20"
          }`}>
            {consultation.status}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Patient & Info */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-3xl border border-border">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-2xl border border-primary/30">
                  {consultation.patient?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{consultation.patient?.name || "Patient"}</h3>
                  <p className="text-slate-500 text-sm">{consultation.patient?.age || "?"} ans</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3 text-slate-400">
                  <User size={18} className="text-primary" />
                  <span className="text-xs">ID: {consultation.patientId}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <FileText size={18} className="text-primary" />
                  <span className="text-xs">Symptômes: {consultation.symptoms || "Non spécifiés"}</span>
                </div>
              </div>
            </div>

            {/* AI Pre-diagnosis link */}
            <div className="glass p-6 rounded-3xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-4 text-primary">
                <Activity size={20} />
                <h4 className="font-bold">Analyse IA eHosp</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Le patient a déjà effectué un prédéiagnostic avec l'IA. Vous pouvez consulter le rapport détaillé pour gagner du temps.
              </p>
              <button className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold py-3 rounded-xl border border-primary/30 transition-all flex items-center justify-center gap-2">
                <FileText size={18} />
                Voir le Rapport (PDF)
                <ExternalLink size={14} />
              </button>
            </div>
          </div>

          {/* Middle/Right Column: Diagnosis & Prescription */}
          <div className="lg:col-span-2 space-y-6">
            {/* Diagnosis Form */}
            <div className="glass p-8 rounded-3xl border border-border space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <MessageSquare className="text-primary" size={24} />
                <h3 className="text-xl font-black text-white">Diagnostic & Observation</h3>
              </div>

              <textarea 
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                readOnly={consultation.status === "completed"}
                className="w-full h-40 bg-background/50 border border-border rounded-2xl p-6 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                placeholder="Décrivez votre diagnostic médical ici..."
              />
            </div>

            {/* Prescription Form */}
            <div className="glass p-8 rounded-3xl border border-border space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4 justify-between">
                <div className="flex items-center gap-3">
                  <Pill className="text-primary" size={24} />
                  <h3 className="text-xl font-black text-white">Ordonnance Numérique</h3>
                </div>
                <div className="px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-[10px] font-bold text-primary uppercase">Sécurisée QR</span>
                </div>
              </div>

              {/* Added Medicines */}
              <div className="space-y-3">
                {medicines.map((med, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index} 
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-border group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Pill size={18} />
                      </div>
                      <div>
                        <p className="text-white font-bold">{med.name}</p>
                        <p className="text-slate-500 text-xs">{med.dosage} • {med.frequency} • {med.duration}</p>
                      </div>
                    </div>
                    {consultation.status !== "completed" && (
                      <button onClick={() => removeMedicine(index)} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Add Medicine Form */}
              {consultation.status !== "completed" && (
                <div className="bg-white/5 p-6 rounded-2xl border border-dashed border-border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Nom du médicament" 
                      value={newMedicine.name}
                      onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                      className="bg-background/50 border border-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    <input 
                      placeholder="Dosage (ex: 500mg)" 
                      value={newMedicine.dosage}
                      onChange={(e) => setNewMedicine({...newMedicine, dosage: e.target.value})}
                      className="bg-background/50 border border-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    <input 
                      placeholder="Fréquence (ex: 1/jour)" 
                      value={newMedicine.frequency}
                      onChange={(e) => setNewMedicine({...newMedicine, frequency: e.target.value})}
                      className="bg-background/50 border border-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    <input 
                      placeholder="Durée (ex: 7 jours)" 
                      value={newMedicine.duration}
                      onChange={(e) => setNewMedicine({...newMedicine, duration: e.target.value})}
                      className="bg-background/50 border border-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={addMedicine}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2 rounded-xl border border-border flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={16} /> Ajouter le médicament
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            {consultation.status !== "completed" && (
              <div className="flex gap-4">
                <button 
                  onClick={() => router.push("/dashboard/consultations")}
                  className="flex-1 glass border border-border text-slate-400 font-bold py-4 rounded-2xl hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleComplete}
                  disabled={submitting || !diagnosis}
                  className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <FileSignature size={24} />
                      Signer & Terminer la Consultation
                    </>
                  )}
                </button>
              </div>
            )}

            {consultation.status === "completed" && consultation.prescription?.prescriptionPDF?.fileUrl && (
              <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 border border-green-500/30">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Consultation Terminée</h4>
                    <p className="text-slate-400 text-sm">L'ordonnance signée est disponible pour le patient.</p>
                  </div>
                </div>
                <a 
                  href={consultation.prescription.prescriptionPDF.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-green-500/20 flex items-center gap-2"
                >
                  <FileText size={18} /> Télécharger PDF
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

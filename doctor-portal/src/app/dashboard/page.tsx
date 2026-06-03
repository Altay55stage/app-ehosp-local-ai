"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Users, 
  Wallet, 
  CalendarCheck, 
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
  ClipboardList
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function DashboardPage() {
  const { user, doctorProfile } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    earnings: 0,
    pending: 0
  });
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for doctor's consultations
    const q = query(
      collection(firestore, "consultations"),
      where("doctorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const consultations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentConsultations(consultations);
      
      // Calculate basic stats (in a real app, these would be separate counters or aggregation results)
      setStats({
        totalPatients: new Set(consultations.map(c => c.patientId)).size,
        totalConsultations: snapshot.size,
        earnings: doctorProfile?.totalEarnings || 0,
        pending: consultations.filter(c => c.status === "pending").length
      });
    });

    return () => unsubscribe();
  }, [user, doctorProfile]);

  const statCards = [
    { name: "Patients Totaux", value: stats.totalPatients, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { name: "Consultations", value: stats.totalConsultations, icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
    { name: "Revenus (70%)", value: `€${stats.earnings.toFixed(2)}`, icon: Wallet, color: "text-green-400", bg: "bg-green-400/10" },
    { name: "En Attente", value: stats.pending, icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Bonjour, Dr. {doctorProfile?.displayName || "Médecin"}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Voici le résumé de votre activité aujourd'hui.</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">+12% cette semaine</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-3xl border border-slate-200 relative overflow-hidden group shadow-sm shadow-slate-100"
            >
              <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <p className="text-slate-500 text-sm font-bold">{stat.name}</p>
              <p className="text-2xl font-black text-foreground mt-1">{stat.value}</p>
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <stat.icon size={80} className="text-foreground" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Consultations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-foreground">Consultations Récentes</h3>
              <Link href="/dashboard/consultations" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                Voir tout <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-4">
              {recentConsultations.length > 0 ? (
                recentConsultations.map((consultation) => (
                  <div key={consultation.id} className="glass p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm shadow-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black border border-primary/20 group-hover:border-primary/50">
                        {consultation.patient?.name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <p className="text-foreground font-bold">{consultation.patient?.name || "Patient Anonyme"}</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1 font-medium mt-0.5">
                          <Clock size={12} />
                          {new Date(consultation.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block">
                        <p className="text-slate-500 text-[10px] uppercase font-bold text-right">Statut</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          consultation.status === "completed" ? "text-green-400 bg-green-400/10" :
                          consultation.status === "pending" ? "text-orange-400 bg-orange-400/10" :
                          "text-blue-400 bg-blue-400/10"
                        }`}>
                          {consultation.status}
                        </span>
                      </div>
                      <Link 
                        href={`/dashboard/consultations/${consultation.id}`}
                        className="p-2 bg-slate-50 hover:bg-primary/10 rounded-xl border border-slate-200 group-hover:border-primary/30 transition-all"
                      >
                        <ExternalLink size={18} className="text-slate-400 group-hover:text-primary" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass p-12 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                  <CalendarCheck size={48} className="mb-4 opacity-20 text-slate-500" />
                  <p className="font-medium">Aucune consultation pour le moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions / Tips */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-foreground">Actions Rapides</h3>
            <div className="space-y-4">
              <button className="w-full glass p-4 rounded-2xl border border-slate-200 hover:bg-primary/5 transition-all text-left flex items-center gap-4 group shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ClipboardList size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-bold text-sm">Nouveau Diagnostic</p>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">Créer une ordonnance manuelle</p>
                </div>
              </button>
              
              <button className="w-full glass p-4 rounded-2xl border border-slate-200 hover:bg-accent/10 transition-all text-left flex items-center gap-4 group shadow-sm">
                <div className="w-10 h-10 bg-accent/30 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Users size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-bold text-sm">Gestion d'équipe</p>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">Gérer vos assistants</p>
                </div>
              </button>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-6 rounded-3xl border border-primary/20 relative overflow-hidden shadow-sm">
              <div className="relative z-10">
                <h4 className="text-primary font-black mb-2 text-lg">Besoin d'aide ?</h4>
                <p className="text-slate-600 text-xs font-medium leading-relaxed">
                  Consultez notre guide de formation pour maîtriser les outils IA d'eHosp et optimiser vos consultations.
                </p>
                <button className="mt-4 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors">
                  Voir le guide
                </button>
              </div>
              <Activity className="absolute -bottom-4 -right-4 w-24 h-24 text-primary/10" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

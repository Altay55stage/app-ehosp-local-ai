"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Eye
} from "lucide-react";
import Link from "next/link";

export default function ConsultationsPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firestore, "consultations"),
      where("doctorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const filteredConsultations = consultations.filter(c => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = c.patient?.name?.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search);
    return matchesFilter && matchesSearch;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "pending": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "cancelled": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "accepted": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} />;
      case "pending": return <Clock size={14} />;
      case "cancelled": return <XCircle size={14} />;
      case "accepted": return <AlertCircle size={14} />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Historique des Consultations</h1>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Rechercher un patient..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 shadow-sm"
              />
            </div>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            >
              <option value="all" className="bg-white text-slate-900">Tous les statuts</option>
              <option value="pending" className="bg-white text-slate-900">En attente</option>
              <option value="accepted" className="bg-white text-slate-900">Acceptées</option>
              <option value="completed" className="bg-white text-slate-900">Terminées</option>
              <option value="cancelled" className="bg-white text-slate-900">Annulées</option>
            </select>
          </div>
        </div>

        <div className="glass rounded-3xl border border-slate-200 overflow-hidden shadow-sm shadow-slate-100">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Honoraires</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredConsultations.length > 0 ? (
                filteredConsultations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20">
                          {c.patient?.name?.charAt(0) || "P"}
                        </div>
                        <span className="text-foreground font-bold">{c.patient?.name || "Anonyme"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">
                      {new Date(c.createdAt).toLocaleString("fr-FR", { 
                        day: "2-digit", 
                        month: "2-digit", 
                        year: "numeric", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(c.status)}`}>
                        {getStatusIcon(c.status)}
                        {c.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground font-black">€10.49</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/dashboard/consultations/${c.id}`}
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-sm transition-colors"
                      >
                        Détails <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                    Aucune consultation trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

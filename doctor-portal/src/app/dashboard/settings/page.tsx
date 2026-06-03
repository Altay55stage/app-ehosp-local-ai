"use client";

import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Wallet, 
  CreditCard, 
  Shield, 
  Lock, 
  User,
  CheckCircle2,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { doctorProfile } = useAuth();

  const transactions = [
    { id: "TX-9901", date: "07 Mai 2025", amount: "€10.49", status: "payé", patient: "M. Lefebvre" },
    { id: "TX-9892", date: "06 Mai 2025", amount: "€10.49", status: "payé", patient: "Mme. Garcia" },
    { id: "TX-9885", date: "05 Mai 2025", amount: "€10.49", status: "payé", patient: "M. Martin" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Paramètres & Portefeuille</h1>

        {/* Earnings Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass p-8 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-medium mb-1">Solde Disponible</p>
              <h2 className="text-5xl font-black text-white mb-6">€{(doctorProfile?.totalEarnings || 0).toFixed(2)}</h2>
              
              <div className="flex gap-4">
                <button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all">
                  Retirer vers la banque
                </button>
                <button className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl border border-border transition-all">
                  Historique complet
                </button>
              </div>
            </div>
            <Wallet className="absolute -bottom-6 -right-6 w-48 h-48 text-primary/5" />
          </div>

          <div className="glass p-8 rounded-3xl border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <TrendingUp size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Croissance</span>
              </div>
              <p className="text-2xl font-black text-white">+€142.50</p>
              <p className="text-slate-500 text-xs mt-1">ce mois-ci</p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-slate-400 text-xs leading-relaxed">
                Votre commission est fixée à 70% par consultation eHosp.
              </p>
            </div>
          </div>
        </div>

        {/* Payout Method */}
        <div className="glass p-8 rounded-3xl border border-border space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="text-primary" size={24} />
              <h3 className="text-xl font-black text-white">Méthode de Virement</h3>
            </div>
            <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
              Modifier <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-white font-bold">Compte Bancaire (IBAN)</p>
                <p className="text-slate-500 text-xs">FR76 **** **** **** **** 4321</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-400/10 rounded-full border border-green-400/20">
              <CheckCircle2 size={12} className="text-green-400" />
              <span className="text-[10px] font-bold text-green-400 uppercase">Vérifié</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-white">Transactions Récentes</h3>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="glass p-4 rounded-2xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400 text-xs font-bold border border-border">
                    {tx.id.split("-")[1]}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{tx.patient}</p>
                    <p className="text-slate-500 text-[10px]">{tx.date} • {tx.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">{tx.amount}</p>
                  <p className="text-green-400 text-[10px] font-bold uppercase tracking-tighter">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

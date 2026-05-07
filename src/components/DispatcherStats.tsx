
import React, { useMemo } from 'react';
import { Mission } from '../types';
import { Truck, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  missions: Mission[];
}

export const DispatcherStats: React.FC<Props> = ({ missions }) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayMissions = missions.filter(m => m.date === today);
    
    return {
      active: todayMissions.filter(m => m.status === 'en cours').length,
      pending: todayMissions.filter(m => m.status === 'en attente').length,
      urgent: todayMissions.filter(m => m.priority === 'Haute' && m.status !== 'finalisé').length,
      revenue: todayMissions.filter(m => m.status !== 'annulé').reduce((acc, m) => acc + m.result.priceHT, 0)
    };
  }, [missions]);

  const cards = [
    { 
      label: 'Missions en cours', 
      value: stats.active, 
      icon: Truck, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20'
    },
    { 
      label: 'Missions en attente', 
      value: stats.pending, 
      icon: Clock, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    },
    { 
      label: 'Urgent à traiter', 
      value: stats.urgent, 
      icon: AlertCircle, 
      color: 'text-red-400', 
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    { 
      label: "Chiffre d'Affaires HT (Aujourd'hui)", 
      value: `${stats.revenue.toFixed(2)} €`, 
      icon: TrendingUp, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          key={idx} 
          className={`p-6 rounded-3xl border ${card.border} ${card.bg} backdrop-blur-sm relative overflow-hidden group`}
        >
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color} opacity-80 group-hover:scale-110 transition-transform`} />
            </div>
            <span className={`text-2xl font-black ${card.color} tracking-tighter`}>{card.value}</span>
          </div>
          <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.bg} blur-[40px] rounded-full opacity-50`} />
        </motion.div>
      ))}
    </div>
  );
};

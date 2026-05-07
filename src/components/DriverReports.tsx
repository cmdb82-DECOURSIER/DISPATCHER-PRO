import React, { useMemo, useState } from 'react';
import { Mission, Staff } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, User, TrendingUp, DollarSign, PieChart as PieChartIcon, Navigation } from 'lucide-react';

interface Props {
  missions: Mission[];
  staff: Staff[];
}

export const DriverReports: React.FC<Props> = ({ missions, staff }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const drivers = useMemo(() => staff.filter(s => s.role === 'Chauffeur'), [staff]);

  const reportData = useMemo(() => {
    return drivers.map(driver => {
      const driverMissions = missions.filter(m => {
        if (m.assignedStaffId !== driver.id) return false;
        if (m.status !== 'finalisé') return false;
        
        // Check if mission is in selected month
        const missionMonth = m.date.slice(0, 7);
        return missionMonth === selectedMonth;
      });

      const totalMissions = driverMissions.length;
      const totalDistance = driverMissions.reduce((acc, m) => acc + (m.request.totalDistance || 0), 0);
      const totalRevenue = driverMissions.reduce((acc, m) => acc + (m.result.priceHT || 0), 0);

      return {
        name: driver.name,
        'Courses Réalisées': totalMissions,
        'Kilométrage (km)': Math.round(totalDistance),
        'Chiffre d\'Affaires (€)': Math.round(totalRevenue)
      };
    });
  }, [missions, drivers, selectedMonth]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="h-full flex flex-col bg-slate-950 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
      <div className="px-8 py-6 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pink-500/20 rounded-2xl">
            <User className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Rapports Chauffeurs</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statistiques mensuelles</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900 border border-white/10 px-5 py-3 rounded-xl">
                <Calendar className="w-4 h-4 text-pink-500" />
                <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-0 text-sm font-black text-white outline-none uppercase tracking-wider"
                />
            </div>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart: Courses Réalisées */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Courses réalisées</h3>
                </div>
                <div className="h-[250px] mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff80', fontSize: 9, fontWeight: 'bold' }} />
                            <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff80', fontSize: 9, fontWeight: 'bold' }} />
                            <Tooltip 
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                            />
                            <Bar dataKey="Courses Réalisées" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart: Chiffre d'Affaires - Hidden */}
            <div className="hidden">
                <div className="flex items-center gap-3 mb-6">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Chiffre d'Affaires (€)</h3>
                </div>
                <div className="h-[250px] mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff80', fontSize: 9, fontWeight: 'bold' }} />
                            <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff80', fontSize: 9, fontWeight: 'bold' }} />
                            <Tooltip 
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                            />
                            <Bar dataKey="Chiffre d'Affaires (€)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart: Répartition */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <PieChartIcon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Répartition des missions</h3>
                </div>
                <div className="h-[250px] mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={reportData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="Courses Réalisées"
                            >
                                {reportData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                formatter={(value) => <span className="text-[9px] font-bold text-slate-400 uppercase">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
            {/* Chart: Kilométrage */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Navigation className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Kilométrage Total (km)</h3>
                </div>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff80', fontSize: 9, fontWeight: 'bold' }} />
                            <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff80', fontSize: 9, fontWeight: 'bold' }} />
                            <Tooltip 
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                            />
                            <Bar dataKey="Kilométrage (km)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-950/50 border-b border-white/5">
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Chauffeur</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Courses Réalisées</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center hidden">Chiffre d'Affaires</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Kilométrage Total</th>
                    </tr>
                </thead>
                <tbody>
                    {reportData.map((data, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 text-sm font-bold text-white">{data.name}</td>
                            <td className="p-4 text-sm font-bold text-emerald-400 text-center">{data['Courses Réalisées']}</td>
                            <td className="p-4 text-sm font-bold text-amber-400 text-center hidden">{data['Chiffre d\'Affaires (€)']} €</td>
                            <td className="p-4 text-sm font-bold text-blue-400 text-right">{data['Kilométrage (km)']} km</td>
                        </tr>
                    ))}
                    {reportData.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-500 text-xs font-black uppercase tracking-widest">Aucune donnée disponible</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

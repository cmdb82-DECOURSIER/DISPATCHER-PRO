import React from 'react';
import { Truck, MapPin, Signal } from 'lucide-react';

const WinfleetTracker: React.FC = () => {
  const vehicles = [
    { id: 'V1', name: 'Coursier 01', status: 'En route', battery: 85, pos: 'Kirchberg' },
    { id: 'V2', name: 'Coursier 02', status: 'Disponible', battery: 92, pos: 'Gare' },
    { id: 'V3', name: 'Coursier 03', status: 'Pause', battery: 45, pos: 'Merl' },
  ];

  return (
    <div className="bg-slate-900/50 rounded-[32px] border border-white/5 overflow-hidden mt-8">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Signal className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Winfleet Live Tracker</h3>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase">
          3 Actifs
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map(v => (
          <div key={v.id} className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#0088CC]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white truncate">{v.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-400 font-bold truncate">{v.pos}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[9px] font-black uppercase ${v.status === 'Disponible' ? 'text-emerald-500' : 'text-blue-400'}`}>
                {v.status}
              </div>
              <div className="text-[10px] font-bold text-slate-600 mt-1">{v.battery}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WinfleetTracker;

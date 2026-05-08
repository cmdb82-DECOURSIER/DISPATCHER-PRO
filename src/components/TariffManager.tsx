import React, { useState } from 'react';
import { Database, Plus, Trash2, RotateCcw } from 'lucide-react';
import { TariffItem } from '../types';

interface Props {
  zones: TariffItem[];
  onUpdateZones: (zones: TariffItem[]) => void;
  destinations: TariffItem[];
  onUpdateDestinations: (dest: TariffItem[]) => void;
  specialRoutes: TariffItem[];
  onUpdateSpecialRoutes: (routes: TariffItem[]) => void;
  onResetToDefaults: () => void;
  currentTeamId: string | null;
  onConnectTeam: (id: string) => void;
}

const TariffManager: React.FC<Props> = ({ 
  zones, 
  destinations, 
  onResetToDefaults,
  currentTeamId,
}) => {
  const [activeTab, setActiveTab] = useState<'zones' | 'destinations' | 'special'>('zones');

  return (
    <div className="bg-slate-900/50 rounded-[40px] border border-white/5 overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="p-8 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-600 rounded-xl">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-widest">Gestionnaire de Tarifs</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zones, Forfaits & Destinations</p>
          </div>
        </div>

        <div className="flex gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'zones' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Zones
          </button>
          <button 
            onClick={() => setActiveTab('destinations')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'destinations' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Destinations
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'zones' ? zones : destinations).map((item: TariffItem) => (
            <div key={item.id} className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between group">
              <div>
                <div className="text-sm font-black text-white">{item.name}</div>
                <div className="text-xs font-bold text-purple-500 mt-1">{item.price.toFixed(2)}€</div>
              </div>
              <button className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button className="p-4 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-purple-500/50 hover:text-purple-500 transition-all">
            <Plus className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ajouter</span>
          </button>
        </div>
      </div>
      
      <div className="p-6 border-t border-white/5 bg-slate-950/30 flex justify-between items-center">
        <button 
            onClick={onResetToDefaults}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
        >
            <RotateCcw className="w-4 h-4" /> Réinitialiser
        </button>
        
        <div className="flex items-center gap-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Team ID: {currentTeamId || 'Local'}</div>
            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                Sauvegarder
            </button>
        </div>
      </div>
    </div>
  );
};

export default TariffManager;

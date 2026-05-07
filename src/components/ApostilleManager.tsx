import React, { useState } from 'react';
import { ApostilleRequest, ApostilleStatus, Mission, QuoteRequest } from '../types';
import { countries } from '../data/countries';
import { useSignatories } from '../hooks/useSignatories';
import { maeDocumentTypes } from '../data/mae_options';

interface Props {
  apostilles: ApostilleRequest[];
  missions: Mission[];
  onUpdateApostille: (a: ApostilleRequest) => void;
  onUpdateMission: (m: Mission) => void;
}

export const ApostilleManager: React.FC<Props> = ({ apostilles, missions, onUpdateApostille, onUpdateMission }) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<QuoteRequest | null>(null);
  const { signatories } = useSignatories();

  const sortedApostilles = [...apostilles].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = sortedApostilles.filter(a => a.reference.toLowerCase().includes(search.toLowerCase()));

  const groupedByDay = filtered.reduce((acc, a) => {
    const day = new Date(a.createdAt).toLocaleDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(a);
    return acc;
  }, {} as Record<string, ApostilleRequest[]>);

  const getStatusColor = (status: ApostilleStatus) => {
    switch (status) {
      case 'fini': return 'text-emerald-500';
      case 'en attente': return 'text-amber-500';
      case 'en cours de traitement': return 'text-sky-500';
      case 'refusee': return 'text-red-500';
      case 'remboursée': return 'text-blue-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5">
        <input 
          type="text" 
          placeholder="Rechercher par référence..." 
          className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#0088CC]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {Object.entries(groupedByDay).map(([day, dayApostilles]) => (
        <div key={day} className="space-y-2">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2 mb-2">{day}</h3>
          <div className="bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden">
          {dayApostilles.map(a => {
            const mission = missions.find(m => m.id === a.missionId);
            const req = mission?.request;
            const isEditing = editingId === a.id;

            const handleSave = () => {
              if (mission && editData) {
                onUpdateMission({ ...mission, request: { ...mission.request, ...editData } });
                setEditingId(null);
                setEditData(null);
              }
            };

            const clientName = req?.client?.name || req?.stops?.[0]?.clientName || '-';
            const nbDossiers = req?.maeDocuments?.reduce((acc, doc) => acc + (doc.signatureCount || 1), 0) || 0;
            const pays = req?.maeDocuments?.[0]?.country || req?.maeCountry || '-';
            const signataire = req?.maeDocuments?.[0]?.signatory || '-';
            const typeDocs = req?.maeDocuments?.map(d => d.documentType).filter(Boolean).join(', ') || '-';

            return (
              <div key={a.id} className={`group flex items-center justify-between gap-4 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-sm font-light text-slate-300`}>
                {isEditing ? (
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <span className="font-medium text-white uppercase flex-shrink-0">{clientName}</span>
                        <select className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 w-24 flex-shrink-0" value={editData?.maeDocuments?.[0]?.country || editData?.maeCountry || ''} onChange={e => setEditData(prev => prev ? {...prev, maeCountry: e.target.value, maeDocuments: prev.maeDocuments?.length ? prev.maeDocuments.map(d => ({...d, country: e.target.value})) : [{ id: Math.random().toString(36).substr(2, 9), country: e.target.value, signatory: '', documentType: '', signatureCount: 0, price: 0 }]} : null)}>
                            <option value="" className="bg-slate-900">Pays...</option>
                            {countries.map(c => <option key={c.name} value={c.name} className="bg-slate-900">{c.name}</option>)}
                        </select>
                        <select className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 w-32 flex-shrink-0" value={editData?.maeDocuments?.[0]?.signatory || ''} onChange={e => setEditData(prev => prev ? {...prev, maeDocuments: prev.maeDocuments?.length ? prev.maeDocuments.map((d, i) => i === 0 ? {...d, signatory: e.target.value} : d) : [{ id: Math.random().toString(36).substr(2, 9), country: prev.maeCountry || '', signatory: e.target.value, documentType: '', signatureCount: 0, price: 0 }]} : null)}>
                            <option value="" className="bg-slate-900">Signataire...</option>
                            {signatories.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                        </select>
                        <select className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 w-24 flex-shrink-0" value={editData?.maeType || ''} onChange={e => setEditData(prev => prev ? {...prev, maeType: e.target.value as 'apostille' | 'legalisation'} : null)}>
                            <option value="apostille" className="bg-slate-900">Apostille</option>
                            <option value="legalisation" className="bg-slate-900">Légalisation</option>
                        </select>
                        <select className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 w-32 flex-shrink-0" value={editData?.maeDocuments?.[0]?.documentType || ''} onChange={e => setEditData(prev => prev ? {...prev, maeDocuments: prev.maeDocuments?.length ? prev.maeDocuments.map((d, i) => i === 0 ? {...d, documentType: e.target.value} : d) : [{ id: Math.random().toString(36).substr(2, 9), country: prev.maeCountry || '', signatory: '', documentType: e.target.value, signatureCount: 0, price: 0 }]} : null)}>
                            <option value="" className="bg-slate-900">Type doc...</option>
                            {maeDocumentTypes.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 flex-1 overflow-hidden whitespace-nowrap">
                        <span className="font-medium text-white uppercase flex-shrink-0">{clientName}</span>
                        <span className="text-slate-600 flex-shrink-0">•</span>
                        <span className="flex-shrink-0">{nbDossiers} doc(s)</span>
                        <span className="text-slate-600 flex-shrink-0">•</span>
                        <span className="uppercase truncate max-w-[100px]">{pays}</span>
                        <span className="text-slate-600 flex-shrink-0">•</span>
                        <span className="flex-shrink-0">{signataire}</span>
                        <span className="text-slate-600 flex-shrink-0">•</span>
                        <span className="truncate text-slate-400 max-w-[200px]">{typeDocs}</span>
                    </div>
                )}
                
                <div className="flex items-center gap-3 flex-shrink-0">
                    <input 
                        type="text" 
                        placeholder="Réf..."
                        className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 w-40 focus:w-64 transition-all duration-300"
                        value={a.reference}
                        onChange={(e) => onUpdateApostille({ ...a, reference: e.target.value })}
                    />
                    <input 
                        type="text" 
                        placeholder="Remarques..."
                        className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 w-32 focus:w-96 transition-all duration-300"
                        value={a.remarks || ''}
                        onChange={(e) => onUpdateApostille({ ...a, remarks: e.target.value })}
                    />
                    <select 
                        value={a.status}
                        onChange={(e) => onUpdateApostille({ ...a, status: e.target.value as ApostilleStatus })}
                        className={`bg-transparent border border-white/10 rounded px-2 py-1 text-xs font-medium outline-none focus:border-cyan-500 cursor-pointer ${getStatusColor(a.status)}`}
                    >
                        <option value="en attente" className="bg-slate-900 text-amber-500">En attente</option>
                        <option value="en cours de traitement" className="bg-slate-900 text-sky-500">En cours</option>
                        <option value="fini" className="bg-slate-900 text-emerald-500">Fini</option>
                        <option value="refusee" className="bg-slate-900 text-red-500">Refusée</option>
                        <option value="remboursée" className="bg-slate-900 text-blue-500">Remboursée</option>
                    </select>
                    {isEditing ? (
                        <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-400 text-xs font-medium px-2">OK</button>
                    ) : (
                        <button onClick={() => { setEditingId(a.id); setEditData(req || null); }} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium px-2 transition-opacity">Éditer</button>
                    )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ))}
    </div>
  );
};

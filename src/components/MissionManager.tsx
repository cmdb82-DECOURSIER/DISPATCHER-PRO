import React, { useState, useMemo, useEffect } from 'react';
import { Mission, MissionStatus, MissionPriority, Staff, Client, BillingProfile, MaeDocument } from '../types';
import { Calendar, Archive, ChevronDown, Send, Filter, User, ChevronRight, Search, Truck, Car, ReceiptEuro, CheckCircle2, X, Plus, Copy, Clock, Timer, Upload } from 'lucide-react';
import { countries } from '../data/countries';
import { maeDocumentTypes } from '../data/mae_options';
import { useSignatories } from '../hooks/useSignatories';
import { motion, AnimatePresence } from 'motion/react';

const CountdownTimer = ({ targetTime, targetDate }: { targetTime: string, targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const [hours, minutes] = targetTime.split(':').map(Number);
            const target = new Date(targetDate);
            target.setHours(hours, minutes, 0, 0);

            const diff = target.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('EXPIRÉ');
                setIsUrgent(true);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            if (h === 0 && m < 15) {
                setIsUrgent(true);
            } else {
                setIsUrgent(false);
            }

            setTimeLeft(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [targetTime, targetDate]);

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-black text-[10px] tracking-wider ${isUrgent ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
            <Timer className="w-3 h-3" />
            <span>{timeLeft}</span>
        </div>
    );
};

const RemindersSection = ({ missions }: { missions: Mission[] }) => {
    const preciseMissions = useMemo(() => {
        return missions
            .filter(m => m.request.isPreciseTime && (m.status === 'en attente' || m.status === 'en cours'))
            .sort((a, b) => {
                const timeA = a.request.preciseTimeValue || a.time;
                const timeB = b.request.preciseTimeValue || b.time;
                return timeA.localeCompare(timeB);
            });
    }, [missions]);

    if (preciseMissions.length === 0) return null;

    return (
        <div className="mb-8 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6600]/20 flex items-center justify-center text-[#FF6600] border border-[#FF6600]/30 shadow-lg shadow-[#FF6600]/10">
                    <Timer className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Rappels de Courses Précises</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Missions avec horaires impératifs</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {preciseMissions.map(mission => (
                    <div key={`reminder-${mission.id}`} className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 hover:border-[#FF6600]/50 transition-all group relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6600]/5 blur-[40px] -mr-12 -mt-12 group-hover:bg-[#FF6600]/10 transition-all" />
                        
                        <div className="flex items-start justify-between mb-3 relative z-10">
                            <span className="text-[9px] font-black text-[#FF6600] uppercase tracking-tighter">#{mission.missionNumber}</span>
                            <CountdownTimer 
                                targetTime={mission.request.preciseTimeValue || mission.time} 
                                targetDate={mission.request.selectedDate || mission.date} 
                            />
                        </div>

                        <div className="space-y-4 relative z-10">
                            {/* Route Info */}
                            <div className="space-y-3">
                                {/* Pick up */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <h3 className="text-[10px] font-black text-yellow-400 uppercase truncate">
                                            {mission.request.stops[0]?.clientName || mission.request.client?.name || 'Pick-up'}
                                        </h3>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-medium pl-3.5 truncate">
                                        {mission.request.stops[0]?.address}
                                    </p>
                                </div>

                                {/* Destinataire */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shrink-0" />
                                        <h3 className="text-[10px] font-black text-yellow-400 uppercase truncate">
                                            {mission.request.stops[mission.request.stops.length - 1]?.clientName || 'Destinataire'}
                                        </h3>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-medium pl-3.5 truncate">
                                        {mission.request.stops[mission.request.stops.length - 1]?.address}
                                    </p>
                                </div>
                            </div>

                            {/* Times */}
                            <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
                                {mission.request.pickupTimeValue && (
                                    <div className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PICK UP HEURE CLIENT</span>
                                        <span className="text-[10px] font-black text-white">{mission.request.pickupTimeValue}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between bg-[#FF6600]/10 px-2 py-1.5 rounded-lg border border-[#FF6600]/20">
                                    <span className="text-[8px] font-black text-[#FF6600] uppercase tracking-widest">HEURE DE LIVRAISON DESTINATAIRE</span>
                                    <span className="text-[10px] font-black text-white">{mission.request.preciseTimeValue || mission.time}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface Props {
  missions: Mission[];
  staff: Staff[];
  clients: Client[];
  billingProfiles: BillingProfile[];
  onUpdateMission: (mission: Mission) => void;
  onDeleteMission: (id: string) => void;
}

export const MissionManager: React.FC<Props> = ({ missions, staff = [], clients = [], billingProfiles = [], onUpdateMission }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'history' | 'driver'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<MissionStatus | 'all'>('all');
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isEditingClient, setIsEditingClient] = useState<string | null>(null);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  
  const { signatories, addSignatories } = useSignatories();

  const handleImportSignatories = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        
        const importedNames: string[] = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (Array.isArray(row)) {
                const name = row.find(cell => typeof cell === 'string' && cell.trim().length > 0);
                if (name) {
                    importedNames.push(name.trim());
                }
            }
        }

        if (importedNames.length > 0) {
            addSignatories(importedNames);
            alert(`${importedNames.length} signataires importés avec succès.`);
        } else {
            alert("Aucun signataire trouvé dans le fichier.");
        }
      } catch (error) {
        console.error("Erreur lors de l'importation:", error);
        alert("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  const handleAddMaeDocument = (mission: Mission) => {
    const currentDocs = mission.request.maeDocuments || [];
    const defaultCountry = currentDocs[0]?.country || mission.request.maeCountry || '';
    const newDoc: MaeDocument = {
        id: Math.random().toString(36).substr(2, 9),
        country: defaultCountry,
        signatory: '',
        documentType: '',
        signatureCount: 0,
        price: 0
    };
    onUpdateMission({
        ...mission,
        request: {
            ...mission.request,
            maeDocuments: [...currentDocs, newDoc]
        }
    });
  };

  const handleUpdateMaeDocument = (mission: Mission, docId: string, field: keyof MaeDocument, value: string | number) => {
    const currentDocs = mission.request.maeDocuments || [];
    const updatedDocs = currentDocs.map(doc => {
        if (doc.id === docId) {
            const updatedDoc = { ...doc, [field]: value };
            if (field === 'signatureCount') {
                updatedDoc.price = (value as number) * 20;
            }
            return updatedDoc;
        }
        return doc;
    });
    onUpdateMission({
        ...mission,
        request: {
            ...mission.request,
            maeDocuments: updatedDocs
        }
    });
  };

  const handleRemoveMaeDocument = (mission: Mission, docId: string) => {
    const currentDocs = mission.request.maeDocuments || [];
    onUpdateMission({
        ...mission,
        request: {
            ...mission.request,
            maeDocuments: currentDocs.filter(d => d.id !== docId)
        }
    });
  };

  const filteredMissions = useMemo(() => {
    let filtered = missions;

    if (viewMode === 'daily' || viewMode === 'driver') {
      filtered = filtered.filter(m => m.date === selectedDate);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    // Sort by time for daily view, or by createdAt asc for history/driver
    if (viewMode === 'daily') {
        return filtered.sort((a, b) => {
            const timeCompare = a.time.localeCompare(b.time);
            if (timeCompare !== 0) return timeCompare;
            return a.createdAt - b.createdAt;
        });
    } else {
        return filtered.sort((a, b) => a.createdAt - b.createdAt);
    }
  }, [missions, viewMode, selectedDate, filterStatus]);

  const getStatusColor = (status: MissionStatus) => {
    switch (status) {
      case 'en attente': return 'bg-yellow-500/40 text-yellow-200 border-yellow-500/50';
      case 'en cours': return 'bg-cyan-500/40 text-cyan-200 border-cyan-500/50';
      case 'finalisé': return 'bg-emerald-500/40 text-emerald-200 border-emerald-500/50';
      case 'annulé': return 'bg-pink-500/40 text-pink-200 border-pink-500/50';
      default: return 'bg-slate-800/50 text-slate-300 border-slate-700';
    }
  };

  const getCardBackground = (mission: Mission) => {
    const isExpanded = expandedMissionId === mission.id;
    
    switch (mission.status) {
      case 'en attente':
        return isExpanded ? 'bg-yellow-500/30' : 'bg-yellow-500/15 hover:bg-yellow-500/25';
      case 'en cours':
        return isExpanded ? 'bg-cyan-500/30' : 'bg-cyan-500/15 hover:bg-cyan-500/25';
      case 'finalisé':
        return isExpanded ? 'bg-emerald-500/30' : 'bg-emerald-500/15 hover:bg-emerald-500/25';
      case 'annulé':
        return isExpanded ? 'bg-pink-500/30' : 'bg-pink-500/15 hover:bg-pink-500/25';
      default:
        return isExpanded ? 'bg-[#1A1A1A]' : 'hover:bg-[#1A1A1A] transition-colors';
    }
  };

  const getPriorityColor = (priority: MissionPriority) => {
    switch (priority) {
      case 'Haute': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Moyenne': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Basse': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-500';
    }
  };

  const handleStatusChange = (mission: Mission, newStatus: MissionStatus) => {
    onUpdateMission({ ...mission, status: newStatus });
  };

  const handlePriorityChange = (mission: Mission, newPriority: MissionPriority) => {
    onUpdateMission({ ...mission, priority: newPriority });
  };

  const handleAssignStaff = (mission: Mission, staffId: string) => {
    onUpdateMission({ ...mission, assignedStaffId: staffId });
  };

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppText, setWhatsAppText] = useState('');

  const handleCopyMissionToDriver = (mission: Mission) => {
    const stops = mission.request.stops;
    const isUrgent = mission.priority === 'Haute';
    const isPrecise = mission.request.isPreciseTime;
    const isBig = mission.request.isBigVolume;
    
    let text = '';
    
    if (isUrgent || isPrecise || isBig) {
        const activeModules = [];
        if (isUrgent) activeModules.push('🚨 URGENT');
        if (isPrecise) activeModules.push('⏰ HORAIRE PRÉCIS');
        if (isBig) activeModules.push('📦 GROS VOLUME');
        if (mission.request.returnToStart) activeModules.push('🔄 ALLER RETOUR');
        
        if (activeModules.length > 0) {
            text += `*${activeModules.join(' / ')}*\n\n`;
        }
    }

    text += `🔢 *Mission N°:* ${mission.missionNumber}\n`;
    text += `📅 *Date:* ${mission.request.selectedDate}\n`;
    if (mission.request.isPreciseTime) {
        text += `⏰ *Pick-up:* ${mission.request.pickupTimeValue || 'Non spécifié'}\n`;
        text += `⏰ *Livraison:* ${mission.request.preciseTimeValue || 'Non spécifié'}\n`;
    } else {
        text += `⏰ *Heure:* ${mission.request.selectedTime}\n`;
    }
    text += `\n`;
    
    text += `📍 *DÉPART:*\n`;
    const client = mission.request.client;
    text += `*CLIENT ${stops[0]?.clientName || client?.name || 'Client'}*`;
    if (client?.clientNumber) text += ` #${client.clientNumber}`;
    else if (stops[0]?.reference) text += ` #${stops[0].reference}`;
    if (client?.phone) text += ` ${client.phone}`;
    text += `\n${stops[0]?.address || 'N/A'}\n\n`;

    text += `🏁 *ARRIVÉE:*\n`;
    const lastStop = stops[stops.length - 1];
    const isMae = mission.request.isMae || lastStop?.clientName === 'MAE';
    text += `*${isMae ? 'MAE' : (lastStop?.clientName || 'Destinataire')}*`;
    if (lastStop?.reference) text += ` 🔖 Réf: ${lastStop.reference}`;
    
    const displayCountry = mission.request.maeDocuments?.[0]?.country || mission.request.maeCountry;
    if (isMae && displayCountry) {
        text += ` ( pays ${displayCountry.toUpperCase()} )`;
    }
    text += `\n${lastStop?.address || 'N/A'}\n`;

    if (mission.request.returnToStart) {
        text += `\n🔄 *RETOUR AU DÉPART REQUIS*`;
    }

    if (mission.request.instructions) {
        text += `\n\n📝 *NOTES:*\n${mission.request.instructions}`;
    }

    setWhatsAppText(text);
    setIsWhatsAppModalOpen(true);
  };

  /* Unused sendToWhatsApp removed */

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-xl border border-[#2A2A2A] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2A2A2A] bg-[#121212] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <Archive className="w-5 h-5 text-slate-300" />
            </div>
            <div>
                <h2 className="text-sm font-medium text-slate-200 uppercase tracking-[0.15em] leading-none mb-1">Dispatch Center</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Gestion des courses & Planning</p>
            </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1A1A1A] p-1 rounded-lg border border-[#2A2A2A]">
            <button 
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'daily' ? 'bg-[#2A2A2A] text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-[#222]'}`}
            >
                <Calendar className="w-3.5 h-3.5" /> Journalier
            </button>
            <button 
                onClick={() => setViewMode('history')}
                className={`px-4 py-2 rounded text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'history' ? 'bg-[#2A2A2A] text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-[#222]'}`}
            >
                <Archive className="w-3.5 h-3.5" /> Historique
            </button>
            <button 
                onClick={() => setViewMode('driver')}
                className={`px-4 py-2 rounded text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'driver' ? 'bg-[#2A2A2A] text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-[#222]'}`}
            >
                <User className="w-3.5 h-3.5" /> Chauffeurs
            </button>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="px-5 py-3 border-b border-[#2A2A2A] bg-[#121212] flex flex-wrap gap-4 items-center justify-between">
        {viewMode === 'daily' && (
            <div className="flex items-center gap-2">
                <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1.5 hover:bg-[#1A1A1A] rounded text-slate-500 transition-colors"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                
                <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-0 text-xs font-medium text-slate-200 outline-none uppercase tracking-wider"
                    />
                </div>

                <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1.5 hover:bg-[#1A1A1A] rounded text-slate-500 transition-colors"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
            </div>
        )}

        {viewMode === 'driver' && (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-0 text-xs font-medium text-slate-200 outline-none uppercase tracking-wider"
                    />
                </div>
            </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as MissionStatus | 'all')}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-3 py-1.5 text-[10px] font-medium text-slate-300 outline-none focus:border-slate-500 uppercase tracking-wider"
            >
                <option value="all">Tous les statuts</option>
                <option value="en attente">En Attente</option>
                <option value="en cours">En Cours</option>
                <option value="finalisé">Finalisé</option>
                <option value="annulé">Annulé</option>
            </select>
        </div>
      </div>

      {/* Missions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
        {viewMode !== 'driver' && <div className="p-4"><RemindersSection missions={missions} /></div>}
        {filteredMissions.length === 0 && viewMode !== 'driver' ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <Archive className="w-16 h-16 mb-4" />
                <p className="text-sm font-medium uppercase tracking-[0.15em]">Aucune mission trouvée</p>
            </div>
        ) : (
            <div className="w-full">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#2A2A2A] text-[10px] uppercase tracking-[0.1em] text-slate-500 bg-[#1A1A1A]">
                            <th className="py-2 px-4 font-medium w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-[#333] bg-[#121212] text-[#0088CC] focus:ring-[#0088CC]" 
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedMissions(filteredMissions.map(m => m.id));
                                        } else {
                                            setSelectedMissions([]);
                                        }
                                    }}
                                    checked={selectedMissions.length > 0 && selectedMissions.length === filteredMissions.length}
                                />
                            </th>
                            <th className="py-2 px-4 font-medium w-24">Heure</th>
                            <th className="py-2 px-4 font-medium w-24">Mission</th>
                            <th className="py-2 px-4 font-medium w-48">Client</th>
                            <th className="py-2 px-4 font-medium">Itinéraire</th>
                            <th className="py-2 px-4 font-medium w-32">Chauffeur</th>
                            <th className="py-2 px-4 font-medium w-24">Statut</th>
                            <th className="py-2 px-4 font-medium w-12 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-slate-300">
                        {(viewMode === 'driver' ? staff.filter(s => s.role === 'Chauffeur').flatMap(driver => {
                            const driverMissions = filteredMissions.filter(m => m.assignedStaffId === driver.id);
                            if (driverMissions.length === 0) return [ { isDriverHeader: true, driver, stats: { total: 0, done: 0 } } ];
                            return [ { isDriverHeader: true, driver, stats: { total: driverMissions.length, done: driverMissions.filter(m => m.status === 'finalisé').length } }, ...driverMissions ];
                        }) : filteredMissions).map((item) => {
                            if ('isDriverHeader' in item) {
                                return (
                                    <tr key={`header-${item.driver.id}`} className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                                        <td colSpan={8} className="py-2 px-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-4 h-4 text-emerald-500" />
                                                        <span className="font-bold text-slate-200 uppercase tracking-wider">{item.driver.name}</span>
                                                        <span className="text-[10px] text-slate-500">{item.stats.total} mission(s)</span>
                                                    </div>
                                                    
                                                    {item.stats.total > 0 && (
                                                        <div className="flex items-center gap-3 w-48">
                                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                                                <div 
                                                                    className="h-full bg-emerald-500 transition-all duration-500"
                                                                    style={{ width: `${(item.stats.done / item.stats.total) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-500 tracking-tighter">
                                                                {Math.round((item.stats.done / item.stats.total) * 100)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{item.stats.done} terminées</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            const mission = item as Mission;
                            const displayCountry = mission.request.maeDocuments?.[0]?.country || mission.request.maeCountry;
                            const stopsText = mission.request.stops.map((stop, index) => {
                                let text = '';
                                if (index === 0) {
                                    const client = mission.request.client;
                                    text += `CLIENT ${stop.clientName || client?.name || 'Client'}`;
                                    if (client?.clientNumber) text += ` #${client.clientNumber}`;
                                    else if (stop.reference) text += ` #${stop.reference}`;
                                    if (client?.phone) text += ` ${client.phone}`;
                                    text += ` ${stop.address || ''}`;
                                } else if (index === mission.request.stops.length - 1) {
                                    const isMae = stop.isMae || stop.clientName === 'MAE';
                                    text += `${isMae ? 'MAE ' : (stop.clientName ? stop.clientName + ' ' : '')}${stop.address || ''}`;
                                    if (isMae && displayCountry) {
                                        text += ` ( pays ${displayCountry.toUpperCase()} )`;
                                    }
                                } else {
                                    return null;
                                }
                                return text.trim();
                            }).filter(Boolean).join(' -> ');
                            const activeModules = [];
                            if (mission.request.isUrgent) activeModules.push('URGENT');
                            if (mission.request.isPreciseTime) {
                                const times = [];
                                if (mission.request.pickupTimeValue) times.push(`PU: ${mission.request.pickupTimeValue}`);
                                if (mission.request.preciseTimeValue) times.push(`LIV: ${mission.request.preciseTimeValue}`);
                                const timeStr = times.length > 0 ? ` (${times.join(' / ')})` : '';
                                activeModules.push(`HORAIRE PRÉCIS${timeStr}`);
                            }
                            if (mission.request.isBigVolume) activeModules.push('GROS VOLUME');
                            if (mission.request.returnToStart) activeModules.push('ALLER RETOUR');

                            const copyText = activeModules.length > 0 
                                ? `${stopsText} -> ${activeModules.join(' / ')}`
                                : stopsText;

                            return (
                                <React.Fragment key={mission.id}>
                                    <tr 
                                        className={`border-b border-[#2A2A2A] transition-colors cursor-pointer group ${getCardBackground(mission)}`}
                                        onClick={() => setExpandedMissionId(expandedMissionId === mission.id ? null : mission.id)}
                                    >
                                        <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-[#333] bg-[#121212] text-[#0088CC] focus:ring-[#0088CC]" 
                                                checked={selectedMissions.includes(mission.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedMissions(prev => [...prev, mission.id]);
                                                    } else {
                                                        setSelectedMissions(prev => prev.filter(id => id !== mission.id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-slate-200">{new Date(mission.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                {mission.request.isPreciseTime && mission.request.pickupTimeValue && (
                                                    <span className="text-[9px] text-[#B8860B] font-bold">PU: {mission.request.pickupTimeValue}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-[#B8860B]">#{mission.missionNumber}</span>
                                                <span className="text-[9px] text-slate-500 uppercase">{mission.request.vehicleId === 'camionnette' ? 'Camionnette' : 'Voiture'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-slate-200">{mission.request.client?.name || mission.request.stops[0]?.clientName || 'Client'}</span>
                                                {mission.request.reference && <span className="text-[9px] text-slate-500">Réf: {mission.request.reference}</span>}
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex items-center justify-between gap-4">
                                                {mission.request.pricingMode === 'text' ? (
                                                    <div className="flex items-center gap-2 truncate max-w-[300px]">
                                                        <span className="text-[9px] text-[#4682B4] font-bold uppercase">TEXTE LIBRE</span>
                                                        <span className="text-[10px] text-slate-400 truncate italic">"{mission.request.instructions}"</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                                                        {mission.priority === 'Haute' && <span className="text-[8px] font-bold uppercase bg-rose-900/30 text-rose-400 px-1 rounded border border-rose-900/50 shrink-0">URGENT</span>}
                                                        {mission.request.stops.map((stop, idx) => {
                                                            const isLast = idx === mission.request.stops.length - 1;
                                                            const isMae = stop.isMae || stop.clientName === 'MAE';
                                                            const displayCountry = mission.request.maeDocuments?.[0]?.country || mission.request.maeCountry;
                                                            
                                                            return (
                                                                <React.Fragment key={idx}>
                                                                    <span className="flex items-center gap-1.5" title={`${stop.clientName || ''} - ${stop.address || ''}`}>
                                                                        {stop.clientName && <span className="font-bold text-slate-200 border-b border-slate-700">{stop.clientName}</span>}
                                                                        <span className="text-slate-400 max-w-[120px] truncate">{stop.address || 'N/A'}</span>
                                                                        {isLast && isMae && displayCountry && (
                                                                            <span className="text-[#FF6600] font-black text-[9px] uppercase tracking-tighter">({displayCountry})</span>
                                                                        )}
                                                                    </span>
                                                                    {idx < mission.request.stops.length - 1 && (
                                                                        <div className="w-4 h-px bg-slate-800 mx-1 shrink-0" />
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                        {mission.request.returnToStart && <span className="text-[8px] bg-rose-900/30 text-rose-400 px-1 rounded border border-rose-900/50 shrink-0">AR</span>}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(copyText);
                                                    }}
                                                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors shrink-0"
                                                    title="Copier le texte de la course"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            <select 
                                                value={mission.assignedStaffId || ''}
                                                onChange={(e) => handleAssignStaff(mission, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-transparent border border-[#333] rounded px-2 py-1 text-[10px] font-medium text-slate-300 outline-none w-full focus:border-[#4682B4] hover:bg-[#222]"
                                            >
                                                <option value="">Attribuer...</option>
                                                {staff.filter(s => s.status === 'actif').map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            <select
                                                value={mission.status}
                                                onChange={(e) => handleStatusChange(mission, e.target.value as MissionStatus)}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider inline-block border outline-none cursor-pointer ${getStatusColor(mission.status)}`}
                                            >
                                                <option value="en attente" className="bg-slate-900 text-yellow-500">EN ATTENTE</option>
                                                <option value="en cours" className="bg-slate-900 text-cyan-500">EN COURS</option>
                                                <option value="finalisé" className="bg-slate-900 text-emerald-500">FINALISÉ</option>
                                                <option value="annulé" className="bg-slate-900 text-pink-500">ANNULÉ</option>
                                            </select>
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap text-right">
                                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform inline-block ${expandedMissionId === mission.id ? 'rotate-180' : ''}`} />
                                        </td>
                                    </tr>
                                    {expandedMissionId === mission.id && (
                                        <tr className="bg-[#1A1A1A]">
                                            <td colSpan={8} className="p-0 border-b border-[#0088CC]/30 border-l-2 border-l-[#0088CC]">
                                                <div className="p-6 animate-in slide-in-from-top-1 bg-gradient-to-br from-[#1A1A1A] to-[#121212]">
                            <div className="mb-6 bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Ligne de Copie Rapide</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 text-[11px] font-bold text-sky-400 bg-sky-400/5 px-4 py-2.5 rounded-lg border border-sky-400/10 select-all cursor-text font-mono truncate">
                                        {copyText}
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(copyText);
                                        }}
                                        className="p-2.5 bg-sky-400/10 hover:bg-sky-400/20 text-sky-400 rounded-lg border border-sky-400/10 transition-all active:scale-95 flex items-center gap-2"
                                        title="Copier la ligne"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Copier</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mission</p>
                                        <p className="text-lg font-black text-white">#{mission.missionNumber}</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Générée à</p>
                                        <p className="text-lg font-black text-[#FF6600]">{new Date(mission.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</p>
                                        <p className="text-lg font-black text-white">{mission.date}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Column 1: Client & Route Info */}
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client</h4>
                                            <button 
                                                onClick={() => {
                                                    setIsEditingClient(isEditingClient === mission.id ? null : mission.id);
                                                    setClientSearch(mission.request.client?.name || '');
                                                }}
                                                className="text-[10px] font-black text-[#0088CC] uppercase hover:underline"
                                            >
                                                {isEditingClient === mission.id ? 'Annuler' : 'Modifier'}
                                            </button>
                                        </div>
                                        
                                        {isEditingClient === mission.id ? (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input 
                                                        type="text"
                                                        value={clientSearch}
                                                        onChange={(e) => setClientSearch(e.target.value)}
                                                        placeholder="Rechercher ou saisir nom..."
                                                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0088CC]"
                                                    />
                                                </div>
                                                
                                                <div className="max-h-40 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl divide-y divide-white/5">
                                                    {/* Filtered clients from database */}
                                                    {clients
                                                        .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                        .map(c => (
                                                            <button 
                                                                key={c.id}
                                                                onClick={() => {
                                                                    onUpdateMission({
                                                                        ...mission,
                                                                        request: {
                                                                            ...mission.request,
                                                                            client: c
                                                                        }
                                                                    });
                                                                    setIsEditingClient(null);
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
                                                            >
                                                                <p className="text-xs font-black text-white">{c.name}</p>
                                                                <p className="text-[10px] text-slate-500">{c.phone || c.email || 'Base de données'}</p>
                                                            </button>
                                                        ))
                                                    }
                                                    
                                                    {/* Option for manual entry if there's text */}
                                                    {clientSearch.length > 0 && (
                                                        <button 
                                                            onClick={() => {
                                                                onUpdateMission({
                                                                    ...mission,
                                                                    request: {
                                                                        ...mission.request,
                                                                        client: { name: clientSearch, phone: '', email: '' }
                                                                    }
                                                                });
                                                                setIsEditingClient(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
                                                        >
                                                            <p className="text-xs font-black text-white">Utiliser : "{clientSearch}"</p>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Saisie manuelle</p>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl border border-white/5">
                                                <User className="w-5 h-5 text-[#0088CC]" />
                                                <div>
                                                    <p className="text-lg font-black text-yellow-400">{mission.request.client?.name || mission.request.stops[0]?.clientName || 'Client Non Spécifié'}</p>
                                                    {mission.request.reference && (
                                                        <div className="mt-1">
                                                            <span className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded text-[10px] font-black text-yellow-400 uppercase tracking-wider">
                                                                Réf: {mission.request.reference}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-xs text-slate-500">{mission.request.client?.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Trajet Complet</h4>
                                        {mission.request.pricingMode === 'text' ? (
                                            <textarea
                                                value={mission.request.instructions || ''}
                                                onChange={(e) => onUpdateMission({
                                                    ...mission,
                                                    request: {
                                                        ...mission.request,
                                                        instructions: e.target.value
                                                    }
                                                })}
                                                className="w-full p-4 bg-slate-900 rounded-2xl border border-white/10 text-sm font-bold text-slate-300 italic outline-none focus:border-[#0088CC] focus:ring-1 focus:ring-[#0088CC]/50 transition-all min-h-[100px] resize-y"
                                                placeholder="Description de la mission..."
                                            />
                                        ) : (
                                            <>
                                                <div className="space-y-4 relative pl-4 border-l border-white/10 ml-2">
                                                    {mission.request.stops.map((stop, idx) => (
                                                        <div key={idx} className="relative">
                                                            <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 ${idx === 0 ? 'bg-emerald-500' : idx === mission.request.stops.length - 1 ? 'bg-[#FF6600]' : 'bg-slate-500'}`} />
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    {stop.clientName && <p className="text-sm font-black text-yellow-400 uppercase mb-0.5">{stop.clientName}</p>}
                                                                    <p className="text-xs font-bold text-slate-300 leading-snug">{stop.address}</p>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                                    {stop.reference && (
                                                                        <p className="text-[9px] font-black text-yellow-400 uppercase">Réf: {stop.reference}</p>
                                                                    )}
                                                                    {stop.scheduledTime && (
                                                                        <span className="text-[10px] font-black text-orange-500 flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded">
                                                                            <Clock className="w-2.5 h-2.5" /> {stop.scheduledTime}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-white/5">
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Note / Instructions</h4>
                                                    <textarea
                                                        value={mission.request.instructions || ''}
                                                        onChange={(e) => onUpdateMission({
                                                            ...mission,
                                                            request: {
                                                                ...mission.request,
                                                                instructions: e.target.value
                                                            }
                                                        })}
                                                        className="w-full p-4 bg-slate-900 rounded-2xl border border-white/10 text-xs font-bold text-slate-300 outline-none focus:border-[#0088CC] focus:ring-1 focus:ring-[#0088CC]/50 transition-all min-h-[100px] resize-y placeholder:text-slate-600"
                                                        placeholder="Instructions chauffeur, codes, détails..."
                                                    />
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* Special MAE Input for Mission 6lxtsit1y */}
                                        {mission.id === '6lxtsit1y' && (
                                            <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl space-y-3 animate-pulse">
                                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Spécial MAE (Mission #6lxtsit1y)</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">Pays de destination</label>
                                                        <select 
                                                            value={mission.request.maeCountry || ''}
                                                            onChange={(e) => {
                                                                const country = countries.find(c => c.name === e.target.value);
                                                                const newDocs = (mission.request.maeDocuments || []).map(doc => ({ ...doc, country: e.target.value }));
                                                                onUpdateMission({
                                                                    ...mission,
                                                                    request: { 
                                                                        ...mission.request, 
                                                                        maeCountry: e.target.value, 
                                                                        maeType: country?.type,
                                                                        maeDocuments: newDocs,
                                                                        isMae: true 
                                                                    }
                                                                });
                                                            }}
                                                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                                        >
                                                            <option value="">Sélectionner un pays...</option>
                                                            {[...countries].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                                                <option key={c.name} value={c.name}>
                                                                    {c.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">Nombre de signatures</label>
                                                        <input 
                                                            type="number" 
                                                            value={(mission.request.maeDocuments || []).reduce((acc, doc) => acc + doc.signatureCount, 0)}
                                                            onChange={(e) => {
                                                                const count = parseInt(e.target.value) || 0;
                                                                // Update or create a single document to match this count
                                                                const docs = mission.request.maeDocuments || [];
                                                                let newDocs;
                                                                if (docs.length > 0) {
                                                                    newDocs = [...docs];
                                                                    newDocs[0] = { ...newDocs[0], signatureCount: count, price: count * 20 };
                                                                } else {
                                                                    newDocs = [{
                                                                        id: Math.random().toString(36).substr(2, 9),
                                                                        country: mission.request.maeCountry || '',
                                                                        signatory: '',
                                                                        documentType: 'Document',
                                                                        signatureCount: count,
                                                                        price: count * 20
                                                                    }];
                                                                }
                                                                onUpdateMission({
                                                                    ...mission,
                                                                    request: { ...mission.request, maeDocuments: newDocs, isMae: true }
                                                                });
                                                            }}
                                                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Column 2: Options & Pricing */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Options & Services</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, vehicleId: mission.request.vehicleId === 'camionnette' ? 'voiture' : 'camionnette' } })}
                                                className="px-3 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 rounded-lg text-[10px] font-black uppercase border border-slate-500/20 flex items-center gap-2 transition-colors text-left"
                                            >
                                                {mission.request.vehicleId === 'camionnette' ? <Truck className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                                                {mission.request.vehicleId === 'camionnette' ? 'Camionnette' : 'Voiture'}
                                            </button>
                                            
                                            <button 
                                                onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, isUrgent: !mission.request.isUrgent }, priority: !mission.request.isUrgent ? 'Haute' : mission.priority })}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-all text-left ${mission.request.isUrgent ? 'bg-red-500 text-white border-red-500 animate-urgent-pulse shadow-lg' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                                            >
                                                Urgent
                                            </button>

                                            <div className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-all text-left flex flex-col gap-2 ${mission.request.isPreciseTime ? 'bg-red-500 text-white border-red-500 animate-urgent-pulse shadow-lg' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}>
                                                <div className="flex items-center justify-between cursor-pointer" onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, isPreciseTime: !mission.request.isPreciseTime } })}>
                                                    <span>Horaire Précis</span>
                                                    <Clock className="w-3 h-3" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] opacity-70">Pick-up</span>
                                                    <input 
                                                        type="time"
                                                        value={mission.request.pickupTimeValue || ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => onUpdateMission({ 
                                                            ...mission, 
                                                            request: { ...mission.request, pickupTimeValue: e.target.value } 
                                                        })}
                                                        className={`w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs font-black outline-none focus:border-white ${mission.request.isPreciseTime ? 'text-white' : 'text-slate-400'}`}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] opacity-70">Livraison</span>
                                                    <input 
                                                        type="time"
                                                        value={mission.request.preciseTimeValue || mission.time || ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => onUpdateMission({ 
                                                            ...mission, 
                                                            time: e.target.value,
                                                            request: { ...mission.request, preciseTimeValue: e.target.value } 
                                                        })}
                                                        className={`w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs font-black outline-none focus:border-white ${mission.request.isPreciseTime ? 'text-white' : 'text-slate-400'}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left flex flex-col ${mission.request.isBigVolume ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                                <div className="flex items-center justify-between cursor-pointer" onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, isBigVolume: !mission.request.isBigVolume } })}>
                                                    <span>Grand Volume</span>
                                                </div>
                                                {mission.request.isBigVolume && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            value={mission.request.packageCount || 1} 
                                                            onChange={(e) => onUpdateMission({ ...mission, request: { ...mission.request, packageCount: parseInt(e.target.value) || 1 } })}
                                                            className="bg-transparent border-b border-purple-500/30 text-xs font-bold text-purple-400 w-12 outline-none focus:border-purple-500"
                                                        />
                                                        <span className="opacity-70">Boite(s)</span>
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, returnToStart: !mission.request.returnToStart } })}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left ${mission.request.returnToStart ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                                            >
                                                Aller-Retour
                                            </button>

                                            <button 
                                                onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, isApostille: !mission.request.isApostille } })}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left ${mission.request.isApostille ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                                            >
                                                Apostille
                                            </button>

                                            <button 
                                                onClick={() => {
                                                    const newIsMae = !mission.request.isMae;
                                                    onUpdateMission({
                                                        ...mission,
                                                        request: {
                                                            ...mission.request,
                                                            isMae: newIsMae,
                                                            maeDocuments: newIsMae && (!mission.request.maeDocuments || mission.request.maeDocuments.length === 0) 
                                                                ? [{ id: Math.random().toString(36).substr(2, 9), country: '', signatory: '', documentType: '', signatureCount: 0, price: 0 }] 
                                                                : mission.request.maeDocuments
                                                        }
                                                    });
                                                }}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left ${mission.request.isMae ? 'bg-[#0088CC]/10 text-[#0088CC] border-[#0088CC]/20 hover:bg-[#0088CC]/20' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                                            >
                                                MAE
                                            </button>

                                            {mission.request.isMae && (
                                                <>
                                                    <button 
                                                        onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, isMaeAller: !mission.request.isMaeAller } })}
                                                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left ${mission.request.isMaeAller ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                                                    >
                                                        Aller MAE (0.44€)
                                                    </button>
                                                    <button 
                                                        onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, isMaePickup: !mission.request.isMaePickup } })}
                                                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left ${mission.request.isMaePickup ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                                                    >
                                                        Récup. MAE (5€)
                                                    </button>
                                                </>
                                            )}

                                            <div className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors text-left flex flex-col ${mission.request.waitingTimeMinutes > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span>Attente</span>
                                                    {mission.request.waitingTimeMinutes > 0 && (
                                                        <button 
                                                            onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, waitingTimeMinutes: 0 } })}
                                                            className="text-[8px] opacity-50 hover:opacity-100 transition-opacity"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <button 
                                                        onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, waitingTimeMinutes: Math.max(0, (mission.request.waitingTimeMinutes || 0) - 5) } })}
                                                        className="w-7 h-7 flex items-center justify-center bg-white/5 rounded-md hover:bg-white/10 border border-white/10 active:scale-95 transition-all"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="flex flex-col items-center flex-1">
                                                        <span className="text-xs font-black">
                                                            {mission.request.waitingTimeMinutes || 0} min
                                                        </span>
                                                        {mission.request.waitingTimeMinutes > 0 && (
                                                            <span className="text-[8px] opacity-70 font-bold">
                                                                {(Math.ceil(mission.request.waitingTimeMinutes / 5) * 2.5).toFixed(2)}€
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => onUpdateMission({ ...mission, request: { ...mission.request, waitingTimeMinutes: (mission.request.waitingTimeMinutes || 0) + 5 } })}
                                                        className="w-7 h-7 flex items-center justify-center bg-white/5 rounded-md hover:bg-white/10 border border-white/10 active:scale-95 transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Finances</h4>
                                        <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 space-y-2">
                                            <div className="flex justify-between items-center text-xs text-slate-400">
                                                <span>Prix de base {mission.request.returnToStart ? '(Aller-Retour)' : ''}</span>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        placeholder={((mission.result?.basePrice ?? (mission.result?.baseSubTotal ? (mission.result.baseSubTotal / (mission.request.returnToStart ? 2 : 1)) : 0)) * (mission.request.returnToStart ? 2 : 1)).toFixed(2)}
                                                        value={mission.request.basePriceOverride !== undefined ? mission.request.basePriceOverride : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                            onUpdateMission({
                                                                ...mission,
                                                                request: { ...mission.request, basePriceOverride: val }
                                                            });
                                                        }}
                                                        className="w-20 bg-slate-950 border border-white/10 rounded px-2 py-1 text-right outline-none focus:border-[#0088CC] text-white font-bold placeholder:text-slate-600"
                                                    />
                                                    <span>€</span>
                                                </div>
                                            </div>
                                            {(mission.result?.urgentFee ?? mission.result?.urgencyFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-red-400">
                                                    <span>Supplément Urgence</span>
                                                    <span>{(mission.result?.urgentFee ?? mission.result?.urgencyFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.volumeFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-purple-400">
                                                    <span>Supplément Volume</span>
                                                    <span>{(mission.result?.volumeFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.preciseTimeFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-blue-400">
                                                    <span>Heure Précise</span>
                                                    <span>{(mission.result?.preciseTimeFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.apostilleFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-amber-400">
                                                    <span>Apostille</span>
                                                    <span>{(mission.result?.apostilleFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.maeFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-[#0088CC]">
                                                    <span>MAE</span>
                                                    <span>{(mission.result?.maeFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.maeAllerFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-blue-400">
                                                    <span>Aller MAE</span>
                                                    <span>{(mission.result?.maeAllerFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.maePickupFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-orange-400">
                                                    <span>Récupération MAE</span>
                                                    <span>{(mission.result?.maePickupFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.result?.waitingFee ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-emerald-400">
                                                    <span>Attente</span>
                                                    <span>{(mission.result?.waitingFee ?? 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            {(mission.request.manualItems || []).map(item => (
                                                <div key={item.id} className={`flex justify-between text-xs ${item.price < 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                    <span>{item.name}</span>
                                                    <span>{item.price > 0 ? '+' : ''}{item.price.toFixed(2)}€</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>Surcharge Carburant ({(mission.request.customFuelSurchargePercent ?? 8).toFixed(2)}%)</span>
                                                <span>{(mission.result?.fuelSurcharge ?? mission.result?.fuelCost ?? 0).toFixed(2)}€</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-orange-400 pt-1 border-t border-white/5 mt-1">
                                                <span className="font-bold">Ajustement Manuel</span>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={mission.request.manualAdjustment || 0}
                                                        onChange={(e) => onUpdateMission({
                                                            ...mission,
                                                            request: { ...mission.request, manualAdjustment: parseFloat(e.target.value) || 0 }
                                                        })}
                                                        className="w-20 bg-slate-950 border border-white/10 rounded px-2 py-1 text-right outline-none focus:border-orange-500 text-white font-black"
                                                    />
                                                    <span className="font-black">€</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/5">
                                                <span>Total HT</span>
                                                <span>{(mission.result.priceHT || 0).toFixed(2)}€</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-black text-slate-300 pt-2 border-t border-white/5">
                                                <span>Total TTC</span>
                                                <span>{((mission.result.priceTTC || 0) - (mission.request.advancedFees || 0) - (mission.result.maeFee || 0)).toFixed(2)}€</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2 border-t border-white/5">
                                                <span>Frais Avancés (Débours)</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={mission.request.advancedFees || 0}
                                                        onChange={(e) => onUpdateMission({
                                                            ...mission,
                                                            request: { ...mission.request, advancedFees: parseFloat(e.target.value) || 0 }
                                                        })}
                                                        className="w-20 bg-slate-950 border border-white/10 rounded px-2 py-1 text-right outline-none focus:border-blue-500 text-white font-black"
                                                    />
                                                    <span className="font-black">€</span>
                                                </div>
                                            </div>
                                            {(mission.result.maeFee || 0) > 0 && (
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-1">
                                                    <span>Frais MAE (Apostilles)</span>
                                                    <span>{(mission.result.maeFee || 0).toFixed(2)}€</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm font-black text-[#0088CC] pt-2 border-t border-white/5">
                                                <span>Total TTC + Frais</span>
                                                <span>{(mission.result.priceTTC || 0).toFixed(2)}€</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 3: Dispatch Actions */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Priorité & Statut</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500">Niveau d'urgence</label>
                                                <div className="flex gap-2">
                                                    {(['Basse', 'Moyenne', 'Haute'] as MissionPriority[]).map((p) => (
                                                        <button 
                                                            key={p}
                                                            onClick={() => handlePriorityChange(mission, p)}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${mission.priority === p ? getPriorityColor(p) : 'bg-slate-900 border-white/5 text-slate-600 hover:bg-white/5'}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500">État de la mission</label>
                                                <select 
                                                    value={mission.status}
                                                    onChange={(e) => handleStatusChange(mission, e.target.value as MissionStatus)}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-[#0088CC]"
                                                >
                                                    <option value="en attente">En Attente</option>
                                                    <option value="en cours">En Cours</option>
                                                    <option value="finalisé">Finalisé</option>
                                                    <option value="annulé">Annulé</option>
                                                </select>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500">Chauffeur</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={mission.assignedStaffId || ''}
                                                        onChange={(e) => handleAssignStaff(mission, e.target.value)}
                                                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-[#0088CC]"
                                                    >
                                                        <option value="">Non Attribué</option>
                                                        {staff.filter(s => s.status === 'actif').map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    {mission.assignedStaffId && (
                                                        <button 
                                                            onClick={() => handleCopyMissionToDriver(mission)}
                                                            className="px-4 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20"
                                                            title="Copier pour WhatsApp"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {mission.request.instructions && mission.request.pricingMode !== 'text' && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Instructions</h4>
                                            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs text-amber-200/80 italic">
                                                "{mission.request.instructions}"
                                            </div>
                                        </div>
                                    )}

                                    {/* Facturation Section */}
                                    <div className="pt-6 border-t border-white/5">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ReceiptEuro className="w-3.5 h-3.5" />
                                            Facturation
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500">Profil de Facturation</label>
                                                <select 
                                                    value={mission.request.billingProfileId || ''}
                                                    onChange={(e) => onUpdateMission({
                                                        ...mission,
                                                        request: { ...mission.request, billingProfileId: e.target.value }
                                                    })}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-indigo-500"
                                                >
                                                    <option value="">Sélectionner un profil...</option>
                                                    {billingProfiles.map(p => (
                                                        <option key={p.id} value={p.id}>{p.companyName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500">Bon de Livraison (BL)</label>
                                                <input 
                                                    type="text"
                                                    value={mission.request.deliveryNoteNumber || ''}
                                                    onChange={(e) => onUpdateMission({
                                                        ...mission,
                                                        request: { ...mission.request, deliveryNoteNumber: e.target.value }
                                                    })}
                                                    placeholder="N° de BL..."
                                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            
                                            {!mission.archivedForBilling && mission.status === 'finalisé' && (
                                                <button
                                                    onClick={() => {
                                                        onUpdateMission({
                                                            ...mission,
                                                            status: 'à facturer',
                                                            archivedForBilling: true,
                                                            billingStatus: 'en attente de contrôle'
                                                        });
                                                    }}
                                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2"
                                                >
                                                    <Archive className="w-4 h-4" />
                                                    Archiver pour Facturation
                                                </button>
                                            )}
                                            {mission.archivedForBilling && (
                                                <div className="w-full py-3 bg-indigo-500/10 text-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-500/20 flex items-center justify-center gap-2 mt-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Archivé pour Facturation
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* MAE Section */}
                                {mission.request.isMae && (
                                    <div className="col-span-1 lg:col-span-3 mt-6 pt-6 border-t border-white/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[10px] font-black text-[#0088CC] uppercase tracking-widest">MAE - Apostille / Légalisation</h4>
                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Client</span>
                                                    <span className="text-[10px] font-black text-white uppercase">{(mission.request.client?.name || mission.request.stops[0]?.clientName || 'N/A')}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Démarche</span>
                                                    <select 
                                                        value={mission.request.maeType || ''}
                                                        onChange={(e) => onUpdateMission({
                                                            ...mission,
                                                            request: { ...mission.request, maeType: e.target.value as 'apostille' | 'legalisation' }
                                                        })}
                                                        className="bg-transparent text-[10px] font-black text-[#FF6600] uppercase outline-none cursor-pointer hover:text-[#FF6600]/80 transition-colors"
                                                    >
                                                        <option value="" className="bg-slate-900 text-slate-500">Non défini</option>
                                                        <option value="apostille" className="bg-slate-900 text-white">Apostille</option>
                                                        <option value="legalisation" className="bg-slate-900 text-white">Légalisation</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="overflow-x-auto bg-slate-900 rounded-xl border border-white/5">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-white/10 bg-slate-950/50">
                                                        <th className="p-1.5 text-[9px] font-bold text-slate-500 uppercase">Pays de destination</th>
                                                        <th className="p-1.5 text-[9px] font-bold text-slate-500 uppercase">
                                                            <div className="flex items-center justify-between">
                                                                <span>Signataire</span>
                                                                <label className="cursor-pointer text-[7px] font-black text-[#0088CC] hover:text-[#0088CC]/80 uppercase flex items-center gap-1">
                                                                    <Upload className="w-2.5 h-2.5" />
                                                                    Importer
                                                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportSignatories} />
                                                                </label>
                                                            </div>
                                                        </th>
                                                        <th className="p-1.5 text-[9px] font-bold text-slate-500 uppercase">Type de documents</th>
                                                        <th className="p-1.5 text-[9px] font-bold text-slate-500 uppercase text-center">Nbr. Docs</th>
                                                        <th className="p-1.5 text-[9px] font-bold text-slate-500 uppercase text-right">Prix</th>
                                                        <th className="p-1.5 w-8 text-center">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const clientName = (mission.request.client?.name || mission.request.stops[0]?.clientName || 'N/A').toUpperCase();
                                                                    const procedure = (mission.request.maeType || 'N/A').toUpperCase();
                                                                    const docsSummary = (mission.request.maeDocuments || []).map(doc => 
                                                                        `${doc.signatureCount} ${(doc.country || mission.request.maeCountry || 'N/A').toUpperCase()} ${(doc.signatory || 'N/A').toUpperCase()} ${(doc.documentType || 'N/A').toUpperCase()}`
                                                                    ).join('\n');
                                                                    
                                                                    const summary = `${clientName} (${procedure})\n${docsSummary}`;
                                                                    navigator.clipboard.writeText(summary);
                                                                    
                                                                    const btn = e.currentTarget;
                                                                    const originalHtml = btn.innerHTML;
                                                                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                                                                    btn.classList.add('text-emerald-500');
                                                                    setTimeout(() => {
                                                                        btn.innerHTML = originalHtml;
                                                                        btn.classList.remove('text-emerald-500');
                                                                    }, 2000);
                                                                }}
                                                                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors inline-flex"
                                                                title="Copier le résumé"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(mission.request.maeDocuments || []).map((doc) => (
                                                        <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="p-1">
                                                                <select 
                                                                    value={doc.country || ''}
                                                                    onChange={(e) => handleUpdateMaeDocument(mission, doc.id, 'country', e.target.value)}
                                                                    className="w-full bg-transparent text-[10px] font-bold text-white outline-none px-1 py-0.5 rounded focus:bg-white/5 appearance-none cursor-pointer"
                                                                >
                                                                    <option value="" className="bg-slate-900">Pays...</option>
                                                                    {[...countries].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                                                        <option key={c.name} value={c.name} className="bg-slate-900">
                                                                            {c.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-1">
                                                                <select 
                                                                    value={doc.signatory || ''}
                                                                    onChange={(e) => handleUpdateMaeDocument(mission, doc.id, 'signatory', e.target.value)}
                                                                    className="w-full bg-transparent text-[10px] font-bold text-white outline-none px-1 py-0.5 rounded focus:bg-white/5 appearance-none cursor-pointer"
                                                                >
                                                                    <option value="" className="bg-slate-900">Signataire...</option>
                                                                    {signatories.map(sig => (
                                                                        <option key={sig} value={sig} className="bg-slate-900">
                                                                            {sig}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-1">
                                                                <select 
                                                                    value={doc.documentType || ''}
                                                                    onChange={(e) => handleUpdateMaeDocument(mission, doc.id, 'documentType', e.target.value)}
                                                                    className="w-full bg-transparent text-[10px] font-bold text-white outline-none px-1 py-0.5 rounded focus:bg-white/5 appearance-none cursor-pointer"
                                                                >
                                                                    <option value="" className="bg-slate-900">Type...</option>
                                                                    {maeDocumentTypes.map(t => (
                                                                        <option key={t} value={t} className="bg-slate-900">
                                                                            {t}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-1 text-center">
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    value={doc.signatureCount}
                                                                    onChange={(e) => handleUpdateMaeDocument(mission, doc.id, 'signatureCount', parseInt(e.target.value) || 0)}
                                                                    className="w-10 text-center bg-transparent text-[10px] font-bold text-white outline-none px-1 py-0.5 rounded focus:bg-white/5"
                                                                />
                                                            </td>
                                                            <td className="p-1 text-right text-[10px] font-bold text-white px-2">
                                                                {doc.price} €
                                                            </td>
                                                            <td className="p-1 text-center">
                                                                <button 
                                                                    onClick={() => handleRemoveMaeDocument(mission, doc.id)}
                                                                    className="text-red-500 hover:text-red-400 transition-colors p-0.5 hover:bg-red-500/10 rounded"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-950/30">
                                                        <td colSpan={3} className="p-1.5 text-[10px] font-black text-white uppercase text-right">Total:</td>
                                                        <td className="p-1.5 text-center text-[10px] font-black text-white">
                                                            {(mission.request.maeDocuments || []).reduce((acc, doc) => acc + doc.signatureCount, 0)} sig(s)
                                                        </td>
                                                        <td className="p-1.5 text-right text-[10px] font-black text-[#0088CC]">
                                                            {(mission.request.maeDocuments || []).reduce((acc, doc) => acc + doc.price, 0)} €
                                                        </td>
                                                        <td className="p-1.5 text-center">
                                                            <button 
                                                                onClick={() => handleAddMaeDocument(mission)}
                                                                className="w-5 h-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/20 mx-auto"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
        );
    })}
    </tbody>
</table>
</div>
)}
{/* WhatsApp Customization Modal */}
        {isWhatsAppModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                <div className="bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-xl border border-white/10 flex flex-col animate-in zoom-in-95 duration-400 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/5 bg-slate-800/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#25D366]/10 rounded-2xl">
                                <Send className="w-6 h-6 text-[#25D366]" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-xl uppercase tracking-widest leading-none mb-1">Personnaliser WhatsApp</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modifier le texte avant l'envoi</p>
                            </div>
                        </div>
                        <button onClick={() => setIsWhatsAppModalOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block px-1">Message pour le chauffeur</label>
                            <textarea 
                                value={whatsAppText}
                                onChange={(e) => setWhatsAppText(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-sm font-bold text-slate-300 outline-none focus:border-[#25D366] transition-all min-h-[300px] custom-scrollbar"
                            />
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsWhatsAppModalOpen(false)}
                                className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(whatsAppText);
                                    setIsWhatsAppModalOpen(false);
                                    // Optional: Add a small toast or visual feedback here if desired
                                }}
                                className="flex-[2] py-5 bg-[#25D366] hover:bg-[#20bd5b] text-white rounded-3xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-[#25D366]/20 flex items-center justify-center gap-3"
                            >
                                <Copy className="w-4 h-4" /> Copier le texte
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedMissions.length > 0 && (
          <motion.div 
            initial={{ y: 100, x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: 100, x: '-50%' }}
            className="fixed bottom-6 left-1/2 bg-[#1A1A1A] border border-[#0088CC]/30 rounded-2xl shadow-2xl p-4 flex items-center gap-6 z-[110] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0088CC]/10 rounded-xl">
              <span className="text-xs font-black text-[#0088CC] uppercase tracking-widest">{selectedMissions.length} Sélectionnée(s)</span>
            </div>
            
            <div className="flex items-center gap-4">
              <select 
                className="bg-[#121212] border border-[#2A2A2A] rounded-xl px-4 py-2 text-xs font-bold text-slate-200 outline-none focus:border-[#0088CC]"
                onChange={(e) => {
                  const staffId = e.target.value;
                  if (!staffId) return;
                  missions.forEach(m => {
                    if (selectedMissions.includes(m.id)) {
                      onUpdateMission({ ...m, assignedStaffId: staffId });
                    }
                  });
                  setSelectedMissions([]);
                  alert(`Missions assignées !`);
                }}
              >
                <option value="">Attribuer à un chauffeur...</option>
                {staff.filter(s => s.role === 'Chauffeur').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button 
                onClick={() => {
                  if (window.confirm(`Finaliser ${selectedMissions.length} missions ?`)) {
                    missions.forEach(m => {
                      if (selectedMissions.includes(m.id)) {
                        onUpdateMission({ ...m, status: 'finalisé' });
                      }
                    });
                    setSelectedMissions([]);
                  }
                }}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Marquer Finalisées
              </button>

              <button 
                onClick={() => setSelectedMissions([])}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Désélectionner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

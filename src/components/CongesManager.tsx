
import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Search, Plane, Thermometer, User, 
  Clock, ChevronRight, X, ChevronLeft, LayoutGrid, 
  Edit3, UserPlus, Phone, Mail, FileBarChart, Activity,
  Users, History, Timer, Truck, ChevronUp, ChevronDown,
  UserX, CheckCircle2, CalendarDays, Shield,
  Briefcase, Star, Settings2, Landmark, Download, Upload
} from 'lucide-react';

import { Holiday, Staff, StaffRole } from '../types';

// --- FONCTIONS UTILITAIRES POUR LES JOURS FÉRIÉS LUXEMBOURGEOIS ---
const getEaster = (year: number) => {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
};

const getLuxPublicHolidays = (year: number) => {
  const easter = getEaster(year);
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Jour de l'An",
    [`${year}-05-01`]: "Fête du Travail",
    [`${year}-05-09`]: "Journée de l'Europe",
    [`${year}-06-23`]: "Fête Nationale",
    [`${year}-08-15`]: "Assomption",
    [`${year}-11-01`]: "Toussaint",
    [`${year}-12-25`]: "Noël",
    [`${year}-12-26`]: "St. Étienne",
  };

  // Dates Mobiles
  holidays[addDays(easter, 1)] = "Lundi de Pâques";
  holidays[addDays(easter, 39)] = "Ascension";
  holidays[addDays(easter, 50)] = "Lundi de Pentecôte";

  return holidays;
};

interface Props {
  holidays: Holiday[];
  onUpdateHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  staff: Staff[];
  onUpdateStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
}

const CongesManager: React.FC<Props> = ({ holidays, onUpdateHolidays, staff, onUpdateStaff }) => {
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'staff' | 'reports'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedStaffReport, setSelectedStaffReport] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const [newStaff, setNewStaff] = useState<Partial<Staff>>({
    name: '', phone: '', email: '', address: '', vehicle: '', status: 'actif', role: 'Chauffeur', contractType: 'CDI',
    workingHours: { start: '08:00', end: '18:00' }
  });

  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
    staffId: '', startDate: '', endDate: '', type: 'vacances', status: 'valide', comment: '', time: '08:00'
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExportStaff = () => {
    const dataStr = JSON.stringify(staff, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `staff_export_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showNotification("Exportation réussie");
  };

  const handleImportStaff = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedStaff = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedStaff)) {
          // Validation basique
          const isValid = importedStaff.every(s => s.id && s.name);
          if (isValid) {
            onUpdateStaff(prev => {
                const existingIds = new Set(prev.map(s => s.id));
                const newOnes = importedStaff.filter(s => !existingIds.has(s.id));
                return [...prev, ...newOnes];
            });
            showNotification(`${importedStaff.length} chauffeurs importés`);
          } else {
            alert("Format de fichier invalide");
          }
        }
      } catch {
        alert("Erreur lors de la lecture du fichier");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // --- CALCUL DES JOURS FÉRIÉS POUR L'ANNÉE EN COURS ---
  const luxPublicHolidays = useMemo(() => {
    return getLuxPublicHolidays(currentDate.getFullYear());
  }, [currentDate]);

  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [staff]);

  const moveStaff = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const newStaffList = [...sortedStaff];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStaffList.length) return;
    const currentOrder = newStaffList[index].order || index + 1;
    const targetOrder = newStaffList[targetIndex].order || targetIndex + 1;
    newStaffList[index].order = targetOrder;
    newStaffList[targetIndex].order = currentOrder;
    // Use the lifted state update function
    onUpdateStaff(newStaffList);
  };

  const filteredStaff = useMemo(() => {
    return sortedStaff.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.role && s.role.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sortedStaff, search]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7; 
  };
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const holidaysOnDay = (dateStr: string) => {
    return holidays.filter(h => dateStr >= h.startDate && dateStr <= h.endDate);
  };

  const getHolidayColor = (type: Holiday['type']) => {
    switch (type) {
      case 'vacances': return 'bg-blue-600';
      case 'maladie': return 'bg-red-600';
      case 'retard': return 'bg-orange-600';
      case 'formation': return 'bg-purple-600';
      default: return 'bg-slate-600';
    }
  };

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = startDayOfMonth(year, month);
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push({ day: null, date: null, isWeekend: false });
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = date.getDay(); 
      cells.push({ day: d, date: dateStr, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 });
    }
    return cells;
  }, [currentDate]);

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name) return;
    if (editingStaff) {
      // Use the lifted state update function
      onUpdateStaff(prev => prev.map(s => s.id === editingStaff.id ? { ...editingStaff, ...newStaff } as Staff : s));
    } else {
      const s: Staff = {
        id: Math.random().toString(36).substr(2, 9),
        name: newStaff.name || '',
        phone: newStaff.phone || '',
        email: newStaff.email || '',
        address: newStaff.address || '',
        vehicle: newStaff.vehicle || '',
        status: 'actif',
        role: (newStaff.role as StaffRole) || 'Chauffeur',
        order: staff.length + 1,
        contractType: newStaff.contractType || 'CDI',
        workingHours: { start: '08:00', end: '18:00' }
      };
      // Use the lifted state update function
      onUpdateStaff(prev => [...prev, s]);
    }
    setIsAddingStaff(false);
    setEditingStaff(null);
    showNotification("Fiche personnel mise à jour");
  };

  const handleDeleteStaff = (e: React.MouseEvent, s: Staff) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`⚠️ SUPPRESSION DÉFINITIVE\n\nVoulez-vous supprimer "${s.name}" ? Tous ses congés seront également effacés.`)) {
      // Use the lifted state update functions
      onUpdateStaff(prev => prev.filter(item => item.id !== s.id));
      onUpdateHolidays(prev => prev.filter(h => h.staffId !== s.id));
      setIsAddingStaff(false);
      setEditingStaff(null);
      if (selectedStaffReport === s.id) setSelectedStaffReport(null);
      showNotification("Chauffeur et historique supprimés");
    }
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.staffId || !newHoliday.startDate) return;
    const staffMember = staff.find(s => s.id === newHoliday.staffId);
    if (editingHoliday) {
      // Use the lifted state update function
      onUpdateHolidays(prev => prev.map(h => h.id === editingHoliday.id ? { ...editingHoliday, ...newHoliday, staffName: staffMember?.name || h.staffName } as Holiday : h));
    } else {
      const h: Holiday = {
        id: Math.random().toString(36).substr(2, 9),
        staffId: newHoliday.staffId || '',
        staffName: staffMember?.name || 'Inconnu',
        startDate: newHoliday.startDate || '',
        endDate: newHoliday.endDate || newHoliday.startDate || '',
        type: newHoliday.type || 'vacances',
        status: 'valide',
        comment: newHoliday.comment || '',
        time: newHoliday.time
      };
      // Use the lifted state update function
      onUpdateHolidays(prev => [...prev, h]);
    }
    setIsAddingHoliday(false);
    setEditingHoliday(null);
    showNotification("Absence enregistrée avec succès");
  };

  const handleRemoveHoliday = (id: string) => {
    if (window.confirm("Voulez-vous supprimer cette absence du calendrier ?")) {
      // Use the lifted state update function
      onUpdateHolidays(prev => prev.filter(h => h.id !== id));
      setIsAddingHoliday(false);
      setEditingHoliday(null);
      showNotification("Entrée supprimée");
    }
  };

  const reportData = useMemo(() => {
    if (!selectedStaffReport) return null;
    const sHols = holidays.filter(h => h.staffId === selectedStaffReport);
    return {
      vacances: sHols.filter(h => h.type === 'vacances').length,
      maladie: sHols.filter(h => h.type === 'maladie').length,
      retard: sHols.filter(h => h.type === 'retard').length,
      history: sHols.sort((a, b) => b.startDate.localeCompare(a.startDate))
    };
  }, [selectedStaffReport, holidays]);

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case 'Gérant': return <Shield className="w-4 h-4 text-amber-500" />;
      case 'Chef Dispatch': return <Star className="w-4 h-4 text-blue-500" />;
      case 'Assistant Polyvalent': return <Briefcase className="w-4 h-4 text-emerald-500" />;
      default: return <Truck className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-[40px] shadow-2xl border border-white/10 overflow-hidden flex flex-col min-h-[850px] animate-in fade-in duration-700 text-slate-100">
      
      {/* --- HEADER --- */}
      <div className="px-10 py-6 border-b border-white/10 bg-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex bg-slate-950/50 p-1.5 rounded-2xl gap-1 border border-white/5">
          <button onClick={() => setActiveSubTab('calendar')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'calendar' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <LayoutGrid className="w-4 h-4" /> Planning
          </button>
          <button onClick={() => setActiveSubTab('staff')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'staff' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <Users className="w-4 h-4" /> Équipe
          </button>
          <button onClick={() => setActiveSubTab('reports')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'reports' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <FileBarChart className="w-4 h-4" /> Analyses
          </button>
        </div>

        <div className="flex gap-3">
          {activeSubTab === 'staff' && (
            <div className="flex gap-2">
                <button 
                    onClick={handleExportStaff}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    title="Exporter les chauffeurs"
                >
                    <Download className="w-4 h-4" /> Export
                </button>
                <label className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest" title="Importer les chauffeurs">
                    <Upload className="w-4 h-4" /> Import
                    <input type="file" accept=".json" onChange={handleImportStaff} className="hidden" />
                </label>
            </div>
          )}
          {activeSubTab === 'staff' ? (
            <button onClick={() => { setEditingStaff(null); setNewStaff({ name: '', phone: '', email: '', address: '', vehicle: '', status: 'actif', role: 'Chauffeur', contractType: 'CDI', workingHours: { start: '08:00', end: '18:00' } }); setIsAddingStaff(true); }} className="bg-white text-slate-900 px-7 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:bg-slate-200 transition-all flex items-center gap-3 active:scale-95">
              <UserPlus className="w-4 h-4" /> Ajouter Fiche
            </button>
          ) : (
            <button onClick={() => { setEditingHoliday(null); setNewHoliday({ staffId: '', type: 'vacances', status: 'valide', startDate: currentDate.toISOString().split('T')[0] }); setIsAddingHoliday(true); }} className="bg-white text-slate-900 px-7 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:bg-slate-200 transition-all flex items-center gap-3 active:scale-95">
              <Plus className="w-4 h-4" /> Inscrire Absence
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className="absolute top-24 right-10 z-50 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 border border-white/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{notification}</span>
        </div>
      )}

      {/* --- CONTENU --- */}
      <div className="flex-1 flex flex-col p-10 overflow-hidden">
        
        {/* VUE CALENDRIER */}
        {activeSubTab === 'calendar' && (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <button onClick={handlePrevMonth} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 text-slate-400 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <h4 className="text-xl font-black text-white uppercase tracking-widest min-w-[220px] text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h4>
                <button onClick={handleNextMonth} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 text-slate-400 transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <div className="flex gap-6 flex-wrap justify-center">
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="w-3 h-3 bg-blue-600 rounded-full" /> Congés</div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="w-3 h-3 bg-red-600 rounded-full" /> Maladie</div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="w-3 h-3 bg-orange-600 rounded-full" /> Retard</div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="w-3 h-3 bg-lime-400/20 rounded-full" /> Week-end</div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="w-3 h-3 bg-slate-700 rounded-full" /> Férié LU</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-7 gap-px bg-slate-200 border border-white/10 rounded-3xl overflow-hidden shadow-sm">
              {weekDays.map(wd => (
                <div key={wd} className="bg-white py-4 text-center text-[10px] font-black uppercase text-slate-700 tracking-widest border-b border-slate-100">{wd}</div>
              ))}
              {calendarGrid.map((cell, idx) => {
                if (!cell.day) return <div key={`empty-${idx}`} className="bg-gray-50" />;
                
                const dateStr = cell.date!;
                const dayAbsences = holidaysOnDay(dateStr);
                const publicHoliday = luxPublicHolidays[dateStr];

                return (
                  <div key={dateStr} onClick={() => !cell.isWeekend && setSelectedDay(dateStr)} className={`min-h-[120px] p-3 transition-all relative group flex flex-col gap-1.5 ${cell.isWeekend || publicHoliday ? 'bg-lime-400 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'} ${selectedDay === dateStr ? 'ring-2 ring-inset ring-[#0088CC] z-10' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-black ${cell.isWeekend || publicHoliday ? 'text-slate-900' : 'text-slate-900'}`}>{cell.day}</span>
                      {publicHoliday && (
                        <div className="p-1 bg-slate-900 text-white rounded-md flex items-center gap-1 shadow-sm" title={publicHoliday}>
                          <Landmark className="w-2.5 h-2.5" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">FÉRIÉ</span>
                        </div>
                      )}
                    </div>
                    
                    {publicHoliday && (
                      <div className="text-[9px] font-black text-slate-900 uppercase tracking-tighter truncate leading-none opacity-80">
                        {publicHoliday}
                      </div>
                    )}

                    <div className="space-y-1">
                      {dayAbsences.map(h => (
                        <div 
                          key={h.id} 
                          onClick={(e) => { e.stopPropagation(); setEditingHoliday(h); setNewHoliday(h); setIsAddingHoliday(true); }}
                          className={`px-2 py-1 rounded-md text-[9px] font-black text-white uppercase tracking-tighter truncate cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-sm ${getHolidayColor(h.type)}`}
                        >
                          {h.staffName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VUE ÉQUIPE */}
        {activeSubTab === 'staff' && (
          <div className="flex flex-col gap-8 h-full animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-4 w-5 h-5 text-slate-500" />
                <input type="text" placeholder="Filtrer par nom ou rôle..." className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-black outline-none focus:border-[#0088CC] transition-all text-white placeholder:text-slate-600" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="px-6 py-4 bg-slate-800 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {filteredStaff.length} Collaborateurs
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto pr-2 custom-scrollbar">
              {filteredStaff.map((s, index) => (
                <div key={s.id} onClick={() => { setEditingStaff(s); setNewStaff(s); setIsAddingStaff(true); }} className="p-8 bg-slate-900 border border-white/5 rounded-[36px] hover:shadow-2xl hover:shadow-black/50 transition-all group relative overflow-hidden hover:border-[#0088CC]/30 cursor-pointer animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="absolute top-0 right-0 px-6 py-3 bg-slate-800 border-l border-b border-white/5 rounded-bl-[20px] text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:bg-[#0088CC] group-hover:text-white transition-all">
                    #{index + 1}
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-800 text-slate-500 flex items-center justify-center font-black text-xl group-hover:bg-[#0088CC]/10 group-hover:text-[#0088CC] transition-colors">{s.name.charAt(0)}</div>
                    
                    <div className="flex gap-2 relative z-10">
                      <div className="flex flex-col gap-1 mr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => moveStaff(e, index, 'up')} disabled={index === 0} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 disabled:opacity-20 text-slate-400"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={(e) => moveStaff(e, index, 'down')} disabled={index === filteredStaff.length - 1} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 disabled:opacity-20 text-slate-400"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setEditingStaff(s); setNewStaff(s); setIsAddingStaff(true); }} className="p-3 bg-slate-800 hover:bg-[#0088CC] text-slate-400 hover:text-white rounded-xl transition-all shadow-sm"><Edit3 className="w-5 h-5"/></button>
                      <button onClick={(e) => handleDeleteStaff(e, s)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">{getRoleIcon(s.role)}<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.role}</span></div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2 group-hover:text-[#0088CC] transition-colors">{s.name}</h4>
                    <div className="space-y-2 mb-2 text-slate-400 text-xs font-bold">
                      <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-600"/> {s.phone || 'N/A'}</div>
                      <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-600"/> {s.email || 'N/A'}</div>
                      <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-slate-600"/> {s.workingHours?.start} - {s.workingHours?.end}</div>
                      {s.role === 'Chauffeur' && s.vehicle && <div className="flex items-center gap-3"><Truck className="w-4 h-4 text-slate-600"/> {s.vehicle}</div>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[48px] flex flex-col items-center justify-center text-slate-600">
                  <UserX className="w-16 h-16 mb-6 opacity-20" /><p className="text-[11px] font-black uppercase tracking-[0.4em]">Aucun collaborateur trouvé</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VUE ANALYSES */}
        {activeSubTab === 'reports' && (
          <div className="flex-1 flex flex-col md:flex-row gap-10 h-full animate-in fade-in duration-500">
            <div className="w-full md:w-80 space-y-4">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Sélectionner un profil</label>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {sortedStaff.map(s => (
                  <button key={s.id} onClick={() => setSelectedStaffReport(s.id)} className={`w-full p-5 rounded-2xl border text-left transition-all ${selectedStaffReport === s.id ? 'bg-[#0088CC] border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                    <div className="font-black text-sm uppercase tracking-tight">{s.name}</div>
                    <div className={`text-[10px] font-bold uppercase ${selectedStaffReport === s.id ? 'text-blue-100' : 'text-slate-500'}`}>{s.role} • {s.contractType}</div>
                  </button>
                ))}
              </div>
            </div>
            {reportData ? (
              <div className="flex-1 space-y-10 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-slate-900 p-8 rounded-[32px] border border-white/5 shadow-sm flex flex-col items-center hover:scale-105 transition-transform"><Plane className="w-8 h-8 text-blue-500 mb-4" /><span className="text-4xl font-black text-white">{reportData.vacances}</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Jours de Congés</span></div>
                  <div className="bg-slate-900 p-8 rounded-[32px] border border-white/5 shadow-sm flex flex-col items-center hover:scale-105 transition-transform"><Thermometer className="w-8 h-8 text-red-500 mb-4" /><span className="text-4xl font-black text-white">{reportData.maladie}</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Arrêts Maladie</span></div>
                  <div className="bg-slate-900 p-8 rounded-[32px] border border-white/5 shadow-sm flex flex-col items-center hover:scale-105 transition-transform"><Timer className="w-8 h-8 text-orange-500 mb-4" /><span className="text-4xl font-black text-white">{reportData.retard}</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Retards</span></div>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-[40px] shadow-sm overflow-hidden">
                  <div className="px-10 py-7 bg-slate-950/30 border-b border-white/5 flex justify-between items-center"><h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Historique Complet</h5></div>
                  <div className="divide-y divide-white/5">{reportData.history.length > 0 ? reportData.history.map(h => (<div key={h.id} className="px-10 py-6 flex items-center justify-between group hover:bg-slate-800/50 transition-all"><div className="flex items-center gap-6"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getHolidayColor(h.type)} text-white shadow-sm`}><History className="w-5 h-5" /></div><div><div className="font-black text-white text-sm uppercase tracking-tight">{h.type}</div><div className="text-[11px] text-slate-500 font-bold">du {h.startDate} au {h.endDate}</div></div></div><button onClick={() => handleRemoveHoliday(h.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 className="w-5 h-5"/></button></div>)) : (<div className="py-20 text-center text-slate-600 italic text-[11px] uppercase tracking-widest">Aucune donnée</div>)}</div>
                </div>
              </div>
            ) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-20 border-2 border-dashed border-white/5 rounded-[48px]"><Activity className="w-16 h-16 mb-6 opacity-20" /><p className="text-[11px] font-black uppercase tracking-[0.4em]">Sélectionnez un profil</p></div>)}
          </div>
        )}
      </div>

      {/* --- MODAL PERSONNEL --- */}
      {isAddingStaff && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-8 animate-in fade-in duration-300">
           <div className="bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-2xl border border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-400">
              <div className="px-12 py-10 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-4"><Settings2 className="w-8 h-8 text-[#0088CC]" /><h3 className="font-black text-2xl uppercase tracking-widest text-white">{editingStaff ? 'Modifier' : 'Nouveau'} Profil</h3></div>
                <button onClick={() => setIsAddingStaff(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-400"><X className="w-8 h-8"/></button>
              </div>
              <form onSubmit={handleSaveStaff} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar text-white">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom Complet</label><input required type="text" className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black focus:bg-slate-950 focus:border-[#0088CC] focus:ring-8 focus:ring-blue-500/5 outline-none transition-all text-white" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} /></div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Rôle / Fonction</label><select required className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black focus:bg-slate-950 outline-none appearance-none cursor-pointer text-white" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value as StaffRole})}><option value="Chauffeur">Chauffeur</option><option value="Gérant">Gérant</option><option value="Chef Dispatch">Chef Dispatch</option><option value="Assistant Polyvalent">Assistant Polyvalent</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Type de Contrat</label><select className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black focus:bg-slate-950 outline-none text-white" value={newStaff.contractType} onChange={e => setNewStaff({...newStaff, contractType: e.target.value})}><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="Indépendant">Indépendant</option></select></div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Téléphone</label><input type="tel" className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black outline-none text-white" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email</label><input type="email" className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black outline-none text-white" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} /></div>
                  </div>

                  {newStaff.role === 'Chauffeur' && (
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Véhicule Attitré</label><input type="text" className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black outline-none text-white" value={newStaff.vehicle} onChange={e => setNewStaff({...newStaff, vehicle: e.target.value})} /></div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Début Service</label><input type="time" className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black outline-none text-white" value={newStaff.workingHours?.start} onChange={e => setNewStaff({...newStaff, workingHours: { ...newStaff.workingHours!, start: e.target.value }})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fin Service</label><input type="time" className="w-full px-6 py-4 bg-slate-950 border border-white/10 rounded-[20px] text-base font-black outline-none text-white" value={newStaff.workingHours?.end} onChange={e => setNewStaff({...newStaff, workingHours: { ...newStaff.workingHours!, end: e.target.value }})} /></div>
                  </div>

                  <div className="flex gap-4 sticky bottom-0 bg-slate-900 pt-6 pb-2 border-t border-white/10 mt-6">
                    {editingStaff && (
                      <button type="button" onClick={(e) => handleDeleteStaff(e, editingStaff)} className="flex-1 py-5 bg-red-500/10 text-red-500 border-2 border-red-500/20 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Supprimer</button>
                    )}
                    <button type="submit" className={`${editingStaff ? 'flex-[2]' : 'w-full'} py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 hover:bg-emerald-700 transition-all`}>
                      {editingStaff ? 'Mettre à jour' : 'Enregistrer'}
                    </button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL ABSENCE --- */}
      {isAddingHoliday && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-8 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-xl border border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-400">
             <div className="px-12 py-10 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                 <h3 className="font-black text-2xl uppercase tracking-widest text-white flex items-center gap-4">
                   <CalendarDays className="w-8 h-8 text-[#0088CC]" />
                   {editingHoliday ? "ÉDITER L'ABSENCE" : "NOUVELLE ABSENCE"}
                 </h3>
                 <button onClick={() => { setIsAddingHoliday(false); setEditingHoliday(null); }} className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-400"><X className="w-8 h-8"/></button>
             </div>
             <form onSubmit={handleSaveHoliday} className="p-12 space-y-8 text-white">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">PERSONNE</label>
                   <div className="relative group">
                    <User className="absolute left-6 top-6 w-5 h-5 text-slate-500 group-focus-within:text-[#0088CC] transition-colors" />
                    <select required className="w-full pl-16 pr-8 py-6 bg-slate-950 border-2 border-white/10 rounded-[28px] text-base font-black focus:bg-slate-950 focus:border-[#0088CC] outline-none transition-all appearance-none cursor-pointer text-white" value={newHoliday.staffId} onChange={e => setNewHoliday({...newHoliday, staffId: e.target.value})}>
                      <option value="">Sélectionner un collaborateur...</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-7 w-4 h-4 text-slate-500 pointer-events-none" />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">TYPE D&apos;ABSENCE</label>
                      <select className="w-full px-8 py-6 bg-slate-950 border-2 border-white/10 rounded-[28px] text-base font-black focus:bg-slate-950 focus:border-[#0088CC] outline-none transition-all appearance-none cursor-pointer text-white" value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value as Holiday['type']})}>
                        <option value="vacances">Vacances</option>
                        <option value="maladie">Maladie</option>
                        <option value="retard">Retard</option>
                        <option value="formation">Formation</option>
                        <option value="indisponible">Indisponible</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">DATE DE DÉBUT</label>
                      <input required type="date" className="w-full px-8 py-6 bg-slate-950 border-2 border-white/10 rounded-[28px] text-base font-black focus:bg-slate-950 outline-none transition-all text-white" value={newHoliday.startDate} onChange={e => setNewHoliday({...newHoliday, startDate: e.target.value})}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">DATE DE FIN</label>
                      <input type="date" className="w-full px-8 py-6 bg-slate-950 border-2 border-white/10 rounded-[28px] text-base font-black focus:bg-slate-950 outline-none transition-all text-white" value={newHoliday.endDate} onChange={e => setNewHoliday({...newHoliday, endDate: e.target.value})}/>
                    </div>
                    {newHoliday.type === 'retard' && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">HEURE PRÉVUE</label>
                        <input type="time" className="w-full px-8 py-6 bg-slate-950 border-2 border-white/10 rounded-[28px] text-base font-black focus:bg-slate-950 outline-none transition-all text-white" value={newHoliday.time} onChange={e => setNewHoliday({...newHoliday, time: e.target.value})}/>
                      </div>
                    )}
                 </div>

                 <div className="flex gap-6 pt-6 border-t border-white/10 mt-6">
                   {editingHoliday && (
                     <button type="button" onClick={() => handleRemoveHoliday(editingHoliday.id)} className="flex-1 py-6 bg-red-500/10 text-red-500 border-2 border-red-500/20 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3">
                        <Trash2 className="w-4 h-4" /> SUPPRIMER
                     </button>
                   )}
                   <button type="submit" className="flex-[2] py-6 bg-emerald-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/40 active:scale-95 hover:bg-emerald-700 transition-all">
                     {editingHoliday ? 'METTRE À JOUR' : 'VALIDER L\'ABSENCE'}
                   </button>
                 </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CongesManager;

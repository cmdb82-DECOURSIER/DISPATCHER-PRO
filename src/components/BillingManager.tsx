
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Upload, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Building2,
  Save,
  X,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BillingProfile, Invoice, Mission, TariffItem, GlobalSettings } from '../types';
import BillingAIExpert from './BillingAIExpert';

const EditablePriceInput = ({ value, onChange, className }: { value: number, onChange: (val: number) => void, className?: string }) => {
  const safeValue = isNaN(value) ? 0 : (value || 0);
  const [localValue, setLocalValue] = useState(safeValue.toString());
  const [prevValue, setPrevValue] = useState(safeValue);

  if (safeValue !== prevValue) {
    setPrevValue(safeValue);
    const parsedLocal = parseFloat(localValue.replace(',', '.'));
    if (parsedLocal !== safeValue && !(isNaN(parsedLocal) && safeValue === 0)) {
      setLocalValue(safeValue.toString());
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[0-9.,]*$/.test(val)) {
        setLocalValue(val);
        const parsed = parseFloat(val.replace(',', '.'));
        if (!isNaN(parsed)) {
            onChange(parsed);
        } else {
            onChange(0);
        }
    }
  };

  return (
    <input 
        type="text" 
        value={localValue} 
        onChange={handleChange} 
        className={className} 
    />
  );
};

interface BillingManagerProps {
  billingProfiles: BillingProfile[];
  onUpdateBillingProfiles: (profiles: BillingProfile[]) => void;
  missions: Mission[];
  onUpdateMission: (mission: Mission) => void;
  invoices: Invoice[];
  onUpdateInvoices: (invoices: Invoice[]) => void;
  zones: TariffItem[];
  fixedDestinations: TariffItem[];
  specialRoutes: TariffItem[];
  settings: GlobalSettings;
}

export const BillingManager: React.FC<BillingManagerProps> = ({
  billingProfiles,
  onUpdateBillingProfiles,
  missions,
  onUpdateMission,
  invoices,
  zones,
  fixedDestinations,
  specialRoutes,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'profiles' | 'missions'>('missions');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingProfile, setEditingProfile] = useState<BillingProfile | null>(null);
  const [isAddingProfile, setIsAddingProfile] = useState(false);

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedMissionForPricing, setSelectedMissionForPricing] = useState<Mission | null>(null);
  const [pricingSearchTerm, setPricingSearchTerm] = useState('');

  const recalculateMissionTotal = (mission: Mission, overrides: Record<string, number | undefined> = {}) => {
    const res = mission.result!;
    const req = mission.request;
    
    const baseOneWay = overrides.basePrice ?? res.basePrice ?? (res.baseSubTotal ? (res.baseSubTotal / (req.returnToStart ? 1.35 : 1)) : 0);
    const baseTotal = baseOneWay * (req.returnToStart ? 1.35 : 1);
    
    let urgentFee = overrides.urgentFee ?? overrides.urgencyFee ?? res.urgentFee ?? res.urgencyFee ?? 0;
    // Auto-adapt if base price changed and option is active
    if (overrides.basePrice !== undefined && req.isUrgent && overrides.urgentFee === undefined && overrides.urgencyFee === undefined) {
        urgentFee = Math.round((baseTotal * (req.urgencySurchargePercent / 100)) * 100) / 100;
    }

    let volumeFee = overrides.volumeFee ?? res.volumeFee ?? 0;
    if (overrides.basePrice !== undefined && req.isBigVolume && overrides.volumeFee === undefined) {
        volumeFee = Math.round((baseTotal * (req.volumeSurchargePercent / 100)) * 100) / 100;
    }

    let preciseTimeFee = overrides.preciseTimeFee ?? res.preciseTimeFee ?? 0;
    if (overrides.basePrice !== undefined && req.isPreciseTime && overrides.preciseTimeFee === undefined) {
        preciseTimeFee = Math.round((baseTotal * (req.preciseTimeSurchargePercent / 100)) * 100) / 100;
    }

    const weekendFee = overrides.weekendFee ?? res.weekendFee ?? 0;
    const apostilleFee = overrides.apostilleFee ?? res.apostilleFee ?? 0;
    const waitingFee = overrides.waitingFee ?? res.waitingFee ?? 0;
    const maeFee = overrides.maeFee ?? res.maeFee ?? 0;
    const maeAllerFee = overrides.maeAllerFee ?? res.maeAllerFee ?? 0;
    const maePickupFee = overrides.maePickupFee ?? res.maePickupFee ?? 0;
    
    let manualItemsTotal = 0;
    (req.manualItems || []).forEach(item => {
        manualItemsTotal += item.price;
    });

    const subTotal = baseTotal + urgentFee + volumeFee + preciseTimeFee + weekendFee + apostilleFee + waitingFee + maeAllerFee + maePickupFee + manualItemsTotal;
    
    const fuelPercent = overrides.customFuelSurchargePercent ?? req.customFuelSurchargePercent ?? 8;
    const fuelSurcharge = overrides.fuelSurcharge ?? (subTotal * (fuelPercent / 100));
    
    const priceHT = subTotal + fuelSurcharge;
    const vatPercent = req.customVatPercent ?? 17;
    const vatAmount = Math.round((priceHT * (vatPercent / 100)) * 100) / 100;
    const advancedFees = overrides.advancedFees ?? res.advancedFees ?? req.advancedFees ?? 0;
    const priceTTC = Math.round((priceHT + vatAmount + advancedFees + maeFee) * 100) / 100;

    return {
        ...res,
        basePrice: baseOneWay,
        baseSubTotal: baseTotal,
        urgentFee,
        urgencyFee: urgentFee,
        volumeFee,
        preciseTimeFee,
        weekendFee,
        apostilleFee,
        waitingFee,
        maeFee,
        maeAllerFee,
        maePickupFee,
        fuelSurcharge,
        fuelCost: fuelSurcharge,
        priceHT,
        vatAmount,
        priceTTC,
        advancedFees
    };
  };

  // --- EXCEL EXPORT ---
  const exportToExcel = (data: Record<string, unknown>[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const processData = (jsonData: Record<string, string>[]) => {
        if (activeTab === 'profiles') {
          const newProfiles: BillingProfile[] = jsonData.map((row, index) => {
            const addressParts = [row["N° et nom de rue"], row["Code postal"], row["Ville"], row["Pays"]].filter(Boolean);
            const address = addressParts.length > 0 ? addressParts.join(', ') : (row.address || row["Adresse"] || '');
            
            return {
              id: row.ID || row.id || `imported-${Date.now()}-${index}`,
              companyName: row["Nom d'usage (interne)"] || row.companyName || row["Nom Société"] || 'Société Inconnue',
              address: address,
              vatNumber: row["N° d'identification fiscale (N° de TVA...)"] || row.vatNumber || row["TVA"] || '',
              email: row["E-mail(s)"] || row.email || row["Email"] || '',
              phone: row["Téléphone"] || row.phone || row["Téléphone"] || '',
              paymentTerms: row["Mode de règlement par défaut"] || row.paymentTerms || row["Conditions Paiement"] || '',
              notes: row["Réf/code client"] ? `Réf client: ${row["Réf/code client"]}` : (row.notes || row["Notes"] || '')
            };
          });
          onUpdateBillingProfiles([...billingProfiles, ...newProfiles]);
          alert(`${newProfiles.length} profils importés avec succès !`);
        } else {
          console.log("Importing invoices not fully implemented yet");
        }
    };

    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          if (lines.length > 0) {
            const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
            const jsonData = lines.slice(1).filter(line => line.trim()).map(line => {
              const values = line.split(';');
              const row: Record<string, string> = {};
              headers.forEach((header, i) => {
                row[header] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
              });
              return row;
            });
            processData(jsonData);
          }
        } catch (error) {
          console.error("Error parsing CSV:", error);
          alert("Erreur lors de l'importation du fichier CSV.");
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];
          processData(jsonData);
        } catch (error) {
          console.error("Error importing Excel:", error);
          alert("Erreur lors de l'importation du fichier Excel.");
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const filteredProfiles = billingProfiles.filter(p => 
    p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vatNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoices = invoices.filter(i => 
    i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const missionsToInvoice = missions.filter(m => m.archivedForBilling && m.status === 'à facturer').filter(m => 
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.missionNumber && m.missionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.request.client?.name && m.request.client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.request.deliveryNoteNumber && m.request.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const missionsToInvoiceStats = useMemo(() => {
    const uniqueDrivers = new Set(missionsToInvoice.map(m => m.driverId).filter(Boolean));
    const totalKm = missionsToInvoice.reduce((acc, m) => acc + (m.result?.totalDistance || 0), 0);
    const totalCO2 = missionsToInvoice.reduce((acc, m) => {
      const factor = m.request.vehicleId === 'camionnette' ? 0.200 : 0.120;
      return acc + (m.result?.totalDistance || 0) * factor;
    }, 0);
    return {
      driverCount: uniqueDrivers.size,
      totalKm: totalKm.toFixed(2),
      totalCO2: totalCO2.toFixed(2)
    };
  }, [missionsToInvoice]);

  const handleSaveProfile = () => {
    if (!editingProfile?.companyName) {
      alert("Le nom de la société est obligatoire.");
      return;
    }

    if (isAddingProfile) {
      onUpdateBillingProfiles([...billingProfiles, { ...editingProfile, id: Math.random().toString(36).substr(2, 9) }]);
    } else {
      onUpdateBillingProfiles(billingProfiles.map(p => p.id === editingProfile.id ? editingProfile : p));
    }
    setEditingProfile(null);
    setIsAddingProfile(false);
  };

  const handleDeleteProfile = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce profil de facturation ?')) {
      onUpdateBillingProfiles(billingProfiles.filter(p => p.id !== id));
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'text-emerald-500 bg-emerald-500/10';
      case 'sent': return 'text-blue-500 bg-blue-500/10';
      case 'overdue': return 'text-rose-500 bg-rose-500/10';
      case 'cancelled': return 'text-slate-500 bg-slate-500/10';
      default: return 'text-amber-500 bg-amber-500/10';
    }
  };

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'sent': return 'Envoyée';
      case 'overdue': return 'En retard';
      case 'cancelled': return 'Annulée';
      default: return 'Brouillon';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex-none p-6 border-b border-white/10 bg-slate-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-widest">
                Facturation & Profils
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Gérez vos profils de facturation et suivez vos factures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const dataToExport = activeTab === 'profiles' 
                  ? billingProfiles 
                  : missionsToInvoice.map(m => ({
                      ID: m.id,
                      Mission: m.missionNumber,
                      Date: m.date,
                      Heure: m.time,
                      Client: m.request.client?.name || '',
                      'Bon de Livraison': m.request.deliveryNoteNumber || '',
                      'Prix HT': m.result?.priceHT || 0,
                      'Statut Facturation': m.billingStatus || 'en attente'
                    }));
                exportToExcel(dataToExport as Record<string, unknown>[], `export-${activeTab}-${new Date().toISOString().split('T')[0]}`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors shadow-sm text-xs font-black uppercase tracking-widest"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            {activeTab === 'profiles' && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(billingProfiles, null, 2));
                  alert("Profils copiés dans le presse-papiers ! Vous pouvez maintenant les coller dans le chat pour l'IA.");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-600/40 transition-colors shadow-sm text-xs font-black uppercase tracking-widest"
                title="Copier les profils pour les envoyer à l'IA"
              >
                <Download className="w-4 h-4 rotate-180" />
                Copier pour l'IA
              </button>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 text-xs font-black uppercase tracking-widest"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
            />
            
            <BillingAIExpert 
              appContext={{
                settings,
                zones,
                fixedDestinations,
                missions
              }}
            />

            {activeTab === 'profiles' && (
              <button
                onClick={() => {
                  setEditingProfile({ id: '', companyName: '', address: '' });
                  setIsAddingProfile(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20 ml-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau Profil
              </button>
            )}
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex p-1 bg-slate-900 rounded-xl w-full sm:w-auto border border-white/5">
            <button
              onClick={() => setActiveTab('missions')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === 'missions' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Missions à facturer
              {missionsToInvoice.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {missionsToInvoice.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'profiles' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Profils
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder={`Rechercher...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'missions' ? (
            <motion.div
              key="missions-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {missionsToInvoice.length > 0 ? (
                <div className="space-y-4">
                  {/* Stats Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Coursiers Actifs</span>
                      <span className="text-2xl font-black text-white">{missionsToInvoiceStats.driverCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Kilomètres</span>
                      <span className="text-2xl font-black text-indigo-400">{missionsToInvoiceStats.totalKm} <span className="text-xs">km</span></span>
                    </div>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total CO2</span>
                      <span className="text-2xl font-black text-emerald-400">{missionsToInvoiceStats.totalCO2} <span className="text-xs text-slate-500">kg</span></span>
                    </div>
                  </div>

                  {missionsToInvoice.map((mission, index) => {
                    const isFinalized = mission.billingStatus === 'finalisée';
                    
                    return (
                      <div key={`${mission.id}-${index}`} className={`border rounded-xl flex flex-col shadow-sm transition-all duration-300 ${
                        isFinalized 
                          ? 'bg-emerald-900/10 border-emerald-500/20' 
                          : 'bg-black/30 border-white/5 p-4 gap-3'
                      }`}>
                        
                        {/* Header: ID, Date, Montant */}
                        <div className={`flex flex-col gap-3 ${isFinalized ? 'p-3' : 'border-b border-white/5 pb-3'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-white uppercase tracking-wider">Mission #{mission.missionNumber || mission.id.slice(0,8)}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border ${
                                  mission.billingStatus === 'finalisée' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' :
                                  mission.billingStatus === 'en cours de traitement' ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                                  'bg-amber-500/5 text-amber-400 border-amber-500/20'
                                }`}>
                                  {mission.billingStatus || 'contrôle'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold">{mission.date} • {mission.time}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {mission.request.deliveryNoteNumber && (
                                <div className="flex flex-col items-end px-3 border-r border-white/10">
                                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">BL</span>
                                  <span className="text-base font-black text-yellow-500">{mission.request.deliveryNoteNumber}</span>
                                </div>
                              )}
                              <div className="flex flex-col items-end">
                                <div className="text-base font-black text-white">{(mission.result?.priceHT || 0).toFixed(2)}€ HT</div>
                                <div className="text-[9px] font-bold text-slate-600 uppercase">{(mission.result?.priceTTC || 0).toFixed(2)}€ TTC</div>
                              </div>
                              {isFinalized && (
                                  <button 
                                    onClick={() => onUpdateMission({...mission, billingStatus: 'en attente de contrôle'})}
                                    className="text-xs text-slate-400 hover:text-white underline ml-4"
                                  >
                                    Modifier
                                  </button>
                              )}
                            </div>
                          </div>

                          {/* Client Distinction */}
                          <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                              <Building2 className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Client Facturé</div>
                              <div className="text-sm font-black text-white">{mission.request.client?.name || 'Client Inconnu'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Details: Addresses & Options - Hidden if finalized */}
                        {!isFinalized && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Détails du Trajet</h4>
                              <div className="space-y-2">
                                {mission.request.stops.map((stop, idx) => (
                                  <div key={stop.id} className="flex items-start gap-2">
                                    <div className="mt-1 text-[10px]">
                                      {idx === 0 ? '🟢' : idx === mission.request.stops.length - 1 ? '🔴' : '🟡'}
                                    </div>
                                    <div className="flex-1">
                                      {stop.clientName && <div className="text-sm font-black text-yellow-400 uppercase mb-0.5">{stop.clientName}</div>}
                                      <div className="text-xs font-bold text-slate-300 leading-snug">{stop.address || 'Adresse non spécifiée'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px] font-bold uppercase">{mission.request.vehicleId}</span>
                                
                                {/* Option Toggles */}
                                <button
                                  onClick={() => {
                                    const newIsUrgent = !mission.request.isUrgent;
                                    const updatedMission = { ...mission, request: { ...mission.request, isUrgent: newIsUrgent } };
                                    const newResult = recalculateMissionTotal(updatedMission, { fuelSurcharge: undefined });
                                    onUpdateMission({ ...updatedMission, result: newResult });
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border transition-all ${
                                    mission.request.isUrgent 
                                      ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                                      : 'bg-slate-900/50 text-slate-500 border-white/5 hover:border-slate-500/50'
                                  }`}
                                >
                                  Urgent
                                </button>

                                <button
                                  onClick={() => {
                                    const newIsBigVolume = !mission.request.isBigVolume;
                                    const updatedMission = { ...mission, request: { ...mission.request, isBigVolume: newIsBigVolume } };
                                    const newResult = recalculateMissionTotal(updatedMission, { fuelSurcharge: undefined });
                                    onUpdateMission({ ...updatedMission, result: newResult });
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border transition-all ${
                                    mission.request.isBigVolume 
                                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                                      : 'bg-slate-900/50 text-slate-500 border-white/5 hover:border-slate-500/50'
                                  }`}
                                >
                                  Volume
                                </button>

                                <button
                                  onClick={() => {
                                    const newReturnToStart = !mission.request.returnToStart;
                                    const updatedMission = { ...mission, request: { ...mission.request, returnToStart: newReturnToStart } };
                                    const newResult = recalculateMissionTotal(updatedMission, { fuelSurcharge: undefined });
                                    onUpdateMission({ ...updatedMission, result: newResult });
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                                    mission.request.returnToStart 
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                                      : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'
                                  }`}
                                >
                                  Aller-Retour
                                </button>
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Instructions & Notes</h4>
                                <textarea 
                                  value={mission.request.instructions || ''}
                                  onChange={(e) => onUpdateMission({
                                    ...mission,
                                    request: { ...mission.request, instructions: e.target.value }
                                  })}
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500 min-h-[80px]"
                                  placeholder="Notes de la mission..."
                                />
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base de données de nos prix</h4>
                                  <button
                                    onClick={() => {
                                      setSelectedMissionForPricing(mission);
                                      setIsPricingModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-all text-[10px] font-black uppercase tracking-widest"
                                  >
                                    <Database className="w-3.5 h-3.5" />
                                    Consulter les tarifs
                                  </button>
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Détail du Prix (Correction Manuelle)</h4>
                                  <div className="text-[10px] font-bold text-indigo-400">MODIFIABLE</div>
                                </div>
                                <div className="space-y-2 text-xs text-slate-300">
                                  <div className="flex items-center justify-between">
                                    <span>Prix de base {mission.request.returnToStart ? '(Aller-Retour)' : ''}</span>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-indigo-500 transition-colors">
                                      <EditablePriceInput 
                                        value={(mission.result?.basePrice ?? (mission.result?.baseSubTotal ? (mission.result.baseSubTotal / (mission.request.returnToStart ? 1.35 : 1)) : 0)) * (mission.request.returnToStart ? 1.35 : 1)}
                                        onChange={(val) => {
                                          const newBaseOneWay = val / (mission.request.returnToStart ? 1.35 : 1);
                                          const newResult = recalculateMissionTotal(mission, { basePrice: newBaseOneWay, fuelSurcharge: undefined });
                                          onUpdateMission({ ...mission, result: newResult });
                                        }}
                                        className="w-full bg-transparent text-right font-black text-white outline-none"
                                      />
                                      <span className="text-slate-500">€</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-red-400">Supplément Urgence</span>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-red-500/50 transition-colors">
                                      <EditablePriceInput 
                                        value={mission.result?.urgentFee ?? mission.result?.urgencyFee ?? 0}
                                        onChange={(val) => {
                                          const newResult = recalculateMissionTotal(mission, { urgentFee: val, fuelSurcharge: undefined });
                                          onUpdateMission({ ...mission, result: newResult });
                                        }}
                                        className="w-full bg-transparent text-right font-black text-red-400 outline-none"
                                      />
                                      <span className="text-slate-500">€</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-purple-400">Supplément Volume</span>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-purple-500/50 transition-colors">
                                      <EditablePriceInput 
                                        value={mission.result?.volumeFee ?? 0}
                                        onChange={(val) => {
                                          const newResult = recalculateMissionTotal(mission, { volumeFee: val, fuelSurcharge: undefined });
                                          onUpdateMission({ ...mission, result: newResult });
                                        }}
                                        className="w-full bg-transparent text-right font-black text-purple-400 outline-none"
                                      />
                                      <span className="text-slate-500">€</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-blue-400">Heure Précise</span>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-blue-500/50 transition-colors">
                                      <EditablePriceInput 
                                        value={mission.result?.preciseTimeFee ?? 0}
                                        onChange={(val) => {
                                          const newResult = recalculateMissionTotal(mission, { preciseTimeFee: val, fuelSurcharge: undefined });
                                          onUpdateMission({ ...mission, result: newResult });
                                        }}
                                        className="w-full bg-transparent text-right font-black text-blue-400 outline-none"
                                      />
                                      <span className="text-slate-500">€</span>
                                    </div>
                                  </div>

                                  {(mission.result?.apostilleFee || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-amber-400">Apostille</span>
                                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-amber-500/50 transition-colors">
                                        <EditablePriceInput 
                                          value={mission.result?.apostilleFee ?? 0}
                                          onChange={(val) => {
                                            const newResult = recalculateMissionTotal(mission, { apostilleFee: val, fuelSurcharge: undefined });
                                            onUpdateMission({ ...mission, result: newResult });
                                          }}
                                          className="w-full bg-transparent text-right font-black text-amber-400 outline-none"
                                        />
                                        <span className="text-slate-500">€</span>
                                      </div>
                                    </div>
                                  )}

                                  {(mission.result?.maeFee || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[#0088CC]">MAE</span>
                                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-[#0088CC]/50 transition-colors">
                                        <EditablePriceInput 
                                          value={mission.result?.maeFee ?? 0}
                                          onChange={(val) => {
                                            const newResult = recalculateMissionTotal(mission, { maeFee: val, fuelSurcharge: undefined });
                                            onUpdateMission({ ...mission, result: newResult });
                                          }}
                                          className="w-full bg-transparent text-right font-black text-[#0088CC] outline-none"
                                        />
                                        <span className="text-slate-500">€</span>
                                      </div>
                                    </div>
                                  )}

                                  {(mission.result?.maeAllerFee || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-blue-400">Aller MAE</span>
                                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-blue-500/50 transition-colors">
                                        <EditablePriceInput 
                                          value={mission.result?.maeAllerFee ?? 0}
                                          onChange={(val) => {
                                            const newResult = recalculateMissionTotal(mission, { maeAllerFee: val, fuelSurcharge: undefined });
                                            onUpdateMission({ ...mission, result: newResult });
                                          }}
                                          className="w-full bg-transparent text-right font-black text-blue-400 outline-none"
                                        />
                                        <span className="text-slate-500">€</span>
                                      </div>
                                    </div>
                                  )}

                                  {(mission.result?.maePickupFee || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-orange-400">Récupération MAE</span>
                                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-orange-500/50 transition-colors">
                                        <EditablePriceInput 
                                          value={mission.result?.maePickupFee ?? 0}
                                          onChange={(val) => {
                                            const newResult = recalculateMissionTotal(mission, { maePickupFee: val, fuelSurcharge: undefined });
                                            onUpdateMission({ ...mission, result: newResult });
                                          }}
                                          className="w-full bg-transparent text-right font-black text-orange-400 outline-none"
                                        />
                                        <span className="text-slate-500">€</span>
                                      </div>
                                    </div>
                                  )}

                                  {(mission.result?.waitingFee || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-emerald-400">Attente</span>
                                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-emerald-500/50 transition-colors">
                                        <EditablePriceInput 
                                          value={mission.result?.waitingFee ?? 0}
                                          onChange={(val) => {
                                            const newResult = recalculateMissionTotal(mission, { waitingFee: val, fuelSurcharge: undefined });
                                            onUpdateMission({ ...mission, result: newResult });
                                          }}
                                          className="w-full bg-transparent text-right font-black text-emerald-400 outline-none"
                                        />
                                        <span className="text-slate-500">€</span>
                                      </div>
                                    </div>
                                  )}

                                  {(mission.request.manualItems || []).map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                      <span className={item.price < 0 ? 'text-emerald-400' : 'text-orange-400'}>{item.name}</span>
                                      <div className={`flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 transition-colors ${item.price < 0 ? 'focus-within:border-emerald-500/50' : 'focus-within:border-orange-500/50'}`}>
                                        <EditablePriceInput 
                                          value={item.price}
                                          onChange={(val) => {
                                            const newManualItems = mission.request.manualItems.map(mi => mi.id === item.id ? { ...mi, price: val } : mi);
                                            const updatedMission = { ...mission, request: { ...mission.request, manualItems: newManualItems } };
                                            const newResult = recalculateMissionTotal(updatedMission, { fuelSurcharge: undefined });
                                            onUpdateMission({ ...updatedMission, result: newResult });
                                          }}
                                          className={`w-full bg-transparent text-right font-black outline-none ${item.price < 0 ? 'text-emerald-400' : 'text-orange-400'}`}
                                        />
                                        <span className="text-slate-500">€</span>
                                      </div>
                                    </div>
                                  ))}

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400">Surcharge Carburant</span>
                                      <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded px-1">
                                        <button 
                                          onClick={() => {
                                            const currentPercent = mission.request.customFuelSurchargePercent ?? 8;
                                            const newPercent = Math.max(0, currentPercent - 0.05);
                                            const newResult = recalculateMissionTotal(mission, { customFuelSurchargePercent: newPercent, fuelSurcharge: undefined });
                                            onUpdateMission({ 
                                              ...mission, 
                                              request: { ...mission.request, customFuelSurchargePercent: newPercent },
                                              result: newResult 
                                            });
                                          }}
                                          className="text-slate-400 hover:text-white px-1"
                                        >-</button>
                                        <span className="text-[10px] font-bold text-slate-300 w-10 text-center">{(mission.request.customFuelSurchargePercent ?? 8).toFixed(2)}%</span>
                                        <button 
                                          onClick={() => {
                                            const currentPercent = mission.request.customFuelSurchargePercent ?? 8;
                                            const newPercent = currentPercent + 0.05;
                                            const newResult = recalculateMissionTotal(mission, { customFuelSurchargePercent: newPercent, fuelSurcharge: undefined });
                                            onUpdateMission({ 
                                              ...mission, 
                                              request: { ...mission.request, customFuelSurchargePercent: newPercent },
                                              result: newResult 
                                            });
                                          }}
                                          className="text-slate-400 hover:text-white px-1"
                                        >+</button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-slate-500/50 transition-colors">
                                      <EditablePriceInput 
                                        value={mission.result?.fuelSurcharge ?? mission.result?.fuelCost ?? 0}
                                        onChange={(val) => {
                                          const newResult = recalculateMissionTotal(mission, { fuelSurcharge: val });
                                          onUpdateMission({ ...mission, result: newResult });
                                        }}
                                        className="w-full bg-transparent text-right font-black text-slate-300 outline-none"
                                      />
                                      <span className="text-slate-500">€</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-blue-400 font-black">Frais Avancés (SANS TVA)</span>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/10 w-24 focus-within:border-blue-500/50 transition-colors">
                                      <EditablePriceInput 
                                        value={mission.result?.advancedFees ?? mission.request.advancedFees ?? 0}
                                        onChange={(val) => {
                                          const newResult = recalculateMissionTotal(mission, { advancedFees: val });
                                          onUpdateMission({ ...mission, result: newResult });
                                        }}
                                        className="w-full bg-transparent text-right font-black text-blue-400 outline-none"
                                      />
                                      <span className="text-slate-500">€</span>
                                    </div>
                                  </div>

                                  <div className="flex justify-between font-black text-white pt-2 mt-2 border-t border-white/10 text-sm">
                                    <span>TOTAL HT FINAL</span>
                                    <div className="flex items-center gap-1">
                                      <EditablePriceInput 
                                        value={mission.result?.priceHT || 0}
                                        onChange={(val) => {
                                          const vatPercent = mission.request.customVatPercent ?? 17;
                                          const vatAmount = Math.round((val * (vatPercent / 100)) * 100) / 100;
                                          const advancedFees = mission.request.advancedFees || 0;
                                          const maeFee = mission.result?.maeFee || 0;
                                          const priceTTC = Math.round((val + vatAmount + advancedFees + maeFee) * 100) / 100;
                                          onUpdateMission({ ...mission, result: { ...mission.result!, priceHT: val, priceTTC, vatAmount } });
                                        }}
                                        className="w-24 bg-transparent text-right font-black text-indigo-400 outline-none"
                                      />
                                      <span>€</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between font-black text-slate-300 pt-2 border-t border-white/5 text-sm">
                                    <span>TOTAL TTC</span>
                                    <span>{((mission.result?.priceTTC || 0) - (mission.result?.advancedFees ?? mission.request.advancedFees ?? 0) - (mission.result?.maeFee || 0)).toFixed(2)} €</span>
                                  </div>
                                  
                                  <div className="flex justify-between font-black text-[#0088CC] pt-2 border-t border-white/5 text-sm">
                                    <span>TOTAL TTC + FRAIS</span>
                                    <span>{(mission.result?.priceTTC || 0).toFixed(2)} €</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Billing Info & Actions */}
                            <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Informations de Facturation</h4>
                              
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500">Profil de Facturation</label>
                                <select 
                                    value={mission.request.billingProfileId || ''}
                                    onChange={(e) => onUpdateMission({
                                        ...mission,
                                        request: { ...mission.request, billingProfileId: e.target.value }
                                    })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
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
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="pt-2 flex flex-wrap gap-2">
                                <button 
                                  onClick={() => onUpdateMission({...mission, billingStatus: 'en attente de contrôle'})}
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    (!mission.billingStatus || mission.billingStatus === 'en attente de contrôle') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                  }`}
                                >
                                  À Contrôler
                                </button>
                                <button 
                                  onClick={() => onUpdateMission({...mission, billingStatus: 'en cours de traitement'})}
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    mission.billingStatus === 'en cours de traitement' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                  }`}
                                >
                                  En Traitement
                                </button>
                                <button 
                                  onClick={() => onUpdateMission({...mission, billingStatus: 'finalisée'})}
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    mission.billingStatus === 'finalisée' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                  }`}
                                >
                                  Finalisée
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-white/5">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Aucune mission à facturer</h3>
                  <p className="text-slate-400 text-sm">Les missions archivées pour facturation apparaîtront ici.</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'invoices' ? (
            <motion.div
              key="invoices-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {filteredInvoices.length > 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">N° Facture</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Montant TTC</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredInvoices.map((invoice, index) => (
                        <tr key={`${invoice.id}-${index}`} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-mono text-sm text-indigo-400 font-bold">#{invoice.invoiceNumber}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-white">{invoice.clientName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{invoice.date}</td>
                          <td className="px-6 py-4 text-sm font-black text-white">{invoice.amountTTC.toFixed(2)} €</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900 rounded-3xl border border-white/5">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Aucune facture trouvée</h3>
                  <p className="text-slate-500 text-xs max-w-xs text-center mt-2">
                    Les factures apparaîtront ici une fois que vous aurez finalisé des missions.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="profiles-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredProfiles.map((profile, index) => (
                <div key={`${profile.id}-${index}`} className="bg-slate-900 p-5 rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">{profile.companyName}</h3>
                      {profile.vatNumber && <p className="text-[10px] text-slate-500 font-mono mt-1">TVA: {profile.vatNumber}</p>}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingProfile(profile); setIsAddingProfile(false); }} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteProfile(profile.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-400">
                    {profile.address && <p className="truncate" title={profile.address}>📍 {profile.address}</p>}
                    {profile.email && <p className="truncate" title={profile.email}>✉️ {profile.email}</p>}
                    {profile.phone && <p className="truncate" title={profile.phone}>📞 {profile.phone}</p>}
                  </div>
                </div>
              ))}
              
              {filteredProfiles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
                  <Building2 className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">Aucun profil trouvé</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pricing Database Modal */}
      <AnimatePresence>
        {isPricingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600 rounded-xl">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Base de données des prix</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sélectionnez un tarif pour l'appliquer</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPricingModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher une destination, une zone..."
                    value={pricingSearchTerm}
                    onChange={(e) => setPricingSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
                {(() => {
                  const allTariffs = [
                    ...zones.map(z => ({ ...z, category: 'zone' as const })),
                    ...fixedDestinations.map(d => ({ ...d, category: 'destination' as const })),
                    ...specialRoutes.map(r => ({ ...r, category: 'route' as const }))
                  ].filter(t => t.name.toLowerCase().includes(pricingSearchTerm.toLowerCase()));

                  if (allTariffs.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <p className="text-slate-500 font-bold italic">Aucun tarif trouvé pour "{pricingSearchTerm}"</p>
                      </div>
                    );
                  }

                  return allTariffs.map((tariff) => (
                    <button
                      key={tariff.id}
                      onClick={() => {
                        if (selectedMissionForPricing) {
                          const newResult = recalculateMissionTotal(selectedMissionForPricing, { 
                            basePrice: tariff.price / (selectedMissionForPricing.request.returnToStart ? 1.35 : 1), 
                            fuelSurcharge: undefined 
                          });
                          onUpdateMission({ ...selectedMissionForPricing, result: newResult });
                        }
                        setIsPricingModalOpen(false);
                      }}
                      className="w-full p-4 bg-slate-950/50 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-purple-600/10 hover:border-purple-500/30 transition-all group"
                    >
                      <div className="text-left">
                        <div className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">{tariff.name}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                          {tariff.category === 'zone' ? 'Zone' : tariff.category === 'destination' ? 'Destination' : 'Route Spéciale'}
                        </div>
                      </div>
                      <div className="text-lg font-black text-white">{tariff.price.toFixed(2)} €</div>
                    </button>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-800/50">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">
                {isAddingProfile ? 'Nouveau Profil de Facturation' : 'Modifier le Profil'}
              </h3>
              <button onClick={() => setEditingProfile(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom de la société *</label>
                  <input
                    type="text"
                    value={editingProfile.companyName}
                    onChange={(e) => setEditingProfile({...editingProfile, companyName: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    placeholder="Ex: ACME Corp"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Numéro de TVA</label>
                  <input
                    type="text"
                    value={editingProfile.vatNumber || ''}
                    onChange={(e) => setEditingProfile({...editingProfile, vatNumber: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    placeholder="Ex: LU12345678"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adresse de Facturation</label>
                  <input
                    type="text"
                    value={editingProfile.address}
                    onChange={(e) => setEditingProfile({...editingProfile, address: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    placeholder="Adresse complète"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Facturation</label>
                  <input
                    type="email"
                    value={editingProfile.email || ''}
                    onChange={(e) => setEditingProfile({...editingProfile, email: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    placeholder="compta@acme.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Téléphone</label>
                  <input
                    type="text"
                    value={editingProfile.phone || ''}
                    onChange={(e) => setEditingProfile({...editingProfile, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    placeholder="+352..."
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conditions de paiement</label>
                  <input
                    type="text"
                    value={editingProfile.paymentTerms || ''}
                    onChange={(e) => setEditingProfile({...editingProfile, paymentTerms: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    placeholder="Ex: 30 jours fin de mois"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notes internes</label>
                  <textarea
                    value={editingProfile.notes || ''}
                    onChange={(e) => setEditingProfile({...editingProfile, notes: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500 min-h-[80px] resize-none"
                    placeholder="Notes spécifiques pour la facturation..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 bg-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => setEditingProfile(null)}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveProfile}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/20"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

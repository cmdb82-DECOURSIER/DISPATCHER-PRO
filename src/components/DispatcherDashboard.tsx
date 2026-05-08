
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuoteRequest, Client, Stop, TariffItem, GlobalSettings } from '../types';
import { countries } from '../data/countries';
import { estimateMultiStopRoute, parseDispatchNote, optimizeRoute } from '../services/geminiService';
import { maeDocumentTypes } from '../data/mae_options';
import { useSignatories } from '../hooks/useSignatories';
import MapPreview from './MapPreview';
import { DeliveryNoteForm, DeliveryNoteFormHandle } from './DeliveryNoteForm';
import * as XLSX from 'xlsx';
import { 
  MapPin, Plus, Trash2, RotateCcw, UserPlus, User, Calendar, Clock, 
  Loader2, Search, X, Map as MapIcon, Calculator, 
  Users, Pencil, Download, Upload, ChevronDown, Zap,
  Milestone, Settings2, PlusCircle, MinusCircle, ListPlus, Hash, Mail, Building,
  Check, Info, Eraser, Sparkles, ClipboardPaste, Archive, Database, Phone, FileText, FileCheck
} from 'lucide-react';

interface Props {
  request: QuoteRequest;
  onChange: (r: QuoteRequest) => void;
  clients: Client[];
  onAddClient: (c: Client) => void;
  onAddClients: (cs: Client[]) => void;
  onUpdateClient: (c: Client) => void;
  onDeleteClient: (id: string) => void;
  customTariffs: TariffItem[];
  onAddTariff: (t: TariffItem) => void;
  onShareMission: () => void;
  zones: TariffItem[];
  fixedDestinations: TariffItem[];
  settings: GlobalSettings;
  onUpdateSettings: (s: GlobalSettings) => void;
}

export const DispatcherDashboard: React.FC<Props> = ({ 
  request, onChange, clients, onAddClient, onAddClients, onUpdateClient, onDeleteClient, 
  onShareMission, zones, fixedDestinations, settings, onUpdateSettings
}) => {
  const [loading, setLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [clientManagerSearch, setClientManagerSearch] = useState('');
  const [activeStopPicker, setActiveStopPicker] = useState<{ id: string, type: 'address' | 'zone' | 'client' } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  
  const { signatories } = useSignatories();

  const mapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const deliveryNoteRef = useRef<DeliveryNoteFormHandle>(null);
  const [cityModePicker, setCityModePicker] = useState<'start' | 'end' | null>(null);

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    phone: '',
    default_address: '',
    email: '',
    default_tariff_id: '',
    clientNumber: ''
  });

  // Tri automatique des clients par ordre alphabétique
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [clients]);

  const filteredManagerClients = useMemo(() => {
    let result = sortedClients;
    if (clientManagerSearch) {
      const s = clientManagerSearch.toLowerCase();
      result = sortedClients.filter(c => 
        c.name.toLowerCase().includes(s) || 
        (c.phone && c.phone.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.clientNumber && c.clientNumber.toLowerCase().includes(s)) ||
        (c.default_address && c.default_address.toLowerCase().includes(s))
      );
    }
    return result;
  }, [sortedClients, clientManagerSearch]);

  const handleExportClients = () => {
    if (clients.length === 0) {
      alert("La liste des clients est vide.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(filteredManagerClients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, `Base_Clients_De_Coursier_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportClients = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
        
        // Mapping des colonnes avec recherche insensible à la casse
        const mappedData: Client[] = rawData.map(row => {
          const getVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(key => k.toLowerCase().trim() === key.toLowerCase())
            );
            return foundKey ? String(row[foundKey]).trim() : '';
          };

          return {
            id: getVal(['id']) || Math.random().toString(36).substr(2, 9),
            name: getVal(['name', 'nom', 'client', 'raison sociale', 'company', 'société']),
            phone: getVal(['phone', 'téléphone', 'tel', 'mobile', 'gsm']),
            email: getVal(['email', 'mail', 'courriel']),
            default_address: getVal(['default_address', 'adresse', 'address', 'lieu']),
            clientNumber: getVal(['clientNumber', 'n° client', 'numéro client', 'code', 'ref']),
            default_tariff_id: getVal(['default_tariff_id', 'tarif', 'grille', 'zone'])
          };
        }).filter(c => c.name); // On ne garde que ceux qui ont un nom

        if (mappedData.length === 0) {
          alert("Aucun client valide trouvé. Assurez-vous d'avoir une colonne 'Nom' ou 'Name'.");
          return;
        }

        if (window.confirm(`Voulez-vous importer ${mappedData.length} clients ?`)) {
          onAddClients(mappedData);
          alert("Importation terminée !");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    
    if (editingClientId) {
      const client: Client = {
        id: editingClientId,
        name: newClient.name || '',
        phone: newClient.phone || '',
        email: newClient.email,
        default_address: newClient.default_address,
        default_tariff_id: newClient.default_tariff_id,
        clientNumber: newClient.clientNumber
      };
      onUpdateClient(client);
    } else {
      const client: Client = {
        id: Math.random().toString(36).substr(2, 9),
        name: newClient.name || '',
        phone: newClient.phone || '',
        email: newClient.email,
        default_address: newClient.default_address,
        default_tariff_id: newClient.default_tariff_id,
        clientNumber: newClient.clientNumber
      };
      onAddClient(client);
    }
    
    setIsClientModalOpen(false);
    setEditingClientId(null);
    setNewClient({ name: '', phone: '', default_address: '', email: '', default_tariff_id: '', clientNumber: '' });
  };

  const handleSmartImport = async () => {
    if (!smartImportText.trim()) return;
    setIsAnalyzing(true);
    try {
        const result = await parseDispatchNote(smartImportText);
        
        const newRequest = { ...request };

        // Mettre à jour les arrêts si trouvés
        if (result.stops && result.stops.length > 0) {
            const newStops = result.stops.map((addr, idx) => {
                const isMae = addr.toUpperCase().includes('MAE') || addr.toUpperCase().includes('APOSTILLE') || addr.toUpperCase().includes('LEGALISATION');
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    address: isMae ? 'MAE (APOSTILLE / LEGALISATION)' : addr,
                    type: idx === 0 ? 'pickup' : idx === result.stops!.length - 1 ? 'dropoff' : 'stop',
                    clientName: isMae ? 'MAE' : '',
                    isMae: isMae
                };
            });
            
            // Assurer au moins 2 arrêts
            if (newStops.length === 1) {
                newStops.push({ id: Math.random().toString(36).substr(2, 9), address: '', type: 'dropoff', clientName: '', isMae: false });
            }
            newRequest.stops = newStops as Stop[];

            // Update global MAE flags
            newRequest.isMae = newStops.some(s => s.isMae);
            newRequest.isMaePickup = newStops[0].isMae || false;
            newRequest.isMaeAller = newStops[newStops.length - 1].isMae || false;
        }

        // Mettre à jour la date/heure
        if (result.selectedDate) {
            newRequest.selectedDate = result.selectedDate;
            newRequest.isScheduled = true;
        }
        if (result.selectedTime) {
            newRequest.selectedTime = result.selectedTime;
            newRequest.isScheduled = true;
        }

        // Mettre à jour l'urgence
        if (result.isUrgent !== undefined) {
            newRequest.isUrgent = result.isUrgent;
        }

        onChange(newRequest);
        setIsSmartImportOpen(false);
        setSmartImportText('');
        // Trigger auto-calculate if we have valid stops? Maybe user wants to review first.
    } catch (error) {
        console.error("Smart import error:", error);
        alert("Impossible d'analyser le texte.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setActiveStopPicker(null);
        setCityModePicker(null);
        setPickerSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPlaceName = (id: string | null) => {
    if (!id) return '';
    if (id.startsWith('zone_')) {
      const idStr = id.replace('zone_', '');
      return zones.find(z => String(z.id) === idStr)?.name || '';
    }
    if (id.startsWith('fixed_')) {
      const idStr = id.replace('fixed_', '');
      return fixedDestinations.find(f => String(f.id) === idStr)?.name || '';
    }
    return '';
  };

  const clientOptions = useMemo(() => {
    return sortedClients.map(c => ({ id: `client_${c.id}`, name: c.name, address: c.default_address, zoneId: c.default_tariff_id }));
  }, [sortedClients]);

  const zoneOptions = useMemo(() => {
    const options: { id: string, name: string, type: 'zone' | 'fixed', price: number }[] = [];
    zones.forEach(z => options.push({ id: `zone_${z.id}`, name: z.name, type: 'zone', price: z.price }));
    fixedDestinations.forEach(d => options.push({ id: `fixed_${d.id}`, name: d.name, type: 'fixed', price: d.price }));
    return options.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'zone' ? -1 : 1;
    });
  }, [zones, fixedDestinations]);

  const handlePickAddress = (stopId: string, item: { address?: string, name?: string, zoneId?: string | null }) => {
    const newStops = request.stops.map(s => {
      if (s.id === stopId) {
        return { 
          ...s, 
          address: item.address || item.name, 
          clientName: item.name || s.clientName, 
          zoneId: item.zoneId !== undefined ? item.zoneId : s.zoneId 
        };
      }
      return s;
    });

    const startZoneId = newStops[0].zoneId || null;
    const endZoneId = newStops[newStops.length - 1].zoneId || null;
    
    let pricingMode = request.pricingMode;
    
    // We no longer force 'forfait' mode. If they are in 'distance' mode, they stay in 'distance' mode
    // but the pricing engine will use the zones if they are selected.
    if (pricingMode === 'calculator') {
        pricingMode = 'distance';
    }

    onChange({ 
        ...request, 
        stops: newStops,
        startZoneId,
        endZoneId,
        pricingMode
    });
    setActiveStopPicker(null);
    setPickerSearch('');
  };

  const handlePickZone = (stopId: string, zoneId: string) => {
    const newStops = request.stops.map(s => {
      if (s.id === stopId) {
        return { ...s, zoneId: zoneId || null };
      }
      return s;
    });

    const startZoneId = newStops[0].zoneId || null;
    const endZoneId = newStops[newStops.length - 1].zoneId || null;
    
    let pricingMode = request.pricingMode;
    
    // We no longer force 'forfait' mode. If they are in 'distance' mode, they stay in 'distance' mode
    // but the pricing engine will use the zones if they are selected.
    if (pricingMode === 'calculator') {
        pricingMode = 'distance';
    }

    onChange({ 
        ...request, 
        stops: newStops, 
        startZoneId, 
        endZoneId,
        pricingMode
    });
    setActiveStopPicker(null);
    setPickerSearch('');
  };

  const filteredAddressOptions = useMemo(() => {
    if (!pickerSearch) return clientOptions;
    return clientOptions.filter(o => o.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  }, [clientOptions, pickerSearch]);

  const filteredZoneOptions = useMemo(() => {
    if (!pickerSearch) return zoneOptions;
    return zoneOptions.filter(o => o.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  }, [zoneOptions, pickerSearch]);

  const addStop = () => {
    const newStop: Stop = { id: Math.random().toString(36).substr(2, 9), address: '', type: 'stop', clientName: '' };
    const newStops = [...request.stops, newStop];
    
    const startZoneId = newStops[0].zoneId || null;
    const endZoneId = newStops[newStops.length - 1].zoneId || null;
    
    const pricingMode = request.pricingMode;

    onChange({ ...request, stops: newStops, startZoneId, endZoneId, pricingMode });
    setIsCalculated(false);
  };

  const removeStop = (id: string) => {
    if (request.stops.length <= 2) return;
    const newStops = request.stops.filter(s => s.id !== id);

    const startZoneId = newStops[0].zoneId || null;
    const endZoneId = newStops[newStops.length - 1].zoneId || null;
    
    const pricingMode = request.pricingMode;

    onChange({ ...request, stops: newStops, startZoneId, endZoneId, pricingMode });
    setIsCalculated(false);
  };

  const clearStop = (id: string) => {
    const newStops = request.stops.map(s => {
      if (s.id === id) {
        return { ...s, address: '', clientName: '', zoneId: null };
      }
      return s;
    });

    const startZoneId = newStops[0].zoneId || null;
    const endZoneId = newStops[newStops.length - 1].zoneId || null;
    
    const pricingMode = request.pricingMode;

    onChange({ ...request, stops: newStops, startZoneId, endZoneId, pricingMode });
    setIsCalculated(false);
  };

  const updateStopField = (id: string, field: keyof Stop, val: string) => {
    const newStops = request.stops.map(s => {
        if (s.id === id) {
            const updated = { ...s, [field]: val };
            return updated;
        }
        return s;
    });

    const startZoneId = newStops[0].zoneId || null;
    const endZoneId = newStops[newStops.length - 1].zoneId || null;
    
    const pricingMode = request.pricingMode;

    onChange({ ...request, stops: newStops, startZoneId, endZoneId, pricingMode });
    setIsCalculated(false);
  };

  const handleCalculateRoute = async (isAuto = false) => {
    setLoading(true);
    try {
      const startZoneId = request.stops[0].zoneId || null;
      const endZoneId = request.stops[request.stops.length - 1].zoneId || null;
      let addresses = request.stops.filter(s => s.address && s.address.trim() !== '').map(s => s.address);
      if (addresses.length < 2 && request.pricingMode === 'forfait') {
        const start = getPlaceName(startZoneId);
        const end = getPlaceName(endZoneId);
        if (start && end) addresses = [start, end];
      }
      if (addresses.length >= 2) {
        const fullRoute = [...addresses];
        if (request.returnToStart) fullRoute.push(addresses[0]);
        const result = await estimateMultiStopRoute(fullRoute);
        onChange({
          ...request,
          startZoneId,
          endZoneId,
          totalDistance: result.distance,
          totalDuration: result.duration,
          stops: request.stops.map((s, i) => ({ ...s, address: result.clean_stops[i] || s.address }))
        });
        setIsCalculated(true);
        // setTimeout(() => mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      } else {
        if (!isAuto) alert("Sélectionnez des zones ou saisissez des adresses.");
      }
    } catch (error) { 
      console.error("Calculate route error:", error);
      if (!isAuto) alert("Erreur de calcul."); 
    } finally { 
      setLoading(false); 
    }
  };

  const addManualItem = (isNegative = false) => {
    const newItem: TariffItem = { id: Math.random().toString(36).substr(2, 9), name: isNegative ? 'Remise' : 'Prestation', price: isNegative ? -10 : 10, category: 'special' };
    onChange({ ...request, manualItems: [...request.manualItems, newItem] });
  };

  const updateManualItem = (id: string, field: keyof TariffItem, val: string | number) => {
    onChange({ ...request, manualItems: request.manualItems.map(item => item.id === id ? { ...item, [field]: val } : item) });
  };

  const removeManualItem = (id: string) => {
    onChange({ ...request, manualItems: request.manualItems.filter(item => item.id !== id) });
  };

  const handleOptimizeRoute = async () => {
    if (request.stops.length <= 2) return;
    
    setLoading(true);
    try {
      const addresses = request.stops.map(s => s.address).filter(a => a && a.trim() !== '');
      if (addresses.length < 3) {
        alert("Veuillez saisir au moins 3 adresses valides pour optimiser.");
        setLoading(false);
        return;
      }

      const result = await optimizeRoute(addresses);
      
      if (result.optimizedStops && result.optimizedStops.length > 0) {
        const newStops: Stop[] = [];
        const availableStops = [...request.stops];
        
        result.optimizedStops.forEach((addr, index) => {
            const matchIndex = availableStops.findIndex(s => s.address === addr);
            
            if (matchIndex !== -1) {
                const stop = availableStops[matchIndex];
                availableStops.splice(matchIndex, 1);
                
                newStops.push({
                    ...stop,
                    id: Math.random().toString(36).substr(2, 9),
                    type: index === 0 ? 'pickup' : index === result.optimizedStops.length - 1 ? 'dropoff' : 'stop'
                });
            } else {
                newStops.push({
                    id: Math.random().toString(36).substr(2, 9),
                    address: addr,
                    type: index === 0 ? 'pickup' : index === result.optimizedStops.length - 1 ? 'dropoff' : 'stop',
                    clientName: ''
                });
            }
        });
        
        onChange({ ...request, stops: newStops });
        alert(`Optimisation terminée : ${result.explanation}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'optimisation du trajet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[32px] shadow-2xl shadow-black/50 border border-white/10 overflow-hidden" ref={dropdownRef}>
      <div className="bg-slate-800/50 backdrop-blur-md px-8 py-5 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-5">
            <div className="p-3 bg-white/5 rounded-2xl shadow-inner border border-white/5">
                <Settings2 className="w-6 h-6 text-[#0088CC]" />
            </div>
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-base font-black text-white uppercase tracking-[0.2em] leading-none">Dispatch Control</h2>
                </div>
                <button 
                    onClick={() => {
                        onChange({
                            stops: [{ id: '1', address: '', type: 'pickup', clientName: '' }, { id: '2', address: '', type: 'dropoff', clientName: '' }],
                            isUrgent: false,
                            isBigVolume: false,
                            isPreciseTime: false,
                            isApostille: false,
                            returnToStart: false,
                            instructions: '',
                            client: undefined,
                            manualItems: [],
                            pricingMode: 'distance',
                            tripType: 'normal',
                            isScheduled: false,
                            selectedDate: new Date().toISOString().split('T')[0],
                            selectedTime: new Date().toTimeString().slice(0, 5)
                        });
                        setIsCalculated(false);
                    }}
                    className="p-2 ml-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"
                    title="Réinitialiser le formulaire"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>
        </div>
        <div className="flex gap-4">
            {request.pricingMode === 'delivery_note' && (
                <>
                    <button onClick={() => deliveryNoteRef.current?.handleDownloadJPG()} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-700 transition-all active:scale-95 border border-white/5">
                        <Download className="w-4 h-4" /> Générer JPG
                    </button>
                    <button onClick={() => deliveryNoteRef.current?.handleShare()} className="bg-[#25D366] text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-[#20b858] transition-all active:scale-95">
                        <Archive className="w-4 h-4" /> Envoyer au Coursier
                    </button>
                    <div className="w-px h-8 bg-white/10 mx-2"></div>
                </>
            )}
            <button onClick={() => setIsClientManagerOpen(true)} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg active:scale-95">
                <Users className="w-4 h-4 text-slate-400" /> Annuaire Clients
            </button>
            <button onClick={() => { setEditingClientId(null); setNewClient({ name: '', phone: '', default_address: '', email: '', default_tariff_id: '', clientNumber: '' }); setIsClientModalOpen(true); }} className="bg-[#0088CC] hover:bg-[#0077b3] text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-95">
                <Plus className="w-4 h-4" /> Ajouter
            </button>
        </div>
      </div>

      <div className="px-8 py-5 border-b border-white/5 bg-slate-800/30">
          <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 text-white cursor-pointer">
                  <input 
                      type="checkbox" 
                      checked={settings.useDeliveryNoteNumbering}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onUpdateSettings({ ...settings, useDeliveryNoteNumbering: checked });
                        if (checked && request.pricingMode === 'delivery_note' && !request.deliveryNoteNumber) {
                          onChange({ ...request, deliveryNoteNumber: String(settings.deliveryNoteStartNumber) });
                        }
                      }}
                      className="w-5 h-5 rounded border-white/10 bg-slate-900 text-[#0088CC] focus:ring-[#0088CC]"
                  />
                  <span className="text-sm font-medium">Activer la numérotation automatique des bons de livraison</span>
              </label>
              {settings.useDeliveryNoteNumbering && (
                  <div className="flex items-center gap-3">
                      <label className="text-sm text-slate-400">Début de séquence:</label>
                      <input 
                          type="number" 
                          value={settings.deliveryNoteStartNumber}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            onUpdateSettings({ ...settings, deliveryNoteStartNumber: val });
                            if (settings.useDeliveryNoteNumbering && request.pricingMode === 'delivery_note') {
                                onChange({ ...request, deliveryNoteNumber: String(val) });
                            }
                          }}
                          className="bg-slate-900 border border-white/10 rounded-xl p-2 text-white w-24 focus:border-[#0088CC] outline-none"
                      />
                  </div>
              )}
          </div>
      </div>
      <div className="p-8 space-y-10">
        
        {/* Mode Toggle moved below */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
                <div className="flex justify-between items-center ml-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Planification Horaire</label>
                    <div className="flex items-center gap-6">
                        <div onClick={() => onChange({ ...request, isScheduled: !request.isScheduled })} className={`w-12 h-6.5 rounded-full p-1 cursor-pointer transition-all ${request.isScheduled ? 'bg-[#0088CC]' : 'bg-slate-700'}`}>
                            <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300 ${request.isScheduled ? 'translate-x-5.5' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>
                {request.isScheduled ? (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-4 top-4 w-4.5 h-4.5 text-slate-400" />
                            <input type="date" className="w-full pl-12 py-3.5 bg-slate-950/50 border border-white/10 rounded-[14px] text-sm font-black focus:bg-slate-900 focus:border-[#0088CC] outline-none shadow-inner text-yellow-400" value={request.selectedDate} onChange={(e) => onChange({...request, selectedDate: e.target.value})}/>
                        </div>
                        <div className="relative w-40">
                            <Clock className="absolute left-4 top-4 w-4.5 h-4.5 text-slate-400" />
                            <input 
                                type="time" 
                                className="w-full pl-12 py-3.5 bg-slate-950/50 border border-white/10 rounded-[14px] text-sm font-black focus:bg-slate-900 focus:border-[#0088CC] outline-none shadow-inner transition-all text-orange-500" 
                                value={request.selectedTime} 
                                onChange={(e) => onChange({...request, selectedTime: e.target.value})}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 px-7 h-[66px] bg-slate-950/30 border border-dashed border-white/10 rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">
                        <Zap className="w-5 h-5 fill-[#FF6600] text-[#FF6600] opacity-80" /> Mission Immédiate / Départ ASAP
                    </div>
                )}
            </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center">
            <div className="bg-slate-950/50 p-1.5 rounded-2xl border border-white/10 flex gap-1 shadow-inner">
                <button 
                    onClick={() => onChange({ ...request, pricingMode: 'distance' })}
                    className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${request.pricingMode === 'distance' || request.pricingMode === 'calculator' || request.pricingMode === 'forfait' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                    <MapIcon className="w-4 h-4" /> Standard (GPS)
                </button>
                <button 
                    onClick={() => onChange({ ...request, pricingMode: 'city' })}
                    className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${request.pricingMode === 'city' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                    <Building className="w-4 h-4" /> Ville à Ville
                </button>
                <button 
                    onClick={() => {
                      const updates: Partial<QuoteRequest> = { pricingMode: 'delivery_note' };
                      if (settings.useDeliveryNoteNumbering && settings.deliveryNoteStartNumber && !request.deliveryNoteNumber) {
                        updates.deliveryNoteNumber = String(settings.deliveryNoteStartNumber);
                      }
                      onChange({ ...request, ...updates });
                    }}
                    className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${request.pricingMode === 'delivery_note' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                    <FileText className="w-4 h-4" /> Bon de Livraison
                </button>
                <button 
                    onClick={() => onChange({ ...request, pricingMode: 'text' })}
                    className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${request.pricingMode === 'text' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                    <FileText className="w-4 h-4" /> Texte Libre
                </button>
            </div>
        </div>

        {(request.pricingMode === 'calculator' || request.pricingMode === 'text') && (
            <div className="space-y-6 p-8 bg-slate-950/30 border border-white/10 rounded-[32px] animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <ListPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="block text-xs font-black text-white uppercase tracking-widest">Grille de Calcul Manuelle</span>
                            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ajoutez vos propres tarifs et équilibrages</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => addManualItem(false)} className="bg-white/5 hover:bg-white/10 text-[#0088CC] border border-white/10 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 shadow-lg">
                            <PlusCircle className="w-4 h-4" /> Ajouter Tarif
                        </button>
                        <button onClick={() => addManualItem(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 shadow-md">
                            <MinusCircle className="w-4 h-4" /> Déduction
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {request.manualItems.length > 0 ? request.manualItems.map((item) => (
                        <div key={item.id} className="flex gap-4 items-center bg-slate-900 p-4 rounded-2xl border border-white/10 shadow-sm animate-in slide-in-from-top-2 duration-300">
                            <div className="flex-1">
                                <input type="text" placeholder="Libellé personnalisé..." value={item.name} onChange={(e) => updateManualItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border-0 text-sm font-black text-white focus:ring-0 placeholder:text-slate-600" />
                            </div>
                            <div className="relative w-32">
                                <input type="number" step="0.01" value={item.price} onChange={(e) => updateManualItem(item.id, 'price', parseFloat(e.target.value) || 0)} className={`w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-black text-right focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none ${item.price < 0 ? 'text-red-400' : 'text-white'}`} />
                                <span className="absolute left-3 top-2.5 text-[10px] font-black text-slate-500">PRIX</span>
                            </div>
                            <button onClick={() => removeManualItem(item.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )) : (
                        <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600 gap-3">
                            <Calculator className="w-8 h-8 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Aucun tarif manuel saisi</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {request.pricingMode === 'delivery_note' && (
            <div className="animate-in fade-in slide-in-from-top-4">
                <DeliveryNoteForm ref={deliveryNoteRef} request={request} onChange={onChange} clients={clients} />
            </div>
        )}

        {request.pricingMode === 'text' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <FileText className="w-4 h-4 text-[#0088CC]" />
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Description de la Mission</span>
                    </div>
                    <div className="bg-slate-950/50 rounded-[32px] border border-white/10 overflow-hidden focus-within:border-[#0088CC] transition-all relative group">
                        <textarea 
                            placeholder="Décrivez la mission (adresses, contacts, instructions, colis...)" 
                            value={request.instructions || ''} 
                            onChange={(e) => onChange({...request, instructions: e.target.value})} 
                            className="w-full px-8 py-6 bg-transparent border-0 text-sm font-bold text-slate-300 outline-none focus:ring-0 min-h-[200px] placeholder:text-slate-600 resize-none" 
                        />
                        <div className="absolute bottom-6 right-6 pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Texte Libre</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                     <button 
                        onClick={onShareMission} 
                        disabled={!request.instructions}
                        className="bg-[#0088CC] hover:bg-[#0077b3] text-white px-8 py-4 rounded-2xl min-h-[48px] text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all border-b-4 border-blue-900"
                    >
                        <Archive className="w-5 h-5" /> ENREGISTRER LA MISSION
                    </button>
                </div>
            </div>
        )}

        {(request.pricingMode === 'distance' || request.pricingMode === 'calculator' || request.pricingMode === 'forfait') && (
        <div className="space-y-10">
            <div className="flex justify-between items-end px-1">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Itinéraire Précis</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Saisissez les adresses pour le guidage GPS</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleOptimizeRoute} disabled={loading || request.stops.length < 3} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Sparkles className="w-4 h-4" /> Optimiser
                    </button>
                    <button onClick={addStop} className="bg-white/5 hover:bg-white/10 text-[#0088CC] border border-white/10 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-3">
                        <Plus className="w-4 h-4" /> Nouvelle Étape
                    </button>
                </div>
            </div>

            <div className="space-y-6 relative pl-10 border-l-2 border-white/5 ml-4">
                {request.stops.map((stop, i) => (
                    <div key={stop.id} className="relative group animate-in slide-in-from-left-4 duration-500 pb-2">
                        <div className={`absolute -left-[53px] top-5 w-7 h-7 rounded-full border-4 border-slate-900 shadow-xl z-10 flex items-center justify-center text-[9px] font-black text-white transition-transform group-hover:scale-110 ${i === 0 ? 'bg-emerald-500' : i === request.stops.length - 1 ? 'bg-[#FF6600]' : 'bg-slate-600'}`}>
                            {i === 0 ? 'DE' : i === request.stops.length - 1 ? 'À' : i + 1}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-900/40 p-2.5 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-slate-900/90 transition-all shadow-sm">
                            {/* Client / Contact */}
                            <div className="lg:col-span-2 space-y-1">
                                <div className="flex items-center gap-1.5 px-1">
                                    <User className="w-2.5 h-2.5 text-slate-500" />
                                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Client / Contact</span>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Contact..." 
                                        value={stop.clientName || ''} 
                                        onChange={(e) => updateStopField(stop.id, 'clientName', e.target.value)} 
                                        onFocus={() => {
                                            setActiveStopPicker({ id: stop.id, type: 'client' });
                                            setPickerSearch('');
                                        }}
                                        autoComplete="off"
                                        className="w-full pl-2.5 pr-7 py-1.5 bg-slate-950/40 border border-white/5 rounded-lg text-[10.5px] font-bold focus:border-[#0088CC] focus:bg-slate-950 outline-none transition-all text-white placeholder:text-slate-700" 
                                    />
                                    <button 
                                        onClick={() => setActiveStopPicker(activeStopPicker?.id === stop.id && activeStopPicker.type === 'client' ? null : { id: stop.id, type: 'client' })}
                                        className="absolute right-2 top-2 text-slate-600 hover:text-[#0088CC]"
                                    >
                                        <ChevronDown className={`w-3 h-3 transition-transform ${activeStopPicker?.id === stop.id && activeStopPicker.type === 'client' ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Réf & Heure */}
                            <div className="lg:col-span-2 space-y-1">
                                <div className="flex items-center gap-1.5 px-0.5">
                                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Réf / Heure</span>
                                </div>
                                <div className="flex gap-1">
                                    <input 
                                        type="text" 
                                        placeholder="Réf..." 
                                        value={stop.reference || ''} 
                                        onChange={(e) => updateStopField(stop.id, 'reference', e.target.value)} 
                                        className="w-[55%] px-2 py-1.5 bg-slate-950/40 border border-white/5 rounded-lg text-[10px] font-bold focus:border-[#0088CC] focus:bg-slate-950 outline-none transition-all text-slate-300 placeholder:text-slate-700" 
                                    />
                                    <input 
                                        type="time" 
                                        value={stop.scheduledTime || ''} 
                                        onChange={(e) => updateStopField(stop.id, 'scheduledTime', e.target.value)} 
                                        className="w-[45%] px-1.5 py-1.5 bg-slate-950/40 border border-white/5 rounded-lg text-[10px] font-bold focus:border-[#0088CC] focus:bg-slate-950 outline-none transition-all text-slate-300" 
                                    />
                                </div>
                            </div>

                            {/* Lieu / Adresse */}
                            <div className="lg:col-span-4 space-y-1">
                                <div className="flex items-center justify-between px-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className={`w-2.5 h-2.5 ${i === 0 ? 'text-emerald-500' : i === request.stops.length - 1 ? 'text-[#FF6600]' : 'text-slate-500'}`} />
                                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Lieu / Adresse</span>
                                    </div>
                                    {(i === 0 || i === request.stops.length - 1) && (
                                        <button 
                                            onClick={() => {
                                                const checked = !stop.isMae;
                                                const updatedStops = [...request.stops];
                                                updatedStops[i] = { 
                                                    ...updatedStops[i], 
                                                    isMae: checked,
                                                    zoneId: checked ? 'zone_1' : updatedStops[i].zoneId,
                                                    clientName: checked ? 'MAE' : updatedStops[i].clientName,
                                                    address: checked ? "6 Rue de l'Ancien Athénée, 1144 Ville-Haute Luxembourg" : updatedStops[i].address
                                                };
                                                
                                                let newStartZoneId = request.startZoneId;
                                                let newEndZoneId = request.endZoneId;
                                                if (request.pricingMode === 'forfait') {
                                                    if (i === 0 && checked) newStartZoneId = 'zone_1';
                                                    if (i === request.stops.length - 1 && checked) newEndZoneId = 'zone_1';
                                                }

                                                const clientIdx = request.tripType === 'normal' ? 0 : request.stops.length - 1;
                                                let updatedClient = request.client;
                                                if (i === clientIdx && checked) {
                                                    updatedClient = { id: 'mae_auto', name: 'MAE', phone: '', email: '', default_address: "6 Rue de l'Ancien Athénée, 1144 Ville-Haute Luxembourg", default_tariff_id: 'zone_1' };
                                                }

                                                const anyMae = updatedStops.some(s => s.isMae);
                                                onChange({
                                                    ...request, 
                                                    stops: updatedStops,
                                                    client: updatedClient,
                                                    isMae: anyMae, 
                                                    isMaeAller: updatedStops[updatedStops.length - 1].isMae,
                                                    isMaePickup: updatedStops[0].isMae,
                                                    startZoneId: newStartZoneId,
                                                    endZoneId: newEndZoneId
                                                });
                                            }}
                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all ${stop.isMae ? 'bg-[#0088CC] border-[#0088CC] text-white' : 'bg-slate-900 border-white/10 text-slate-500 hover:border-[#0088CC]'}`}
                                        >
                                            <span className="text-[7px] font-black uppercase">MAE</span>
                                            {stop.isMae && <Check className="w-2 h-2" />}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder={i === 0 ? "Départ..." : "Arrivée..."} 
                                        value={stop.address} 
                                        onChange={(e) => updateStopField(stop.id, 'address', e.target.value)} 
                                        onFocus={() => {
                                            setActiveStopPicker({ id: stop.id, type: 'address' });
                                            setPickerSearch('');
                                        }}
                                        className="w-full pl-3 pr-8 py-1.5 bg-slate-950/40 border border-white/5 rounded-lg text-[10.5px] font-bold focus:border-[#0088CC] focus:bg-slate-950 outline-none transition-all text-white placeholder:text-slate-700" 
                                    />
                                    <button 
                                        onClick={() => setActiveStopPicker(activeStopPicker?.id === stop.id && activeStopPicker.type === 'address' ? null : { id: stop.id, type: 'address' })} 
                                        className="absolute right-2 top-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-[#0088CC]"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Grille Tarifaire */}
                            <div className="lg:col-span-2 space-y-1">
                                <div className="flex items-center gap-1.5 px-0.5">
                                    <Database className="w-2.5 h-2.5 text-slate-500" />
                                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Tarif</span>
                                </div>
                                <div className="relative">
                                    <div 
                                        onClick={() => setActiveStopPicker(activeStopPicker?.id === stop.id && activeStopPicker.type === 'zone' ? null : { id: stop.id, type: 'zone' })} 
                                        className={`w-full pl-3 pr-8 py-1.5 bg-slate-950/40 border border-white/5 rounded-lg text-[10px] font-black outline-none transition-all cursor-pointer flex items-center justify-between ${stop.zoneId ? 'text-[#0088CC]' : 'text-slate-600'}`}
                                    >
                                        <span className="truncate">{stop.zoneId ? getPlaceName(stop.zoneId) : "Auto..."}</span>
                                        <ChevronDown className="w-3 h-3 text-slate-700" />
                                    </div>
                                    {stop.zoneId && <button onClick={() => handlePickZone(stop.id, '')} className="absolute -right-1 -top-1 w-4 h-4 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all z-20"><X className="w-2 h-2" /></button>}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="lg:col-span-2 flex items-center justify-end gap-0.5">
                                <button onClick={() => clearStop(stop.id)} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-[#0088CC] hover:bg-white/5 rounded-lg transition-all" title="Effacer"><Eraser className="w-3.5 h-3.5" /></button>
                                {request.stops.length > 2 && <button onClick={() => removeStop(stop.id)} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>

                            {/* MAE Config - Horizontal Row if active (The "Sous Case") */}
                            {(i === 0 || i === request.stops.length - 1) && stop.isMae && (
                                <div className="lg:col-span-12 mt-1.5 bg-slate-950/60 p-3 rounded-2xl border border-yellow-500/20 flex flex-wrap items-start gap-4 shadow-inner">
                                    <div className="space-y-1.5">
                                        <span className="block text-[7.5px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Coordonnées Consulat</span>
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <select 
                                                    value={request.maeCountry || ''} 
                                                    onChange={(e) => {
                                                        const country = countries.find(c => c.name === e.target.value);
                                                        const newDocs = (request.maeDocuments || []).map(doc => ({ ...doc, country: e.target.value }));
                                                        onChange({...request, maeCountry: e.target.value, maeType: country?.type, maeDocuments: newDocs});
                                                    }}
                                                    className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-white outline-none focus:border-yellow-500 w-32 appearance-none"
                                                >
                                                    <option value="">PAYS...</option>
                                                    {countries.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                                        <option key={c.name} value={c.name} className="bg-slate-900">{c.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                            </div>
                                            <div className="relative">
                                                <select 
                                                    value={request.maeSignatory || ''}
                                                    onChange={(e) => onChange({...request, maeSignatory: e.target.value})}
                                                    className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-white outline-none focus:border-yellow-500 w-32 appearance-none"
                                                >
                                                    <option value="">SIGNATAIRE...</option>
                                                    {signatories.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-1.5 min-w-[280px]">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-[0.2em]">Documents (Legalisation / Apostille)</span>
                                            <div className="flex gap-5 pr-10">
                                                <span className="text-[7px] font-bold text-slate-600 uppercase">Type</span>
                                                <span className="text-[7px] font-bold text-slate-600 uppercase">Sign.</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                            {(request.maeDocuments || []).map(doc => (
                                                <div key={doc.id} className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-white/5 group/doc">
                                                    <select 
                                                        value={doc.documentType || ''}
                                                        onChange={(e) => {
                                                            const newDocs = request.maeDocuments!.map(d => d.id === doc.id ? {...d, documentType: e.target.value} : d);
                                                            onChange({...request, maeDocuments: newDocs});
                                                        }}
                                                        className="bg-transparent text-[10px] font-black text-yellow-500 outline-none flex-1 truncate px-1"
                                                    >
                                                        <option value="" className="bg-slate-900">TYPE DE DOCUMENT...</option>
                                                        {maeDocumentTypes.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                                    </select>
                                                    <input 
                                                        type="number"
                                                        value={doc.signatureCount}
                                                        onChange={(e) => {
                                                            const newDocs = request.maeDocuments!.map(d => d.id === doc.id ? {...d, signatureCount: parseInt(e.target.value) || 0} : d);
                                                            onChange({...request, maeDocuments: newDocs});
                                                        }}
                                                        className="w-8 bg-slate-900 border border-white/5 rounded text-[10px] font-black text-yellow-500 text-center outline-none"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const newDocs = (request.maeDocuments || []).filter(d => d.id !== doc.id);
                                                            onChange({...request, maeDocuments: newDocs});
                                                        }}
                                                        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-700 hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const newDocs = [...(request.maeDocuments || [])];
                                                    newDocs.push({ id: Math.random().toString(36).substr(2, 9), country: request.maeCountry || '', signatory: request.maeSignatory || '', documentType: '', signatureCount: 1, price: 20 });
                                                    onChange({...request, maeDocuments: newDocs});
                                                }}
                                                className="w-full py-1.5 border border-dashed border-white/10 text-slate-600 hover:text-yellow-500 hover:border-yellow-500/50 transition-all text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> Ajouter Document
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center justify-center gap-2 px-4 border-l border-white/5 h-full self-stretch">
                                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Type Admin</span>
                                        <div className="bg-slate-950 p-1 rounded-lg border border-white/5 flex gap-1">
                                            <button 
                                                onClick={() => onChange({ ...request, maeType: 'apostille' })}
                                                className={`px-3 py-1.5 min-h-[32px] rounded-lg text-[10px] font-black uppercase transition-all ${request.maeType === 'apostille' ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                Apostille
                                            </button>
                                            <button 
                                                onClick={() => onChange({ ...request, maeType: 'legalisation' })}
                                                className={`px-3 py-1.5 min-h-[32px] rounded-lg text-[10px] font-black uppercase transition-all ${request.maeType === 'legalisation' ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                Légalisation
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeStopPicker?.id === stop.id && (
                          <div ref={pickerRef} className="absolute left-0 top-[110px] w-full max-w-lg bg-slate-800 rounded-3xl shadow-2xl shadow-black/50 border border-white/10 z-[100] overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-white/5 bg-slate-900">
                              <div className="relative">
                                <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                                <input autoFocus type="text" placeholder="Rechercher..." className="w-full pl-11 pr-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-xs font-black outline-none focus:border-[#0088CC] shadow-inner text-white placeholder:text-slate-600" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
                              </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                              {activeStopPicker.type === 'address' && (i === 0 || i === request.stops.length - 1) && !pickerSearch && (
                                <button 
                                  onClick={() => {
                                    const newStops = request.stops.map(s => {
                                      if (s.id === stop.id) {
                                        return { 
                                          ...s, 
                                          isMae: true, 
                                          address: 'MAE (APOSTILLE / LEGALISATION)',
                                          clientName: 'MAE'
                                        };
                                      }
                                      return s;
                                    });
                                    const anyMae = newStops.some(s => s.isMae);
                                    const isMaeAller = newStops[newStops.length - 1].isMae || false;
                                    const isMaePickup = newStops[0].isMae || false;
                                    
                                    onChange({ 
                                      ...request, 
                                      stops: newStops, 
                                      isMae: anyMae,
                                      isMaeAller,
                                      isMaePickup,
                                      client: isMaePickup ? { id: 'mae_auto', name: 'MAE', phone: '', email: '', default_address: '', default_tariff_id: '', clientNumber: '' } : request.client
                                    });
                                    setActiveStopPicker(null);
                                    setPickerSearch('');
                                  }}
                                  className="w-full px-6 py-4.5 text-left border-b border-white/5 bg-[#0088CC]/5 hover:bg-[#0088CC]/20 transition-colors flex items-center gap-4 group/mae-opt"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-[#0088CC]/20 flex items-center justify-center border border-[#0088CC]/30">
                                    <FileCheck className="w-5 h-5 text-[#0088CC]" />
                                  </div>
                                  <div>
                                    <span className="block text-[13px] font-black text-[#0088CC] uppercase">MAE (APOSTILLE / LEGALISATION)</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service Spécial</span>
                                  </div>
                                </button>
                              )}
                              {activeStopPicker.type === 'address' || activeStopPicker.type === 'client' ? (
                                filteredAddressOptions.length > 0 ? (
                                  filteredAddressOptions.map(option => (
                                    <button 
                                      key={option.id} 
                                      onClick={() => {
                                        if (activeStopPicker.type === 'client') {
                                            // Handle client selection with a single state update to avoid race conditions
                                            const newStops = request.stops.map(s => {
                                                if (s.id === stop.id) {
                                                    return { 
                                                        ...s, 
                                                        clientName: option.name,
                                                        // Always replace address and zone if picking a client contact
                                                        address: option.address || '',
                                                        zoneId: option.zoneId || null
                                                    };
                                                }
                                                return s;
                                            });

                                            const startZoneId = newStops[0].zoneId || null;
                                            const endZoneId = newStops[newStops.length - 1].zoneId || null;
                                            
                                            onChange({ ...request, stops: newStops, startZoneId, endZoneId });
                                            setActiveStopPicker(null);
                                            setPickerSearch('');
                                        } else {
                                            handlePickAddress(stop.id, option);
                                        }
                                      }} 
                                      className="w-full px-6 py-4.5 text-left border-b border-white/5 hover:bg-[#0088CC]/10 transition-colors flex items-center justify-between group/opt"
                                    >
                                      <div>
                                        <span className="block text-[13px] font-black text-slate-200 uppercase group-hover/opt:text-[#0088CC]">{option.name}</span>
                                        {option.address && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-xs block">{option.address}</span>}
                                      </div>
                                      <Check className="w-5 h-5 text-[#0088CC] opacity-0 group-hover/opt:opacity-100" />
                                    </button>
                                  ))
                                ) : ( <div className="p-8 text-center text-slate-500 font-bold text-[11px] uppercase tracking-widest">Aucun client</div> )
                              ) : (
                                filteredZoneOptions.length > 0 ? (
                                  filteredZoneOptions.map(option => (
                                    <button key={option.id} onClick={() => handlePickZone(stop.id, option.id)} className="w-full px-6 py-4.5 text-left border-b border-white/5 hover:bg-[#0088CC]/10 transition-colors flex items-center justify-between group/opt">
                                      <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl ${option.type === 'zone' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>{option.type === 'zone' ? <MapIcon className="w-4 h-4" /> : <Milestone className="w-4 h-4" />}</div>
                                        <div>
                                          <span className="block text-[13px] font-black text-slate-200 uppercase group-hover/opt:text-[#0088CC]">{option.name}</span>
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{option.type}</span>
                                        </div>
                                      </div>
                                      <Check className="w-5 h-5 text-[#0088CC] opacity-0 group-hover/opt:opacity-100" />
                                    </button>
                                  ))
                                ) : ( <div className="p-8 text-center text-slate-500 font-bold text-[11px] uppercase tracking-widest">Aucune zone</div> )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                ))}
            </div>



            <div className="pt-4">
                <button onClick={() => { onChange({...request, returnToStart: !request.returnToStart}); setIsCalculated(false); }} className={`flex items-center gap-3 px-6 py-3.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${request.returnToStart ? 'bg-blue-500/10 border-blue-500/30 text-[#0088CC]' : 'bg-slate-950 border-white/5 text-slate-500 hover:bg-white/5'}`}><RotateCcw className={`w-4 h-4 ${request.returnToStart ? 'animate-spin-slow' : ''}`} /> Aller-Retour</button>
            </div>

            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 px-1">
                    <Info className="w-4 h-4 text-[#0088CC]" />
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Instructions Particulières</span>
                </div>
                <div className="bg-slate-950/50 rounded-[32px] border border-white/10 overflow-hidden focus-within:border-[#0088CC] transition-all">
                    <textarea placeholder="Précisions chauffeur..." value={request.instructions || ''} onChange={(e) => onChange({...request, instructions: e.target.value})} className="w-full px-8 py-6 bg-transparent border-0 text-sm font-bold text-slate-300 outline-none focus:ring-0 min-h-[120px] placeholder:text-slate-600" />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-10 border-t border-white/5 gap-6">
                <div className="flex gap-4">
                  {isCalculated && <button onClick={onShareMission} className="flex items-center gap-3 px-6 py-3.5 rounded-xl border-2 border-[#25D366] bg-[#25D366]/5 text-[#25D366] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm hover:bg-[#25D366]/10 animate-in slide-in-from-left-2"><Archive className="w-4 h-4" /> Enregistrer Mission</button>}
                </div>
                <button onClick={() => handleCalculateRoute(false)} disabled={loading} className="w-full sm:w-auto bg-[#0088CC] hover:bg-[#0077b3] text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all border-b-4 border-blue-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />} GÉNÉRER LA MISSION / DEVIS</button>
            </div>
            <div ref={mapRef}>
                <MapPreview request={request} isXXL={true} zones={zones} fixedDestinations={fixedDestinations} />
            </div>
            </div>
        )}

        {request.pricingMode === 'city' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col gap-1.5 px-1">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Estimation Ville à Ville</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Calcul rapide de distance entre deux villes</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-950/50 p-8 rounded-[32px] border border-white/5">
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Ville de Départ</label>
                        <div className="relative group">
                            <MapPin className="absolute left-6 top-6 w-6 h-6 text-emerald-500" />
                            <input 
                                type="text" 
                                placeholder="Ex: Paris" 
                                value={request.stops[0]?.address || ''} 
                                onChange={(e) => {
                                    const newStops = [...request.stops];
                                    if (newStops.length === 0) newStops.push({ id: '1', address: '', type: 'pickup' });
                                    newStops[0] = { ...newStops[0], address: e.target.value };
                                    onChange({ ...request, stops: newStops });
                                    setIsCalculated(false);
                                }}
                                onFocus={() => setCityModePicker('start')}
                                className="w-full pl-16 pr-14 py-6 bg-slate-900 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none focus:border-[#0088CC] transition-all"
                            />
                            <button 
                                onClick={() => setCityModePicker(cityModePicker === 'start' ? null : 'start')}
                                className="absolute right-4 top-4 p-2 text-slate-500 hover:text-[#0088CC] hover:bg-white/5 rounded-xl transition-all"
                            >
                                <ChevronDown className={`w-6 h-6 transition-transform ${cityModePicker === 'start' ? 'rotate-180' : ''}`} />
                            </button>

                            {cityModePicker === 'start' && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in zoom-in-95 duration-200" ref={pickerRef}>
                                    <div className="p-4 border-b border-white/5 bg-slate-950/50">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="Rechercher une ville ou zone..." 
                                                value={pickerSearch}
                                                onChange={(e) => setPickerSearch(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-xs font-black text-white outline-none focus:border-[#0088CC] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {zoneOptions.filter(o => !pickerSearch || o.name.toLowerCase().includes(pickerSearch.toLowerCase())).length > 0 ? (
                                            zoneOptions.filter(o => !pickerSearch || o.name.toLowerCase().includes(pickerSearch.toLowerCase())).map(option => (
                                                <button 
                                                    key={option.id} 
                                                    onClick={() => {
                                                        const newStops = [...request.stops];
                                                        if (newStops.length === 0) newStops.push({ id: '1', address: '', type: 'pickup' });
                                                        
                                                        const zoneId = option.type === 'zone' ? option.id.replace('zone_', '') : undefined;
                                                        const fixedDestinationId = option.type === 'fixed' ? option.id.replace('fixed_', '') : undefined;
                                                        
                                                        newStops[0] = { ...newStops[0], address: option.name, zoneId, fixedDestinationId };
                                                        
                                                        const startZoneId = option.id;
                                                        const endZoneId = request.endZoneId;
                                                        
                                                        onChange({ ...request, stops: newStops, startZoneId });
                                                        if (startZoneId && endZoneId) {
                                                            setIsCalculated(true);
                                                        }
                                                        setCityModePicker(null);
                                                        setPickerSearch('');
                                                    }}
                                                    className="w-full px-8 py-4 text-left border-b border-white/5 hover:bg-[#0088CC]/10 transition-colors flex items-center justify-between group/opt last:border-0"
                                                >
                                                    <span className="text-sm font-black text-slate-200 uppercase group-hover/opt:text-[#0088CC]">{option.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{option.type === 'zone' ? 'ZONE' : 'FORFAIT'}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">Aucune zone trouvée</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Ville d'Arrivée</label>
                        <div className="relative group">
                            <MapPin className="absolute left-6 top-6 w-6 h-6 text-[#FF6600]" />
                            <input 
                                type="text" 
                                placeholder="Ex: Lyon" 
                                value={request.stops[request.stops.length - 1]?.address || ''} 
                                onChange={(e) => {
                                    const newStops = [...request.stops];
                                    if (newStops.length < 2) newStops.push({ id: '2', address: '', type: 'dropoff' });
                                    newStops[newStops.length - 1] = { ...newStops[newStops.length - 1], address: e.target.value };
                                    onChange({ ...request, stops: newStops });
                                    setIsCalculated(false);
                                }}
                                onFocus={() => setCityModePicker('end')}
                                className="w-full pl-16 pr-14 py-6 bg-slate-900 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none focus:border-[#0088CC] transition-all"
                            />
                            <button 
                                onClick={() => setCityModePicker(cityModePicker === 'end' ? null : 'end')}
                                className="absolute right-4 top-4 p-2 text-slate-500 hover:text-[#0088CC] hover:bg-white/5 rounded-xl transition-all"
                            >
                                <ChevronDown className={`w-6 h-6 transition-transform ${cityModePicker === 'end' ? 'rotate-180' : ''}`} />
                            </button>

                            {cityModePicker === 'end' && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in zoom-in-95 duration-200" ref={pickerRef}>
                                    <div className="p-4 border-b border-white/5 bg-slate-950/50">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="Rechercher une ville ou zone..." 
                                                value={pickerSearch}
                                                onChange={(e) => setPickerSearch(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-xs font-black text-white outline-none focus:border-[#0088CC] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {zoneOptions.filter(o => !pickerSearch || o.name.toLowerCase().includes(pickerSearch.toLowerCase())).length > 0 ? (
                                            zoneOptions.filter(o => !pickerSearch || o.name.toLowerCase().includes(pickerSearch.toLowerCase())).map(option => (
                                                <button 
                                                    key={option.id} 
                                                    onClick={() => {
                                                        const newStops = [...request.stops];
                                                        if (newStops.length < 2) newStops.push({ id: '2', address: '', type: 'dropoff' });
                                                        
                                                        const zoneId = option.type === 'zone' ? option.id.replace('zone_', '') : undefined;
                                                        const fixedDestinationId = option.type === 'fixed' ? option.id.replace('fixed_', '') : undefined;
                                                        
                                                        newStops[newStops.length - 1] = { ...newStops[newStops.length - 1], address: option.name, zoneId, fixedDestinationId };
                                                        
                                                        const startZoneId = request.startZoneId;
                                                        const endZoneId = option.id;
                                                        
                                                        onChange({ ...request, stops: newStops, endZoneId });
                                                        if (startZoneId && endZoneId) {
                                                            setIsCalculated(true);
                                                        }
                                                        setCityModePicker(null);
                                                        setPickerSearch('');
                                                    }}
                                                    className="w-full px-8 py-4 text-left border-b border-white/5 hover:bg-[#0088CC]/10 transition-colors flex items-center justify-between group/opt last:border-0"
                                                >
                                                    <span className="text-sm font-black text-slate-200 uppercase group-hover/opt:text-[#0088CC]">{option.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{option.type === 'zone' ? 'ZONE' : 'FORFAIT'}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">Aucune zone trouvée</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-6 border-t border-white/5">
                    <button 
                        onClick={() => handleCalculateRoute(false)} 
                        disabled={loading || !request.stops[0]?.address || !request.stops[request.stops.length - 1]?.address}
                        className="bg-[#0088CC] hover:bg-[#0077b3] text-white px-8 py-4 rounded-2xl min-h-[48px] text-xs font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-2xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all border-b-4 border-blue-900"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />} 
                        CALCULER L'ESTIMATION
                    </button>
                </div>

                {isCalculated && (
                    <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                         <button onClick={onShareMission} className="flex items-center gap-4 px-6 py-3.5 rounded-xl min-h-[44px] border-2 border-[#25D366] bg-[#25D366]/5 text-[#25D366] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-sm hover:bg-[#25D366]/10">
                            <Archive className="w-4 h-4" /> Enregistrer Mission
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* --- SMART IMPORT MODAL --- */}
      {isSmartImportOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-300">
           <div className="bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-2xl border border-white/10 flex flex-col animate-in zoom-in-95 duration-400 overflow-hidden relative">
              <div className="px-8 py-6 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-purple-500 rounded-3xl shadow-xl shadow-purple-500/20"><Sparkles className="w-8 h-8 text-white" /></div>
                      <div>
                          <h3 className="font-black text-white text-2xl uppercase tracking-widest leading-none mb-2">IA Smart Import</h3>
                          <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">Analyse automatique de texte</p>
                      </div>
                  </div>
                  <button onClick={() => setIsSmartImportOpen(false)} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"><X className="w-8 h-8" /></button>
              </div>
              <div className="p-8 space-y-6">
                  <div className="space-y-4">
                      <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">Collez votre demande (Email, SMS, Note)</label>
                      <div className="relative group">
                          <ClipboardPaste className="absolute left-6 top-6 w-6 h-6 text-slate-500 group-focus-within:text-purple-500 transition-colors" />
                          <textarea 
                             placeholder="Ex: Besoin d'un coursier demain 14h pour aller de la Gare à Kirchberg. C'est urgent." 
                             className="w-full pl-16 pr-8 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-bold text-white outline-none focus:bg-slate-900 focus:border-purple-500 focus:ring-8 focus:ring-purple-500/5 transition-all min-h-[200px]"
                             value={smartImportText}
                             onChange={(e) => setSmartImportText(e.target.value)}
                          />
                      </div>
                  </div>
                  <button 
                    onClick={handleSmartImport} 
                    disabled={isAnalyzing || !smartImportText.trim()}
                    className="w-full py-8 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-[32px] text-base font-black uppercase tracking-[0.4em] shadow-2xl shadow-purple-500/20 active:scale-95 transition-all border-b-8 border-purple-900 flex items-center justify-center gap-4"
                  >
                    {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                    {isAnalyzing ? 'Analyse en cours...' : 'Analyser & Remplir'}
                  </button>
              </div>
           </div>
        </div>
      )}

      {isClientModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-300">
           {/* ... (Client Modal Content same as before) ... */}
           <div className="bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-2xl border border-white/10 flex flex-col animate-in zoom-in-95 duration-400 overflow-hidden relative">
              <div className="px-8 py-6 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-[#0088CC] rounded-3xl shadow-xl shadow-blue-500/20">{editingClientId ? <Pencil className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}</div>
                      <div>
                          <h3 className="font-black text-white text-2xl uppercase tracking-widest leading-none mb-2">{editingClientId ? 'Modifier' : 'Nouveau'} Client</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enregistrement automatique trié A-Z</p>
                      </div>
                  </div>
                  <button onClick={() => { setIsClientModalOpen(false); setEditingClientId(null); }} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"><X className="w-8 h-8" /></button>
              </div>
              <form onSubmit={handleAddClientSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                      <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">Raison Sociale / NOM</label>
                      <div className="relative group">
                          <Building className="absolute left-6 top-6 w-6 h-6 text-slate-500 group-focus-within:text-[#0088CC] transition-colors" />
                          <input type="text" required placeholder="Nom du compte..." className="w-full pl-16 pr-8 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none focus:bg-slate-900 focus:border-[#0088CC] focus:ring-8 focus:ring-blue-500/5 transition-all" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} />
                      </div>
                  </div>
                  <div className="space-y-3">
                      <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">ADRESSE</label>
                      <div className="relative group">
                          <MapPin className="absolute left-6 top-6 w-6 h-6 text-slate-500 group-focus-within:text-[#0088CC] transition-colors" />
                          <input type="text" placeholder="Adresse complète..." className="w-full pl-16 pr-8 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none focus:bg-slate-900 focus:border-[#0088CC] focus:ring-8 focus:ring-blue-500/5 transition-all" value={newClient.default_address} onChange={(e) => setNewClient({...newClient, default_address: e.target.value})} />
                      </div>
                  </div>
                  <div className="space-y-3">
                      <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">EMAIL FACTURATION</label>
                      <div className="relative group">
                          <Mail className="absolute left-6 top-6 w-6 h-6 text-slate-500 group-focus-within:text-[#0088CC] transition-colors" />
                          <input type="email" placeholder="contact@client.lu" className="w-full pl-16 pr-8 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none focus:bg-slate-900 focus:border-[#0088CC] focus:ring-8 focus:ring-blue-500/5 transition-all" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} />
                      </div>
                  </div>
                  <div className="space-y-3">
                      <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">GRILLE TARIFAIRE</label>
                      <div className="relative group">
                          <Database className="absolute left-6 top-6 w-6 h-6 text-slate-500 group-focus-within:text-[#0088CC] transition-colors" />
                          <select className="w-full pl-16 pr-12 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none focus:bg-slate-900 focus:border-[#0088CC] appearance-none" value={newClient.default_tariff_id} onChange={(e) => setNewClient({...newClient, default_tariff_id: e.target.value})}>
                              <option value="">Standard (Calcul normal)</option>
                              <optgroup label="ZONES VILLE" className="font-black text-slate-400">{zones.sort((a,b)=>a.name.localeCompare(b.name)).map(z => <option key={z.id} value={`zone_${z.id}`}>{z.name}</option>)}</optgroup>
                              <optgroup label="FORFAITS FIXES" className="font-black text-slate-400">{fixedDestinations.sort((a,b)=>a.name.localeCompare(b.name)).map(d => <option key={d.id} value={`fixed_${d.id}`}>{d.name}</option>)}</optgroup>
                          </select>
                          <ChevronDown className="absolute right-6 top-7 w-6 h-6 text-slate-500 pointer-events-none" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                          <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">REF CLIENT</label>
                          <input type="text" placeholder="REF-001" className="w-full px-8 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none" value={newClient.clientNumber} onChange={(e) => setNewClient({...newClient, clientNumber: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                          <label className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">TÉLÉPHONE</label>
                          <input type="tel" placeholder="+352..." className="w-full px-8 py-6 bg-slate-950 border-2 border-white/10 rounded-3xl text-lg font-black text-white outline-none" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} />
                      </div>
                  </div>
                  <button type="submit" className="w-full py-5 mt-4 bg-[#0088CC] hover:bg-[#0077b3] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all border-b-4 border-blue-800">{editingClientId ? 'METTRE À JOUR' : 'ENREGISTRER LE CLIENT'}</button>
              </form>
           </div>
        </div>
      )}

      {isClientManagerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-8 animate-in fade-in duration-300">
          {/* ... (Client Manager Content same as before) ... */}
          <div className="bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-4xl border border-white/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-400 overflow-hidden">
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-blue-500/10 rounded-3xl"><Users className="w-7 h-7 text-[#0088CC]" /></div>
                <div>
                    <h3 className="font-black text-white text-lg uppercase tracking-widest">Base de Données (A-Z)</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{clients.length} Comptes Enregistrés</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl text-[11px] font-black uppercase flex items-center gap-2 hover:bg-emerald-500/20 transition-all"><Upload className="w-4 h-4" /> Import</button>
                <button onClick={handleExportClients} className="px-6 py-3 bg-blue-500/10 text-[#0088CC] border border-blue-500/20 rounded-2xl text-[11px] font-black uppercase flex items-center gap-2 hover:bg-blue-500/20 transition-all"><Download className="w-4 h-4" /> Export</button>
                <input type="file" ref={fileInputRef} onChange={handleImportClients} accept=".xlsx, .xls" className="hidden" />
                <button onClick={() => setIsClientManagerOpen(false)} className="p-3.5 text-slate-400 hover:bg-white/10 hover:text-white rounded-full transition-colors"><X className="w-7 h-7" /></button>
              </div>
            </div>
            <div className="p-8 bg-slate-900 border-b border-white/5">
                <div className="relative group">
                    <Search className="absolute left-6 top-5.5 w-6 h-6 text-slate-500" />
                    <input type="text" placeholder="Rechercher par nom, ville, ref..." className="w-full pl-16 pr-8 py-6 bg-slate-950 border border-white/10 rounded-3xl text-sm font-black outline-none focus:ring-8 focus:ring-blue-500/5 focus:bg-slate-900 text-white transition-all" value={clientManagerSearch} onChange={(e) => setClientManagerSearch(e.target.value)} />
                </div>
            </div>
            <div className="overflow-y-auto flex-1 p-8 space-y-5 bg-slate-950/30 custom-scrollbar">
              {filteredManagerClients.length > 0 ? filteredManagerClients.map(c => (
                <div key={c.id} className="p-6 bg-slate-800 border border-white/5 rounded-[32px] flex justify-between items-center group hover:border-[#0088CC]/30 hover:shadow-2xl transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-900 rounded-[22px] flex items-center justify-center font-black text-slate-500 group-hover:bg-[#0088CC]/10 group-hover:text-[#0088CC] transition-colors text-lg">{c.name.charAt(0)}</div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="font-black text-white group-hover:text-[#0088CC] transition-colors text-base">{c.name}</div>
                            {c.clientNumber && <span className="px-2 py-0.5 bg-slate-900 text-[10px] font-black text-slate-400 rounded-md uppercase tracking-wider flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> {c.clientNumber}</span>}
                        </div>
                        <div className="flex gap-4 mt-1.5 flex-wrap">
                            {c.phone && <div className="text-[12px] text-slate-400 font-bold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 opacity-50" /> {c.phone}</div>}
                            {c.email && <div className="text-[12px] text-slate-400 font-bold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 opacity-50" /> {c.email}</div>}
                            {c.default_address && <div className="text-[12px] text-slate-500 font-bold flex items-center gap-1.5 max-w-xs truncate"><MapPin className="w-3.5 h-3.5 opacity-50" /> {c.default_address}</div>}
                        </div>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => { setEditingClientId(c.id); setNewClient({ name: c.name, phone: c.phone, email: c.email, default_address: c.default_address, default_tariff_id: c.default_tariff_id, clientNumber: c.clientNumber }); setIsClientModalOpen(true); }} className="p-4 text-slate-500 hover:text-[#0088CC] hover:bg-white/5 rounded-2xl transition-all"><Pencil className="w-6 h-6" /></button>
                    <button onClick={() => onDeleteClient(c.id)} className="p-4 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center text-slate-600"><Users className="w-16 h-16 mx-auto mb-6 opacity-20" /><p className="text-sm font-black uppercase tracking-[0.3em]">Aucun client trouvé</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

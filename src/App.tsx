
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { QuoteRequest, Client, Holiday, Staff, Mission, BillingProfile, Invoice, ApostilleRequest, Message } from './types';
import { VEHICLES, DEFAULT_SETTINGS, MOCK_CLIENTS, ZONES, FIXED_DESTINATIONS, SPECIAL_ROUTES } from './constants';
import { IMPORTED_STAFF } from './data/staff';
import { calculatePrice } from './services/pricingEngine';
import { DispatcherDashboard } from './components/DispatcherDashboard';
import { ApostilleManager } from './components/ApostilleManager';
import ResultDisplay from './components/ResultDisplay';
import PricingControl from './components/PricingControl';
import WeatherWidget from './components/WeatherWidget';
import ClockWidget from './components/ClockWidget';
import TariffManager from './components/TariffManager';
import SettingsManager from './components/SettingsManager';
import CongesManager from './components/CongesManager';
import LoginPage from './components/LoginPage';
import { EmailModal } from './components/EmailModal';
import { WhatsappPreviewModal } from './components/WhatsappPreviewModal';
import { MissionManager } from './components/MissionManager';
import { BillingManager } from './components/BillingManager';
import { DriverReports } from './components/DriverReports';
import { AdminExportButton } from './components/AdminExportButton';
import { DiscussionThread } from './components/DiscussionThread';
import { DispatcherStats } from './components/DispatcherStats';
import AIAssistant from './components/AIAssistant';
import { cloudSync } from './services/cloudSync';
import { LayoutDashboard, Database, CalendarOff, LogOut, Archive, Package, Settings2, ReceiptEuro, Map as MapIcon, User, FileText, Settings } from 'lucide-react';
import { db } from './firebase-config';
import { BILLING_DATABASE } from './data/clients_db';

type SyncStatus = 'synced' | 'syncing' | 'receiving' | 'offline' | 'error';

const INITIAL_BILLING_PROFILES: BillingProfile[] = BILLING_DATABASE.billingProfiles;

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('dispatcher_auth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'mission' | 'database' | 'conges' | 'dispatch' | 'facturation' | 'rapports' | 'apostille' | 'settings'>('mission');
  
  const [teamId, setTeamId] = useState<string | null>(cloudSync.getTeamId());
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(db ? 'syncing' : 'offline');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappText, setWhatsappText] = useState('');
  
  const isInternalUpdate = useRef(false);

  // --- ÉTATS GLOBAUX (DÉMARRAGE A ZÉRO OU VALEURS PAR DÉFAUT STATIQUES) ---
  // On ne charge PLUS depuis le localStorage. Si pas de DB, pas de mémoire.
  
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS); // Clients par défaut pour la démo, mais écrasés par le serveur
  const [staff, setStaff] = useState<Staff[]>(IMPORTED_STAFF);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [apostilles, setApostilles] = useState<ApostilleRequest[]>([]);
  const [billingProfiles, setBillingProfiles] = useState<BillingProfile[]>(INITIAL_BILLING_PROFILES);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const hasPendingApostilles = apostilles.some(a => a.status === 'en attente');
  const isBlinking = useMemo(() => hasPendingApostilles && activeTab !== 'apostille', [hasPendingApostilles, activeTab]);
  
  // Données tarifaires par défaut (constantes)
  const [zones, setZones] = useState(ZONES);
  const [fixedDestinations, setFixedDestinations] = useState(FIXED_DESTINATIONS);
  const [specialRoutes, setSpecialRoutes] = useState(SPECIAL_ROUTES);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [request, setRequest] = useState<QuoteRequest>({
    client: null,
    stops: [
      { id: 'start', address: '', type: 'pickup', clientName: '' },
      { id: 'end', address: '', type: 'dropoff', clientName: '' }
    ],
    reference: '',
    returnToStart: false,
    totalDistance: 0,
    totalDuration: 0,
    pricingMode: 'forfait',
    startZoneId: null,
    endZoneId: null,
    fixedDestinationId: null,
    manualItems: [],
    isScheduled: false,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    tripType: 'normal',
    vehicleId: 'voiture',
    isUrgent: false,
    isPreciseTime: false,
    isBigVolume: false,
    packageSize: 'M',
    packageCount: 1,
    isApostille: false,
    isMae: false,
    waitingTimeMinutes: 0,
    waitingTimePricePerMin: 2.5,
    customFuelSurchargePercent: DEFAULT_SETTINGS.default_fuel_surcharge_percent,
    customVatPercent: DEFAULT_SETTINGS.vat_percent,
    urgencySurchargePercent: DEFAULT_SETTINGS.urgency_coefficient,
    volumeSurchargePercent: DEFAULT_SETTINGS.volume_coefficient,
    preciseTimeSurchargePercent: DEFAULT_SETTINGS.precise_time_fee,
    apostillePrice: DEFAULT_SETTINGS.apostille_price || 5,
    discountValue: 0,
    discountType: 'percent',
    manualAdjustment: 0,
    advancedFees: 0,
    basePriceOverride: undefined
  });

  const result = useMemo(() => {
    const selectedVehicle = VEHICLES.find(v => v.id === request.vehicleId) || VEHICLES[0];
    return calculatePrice(request, selectedVehicle, settings, zones, fixedDestinations);
  }, [request, zones, fixedDestinations, settings]);

  // --- LOGIQUE DE SYNCHRONISATION SERVEUR UNIQUEMENT ---
  
  // 1. Abonnement Temps Réel (Subscribe)
  useEffect(() => {
    if (!teamId || !db) {
        setTimeout(() => setSyncStatus(prev => prev !== 'offline' ? 'offline' : prev), 0);
        // Fallback to localStorage if offline
        const savedProfiles = localStorage.getItem('dispatcher_billing_profiles');
        if (savedProfiles) {
          try {
            const parsed = JSON.parse(savedProfiles);
            setTimeout(() => setBillingProfiles(parsed), 0);
          } catch {
            // Error parsing
          }
        }
        const savedInvoices = localStorage.getItem('dispatcher_invoices');
        if (savedInvoices) {
          try {
            const parsed = JSON.parse(savedInvoices);
            setTimeout(() => setInvoices(parsed), 0);
          } catch {
            // Error parsing
          }
        }
        const savedMissions = localStorage.getItem('dispatcher_missions');
        if (savedMissions) {
          try {
            const parsed = JSON.parse(savedMissions);
            setTimeout(() => setMissions(parsed), 0);
          } catch {
            // Error parsing
          }
        }
        return;
    }

    setTimeout(() => setSyncStatus('syncing'), 0);

    // S'abonner aux changements Firestore
    cloudSync.subscribe(teamId, (data) => {
      console.log("📥 Réception données Serveur");
      isInternalUpdate.current = true; 
      
      if (data.clients) setClients(data.clients);
      if (data.zones) setZones(data.zones);
      if (data.destinations) setFixedDestinations(data.destinations);
      if (data.staff) setStaff(data.staff);
      if (data.holidays) setHolidays(data.holidays);
      if (data.missions) setMissions(data.missions);
      if (data.billingProfiles) setBillingProfiles(data.billingProfiles);
      if (data.invoices) setInvoices(data.invoices);
      
      setSyncStatus('synced');
      
      setTimeout(() => { isInternalUpdate.current = false; }, 500);
    });

    return () => {
      cloudSync.unsubscribe();
    };
  }, [teamId]);

  // 2. Envoi des données (Push) vers le Serveur
  useEffect(() => {
    // Fallback to localStorage
    if (!db) {
      localStorage.setItem('dispatcher_billing_profiles', JSON.stringify(billingProfiles));
      localStorage.setItem('dispatcher_invoices', JSON.stringify(invoices));
      localStorage.setItem('dispatcher_missions', JSON.stringify(missions));
    }

    if (!teamId || !db) return;
    if (isInternalUpdate.current) return;

    const timer = setTimeout(() => {
      setSyncStatus('syncing');
      cloudSync.pushData(teamId, {
        clients,
        zones,
        destinations: fixedDestinations,
        staff,
        holidays,
        missions,
        billingProfiles,
        invoices,
        customTariffs: [], 
        lastUpdate: Date.now()
      }).then((success) => {
        setSyncStatus(success ? 'synced' : 'error');
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [teamId, clients, zones, fixedDestinations, staff, holidays, missions, billingProfiles, invoices]);

  // NOTE: On a supprimé le useEffect qui faisait localStorage.setItem(...) 
  // Les données ne sont plus persistées localement.

  const handleLogin = () => {
    sessionStorage.setItem('dispatcher_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dispatcher_auth');
    setIsAuthenticated(false);
  };

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      sender: 'Moi',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleCopyWhatsapp = useCallback(() => {
    const stops = request.stops;
    const isUrgent = request.isUrgent;
    const isPrecise = request.isPreciseTime;
    const isBig = request.isBigVolume;
    
    let text = '';

    if (isUrgent || isPrecise || isBig) {
        text = `*NOUVELLE MISSION COURSIER* 📦\n\n`;

        const activeModules = [];
        if (isUrgent) activeModules.push('🚨 URGENT');
        if (isPrecise) activeModules.push('⏰ HORAIRE PRÉCIS');
        if (isBig) activeModules.push('📦 GROS VOLUME');
        if (request.returnToStart) activeModules.push('🔄 ALLER RETOUR');

        if (activeModules.length > 0) {
            text += `*${activeModules.join(' / ')}*\n\n`;
        }
    }

    if (request.deliveryNoteNumber) {
        text += `🔢 *N° Bon de Livraison:* ${request.deliveryNoteNumber}\n`;
    }
    
    text += `📅 *Date:* ${request.selectedDate}\n`;
    if (request.isPreciseTime) {
        text += `⏰ *Pick-up:* ${request.pickupTimeValue || 'Non spécifié'}\n`;
        text += `⏰ *Livraison:* ${request.preciseTimeValue || 'Non spécifié'}\n`;
    } else {
        text += `⏰ *Heure:* ${request.selectedTime}\n`;
    }
    text += `\n`;

    text += `📍 *DÉPART:*\n`;
    const client = request.client;
    const clientName = (stops[0].clientName || client?.name || 'Client').toUpperCase();
    text += `*CLIENT ${clientName}*`;
    if (client?.clientNumber) text += ` #${client.clientNumber}`;
    else if (stops[0].reference) text += ` #${stops[0].reference}`;
    if (client?.phone) text += ` ${client.phone}`;
    text += `\n${stops[0].address || 'Non spécifié'}\n\n`;

    text += `🏁 *ARRIVÉE:*\n`;
    const lastStop = stops[stops.length - 1];
    const isMae = request.isMae || lastStop.clientName === 'MAE';
    text += `*${isMae ? 'MAE' : (lastStop.clientName || 'Destinataire')}*`;
    if (lastStop.reference) text += ` 🔖 Réf: ${lastStop.reference}`;
    
    if (isMae && request.maeCountry) {
        text += ` ( pays ${request.maeCountry.toUpperCase()} )`;
    }
    text += `\n${lastStop.address || 'Non spécifié'}\n`;
    
    if (request.returnToStart) text += `\n🔄 *RETOUR AU DÉPART REQUIS*`;

    if (request.instructions) {
        text += `\n\n📝 *NOTES:*\n${request.instructions}`;
    }

    setWhatsappText(text);
    setIsWhatsappModalOpen(true);
  }, [request]);

  const handleResetRequest = () => {
    setRequest({
      client: null,
      stops: [
        { id: 'start', address: '', type: 'pickup', clientName: '' },
        { id: 'end', address: '', type: 'dropoff', clientName: '' }
      ],
      reference: '',
      returnToStart: false,
      totalDistance: 0,
      totalDuration: 0,
      pricingMode: 'forfait',
      startZoneId: null,
      endZoneId: null,
      fixedDestinationId: null,
      manualItems: [],
      isScheduled: false,
      selectedDate: new Date().toISOString().split('T')[0],
      selectedTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      tripType: 'normal',
      vehicleId: 'voiture',
      isUrgent: false,
      isPreciseTime: false,
      isBigVolume: false,
      packageSize: 'M',
      packageCount: 1,
      isApostille: false,
      isMae: false,
      waitingTimeMinutes: 0,
      waitingTimePricePerMin: 2.5,
      customFuelSurchargePercent: settings.default_fuel_surcharge_percent,
      customVatPercent: settings.vat_percent,
      urgencySurchargePercent: settings.urgency_coefficient,
      volumeSurchargePercent: settings.volume_coefficient,
      preciseTimeSurchargePercent: settings.precise_time_fee,
      apostillePrice: settings.apostille_price || 5,
      discountValue: 0,
      discountType: 'percent',
      manualAdjustment: 0,
      advancedFees: 0,
      basePriceOverride: undefined
    });
  };

  const handleAddMission = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    let missionNumber = String(missions.length + 1).padStart(3, '0');
    if (settings.useDeliveryNoteNumbering) {
        missionNumber = request.deliveryNoteNumber || String(settings.deliveryNoteStartNumber);
        if (missionNumber === String(settings.deliveryNoteStartNumber)) {
            setSettings(prev => ({ ...prev, deliveryNoteStartNumber: prev.deliveryNoteStartNumber + 1 }));
        }
    }
    
    const newMission: Mission = {
        id: Math.random().toString(36).substr(2, 9),
        missionNumber: missionNumber,
        createdAt: Date.now(),
        date: request.selectedDate,
        time: request.isPreciseTime ? (request.preciseTimeValue || request.selectedTime) : (request.isScheduled ? request.selectedTime : currentTime),
        request: { ...request },
        result: { ...result },
        status: 'en attente',
        priority: request.isUrgent ? 'Haute' : 'Moyenne',
        dispatcherNotes: request.instructions
    };
    setMissions(prev => [...prev, newMission]);
    if (newMission.request.isApostille || newMission.request.isMae) {
      setApostilles(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        missionId: newMission.id,
        reference: '',
        status: 'en attente',
        createdAt: Date.now()
      }]);
    }
    alert(`Mission ${newMission.missionNumber} enregistrée !`);
    setActiveTab('dispatch');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-slate-100 flex flex-col selection:bg-[#0088CC]/30">
      
      <header className="fixed top-0 left-0 right-0 bg-[#1A1A1A]/90 backdrop-blur-2xl border-b border-[#2A2A2A] h-24 flex flex-col justify-center px-8 z-[90] shadow-xl">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-[#0088CC] rounded-xl">
                    <Package className="w-6 h-6 text-white" />
                </div>
                <span className="font-black text-lg tracking-tighter text-white">DE COURSIER</span>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-auto">
                <ClockWidget />
                <nav className="flex gap-0.5 bg-white/5 p-1 rounded-2xl mt-2 whitespace-nowrap">
                    <button onClick={() => setActiveTab('mission')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'mission' ? 'bg-[#0088CC] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <MapIcon className="w-3 h-3" /> Mission
                    </button>
                    <button onClick={() => setActiveTab('dispatch')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'dispatch' ? 'bg-[#FF6600] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Archive className="w-3 h-3" /> Dispatch
                    </button>
                    <button onClick={() => setActiveTab('apostille')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'apostille' ? 'bg-red-600 text-white shadow-lg' : isBlinking ? 'bg-red-500 animate-pulse text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <FileText className="w-3 h-3" /> Apostille
                    </button>
                    <button onClick={() => setActiveTab('facturation')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'facturation' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <ReceiptEuro className="w-3 h-3" /> Facturation
                    </button>
                    <button onClick={() => setActiveTab('database')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'database' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Database className="w-3 h-3" /> Tarif
                    </button>
                    <button onClick={() => setActiveTab('conges')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'conges' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <CalendarOff className="w-3 h-3" /> Congés
                    </button>
                    <button onClick={() => setActiveTab('rapports')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'rapports' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <User className="w-3 h-3" /> Rapport
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${activeTab === 'settings' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Settings className="w-3 h-3" /> Paramètres
                    </button>
                </nav>
            </div>

            <div className="flex items-center gap-6">
                <WeatherWidget />
                <DiscussionThread messages={messages} onSendMessage={handleSendMessage} />
                <button 
                    onClick={handleLogout}
                    className="p-2.5 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-white/5 hover:border-red-500/20 group"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 flex pt-[110px] overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#121212]">
            <div className="max-w-[1800px] mx-auto space-y-8 h-full">
                {(activeTab === 'mission' || activeTab === 'dispatch') && <DispatcherStats missions={missions} />}

                {activeTab === 'mission' ? (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 mb-2 px-1">
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Configurateur de Mission</span>
                    </div>
                    <DispatcherDashboard 
                        request={request} 
                        onChange={setRequest} 
                        clients={clients} 
                        onAddClient={(c) => setClients(prev => [...prev, c])} 
                        onAddClients={(newClients) => setClients(prev => {
                            const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
                            const filtered = newClients.filter(c => !existingNames.has(c.name.toLowerCase()));
                            return [...prev, ...filtered];
                        })}
                        onUpdateClient={(c) => setClients(prev => prev.map(cl => cl.id === c.id ? c : cl))} 
                        onDeleteClient={(id) => setClients(prev => prev.filter(c => c.id !== id))} 
                        customTariffs={[]} 
                        onAddTariff={() => {}} 
                        onShareMission={handleAddMission} 
                        zones={zones} 
                        fixedDestinations={fixedDestinations}
                        settings={settings}
                        onUpdateSettings={setSettings}
                    />
                  </>
                ) : activeTab === 'apostille' ? (
                    <ApostilleManager apostilles={apostilles} missions={missions} onUpdateApostille={(a) => setApostilles(prev => prev.map(ap => ap.id === a.id ? a : ap))} onUpdateMission={(m) => setMissions(prev => prev.map(mis => mis.id === m.id ? m : mis))} />
                ) : activeTab === 'dispatch' ? (
                  <MissionManager 
                    missions={missions} 
                    staff={staff}
                    clients={clients}
                    billingProfiles={billingProfiles}
                    onUpdateMission={(m) => {
                      const selectedVehicle = VEHICLES.find(v => v.id === m.request.vehicleId) || VEHICLES[0];
                      const newResult = calculatePrice(m.request, selectedVehicle, settings, zones, fixedDestinations);
                      const updatedMission = { ...m, result: newResult };
                      setMissions(prev => prev.map(mis => mis.id === m.id ? updatedMission : mis));
                    }}
                    onDeleteMission={(id) => setMissions(prev => prev.filter(m => m.id !== id))}
                  />
                ) : activeTab === 'database' ? (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 mb-2 px-1">
                        <Database className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Gestion Base de Données</span>
                    </div>
                    <TariffManager 
                      zones={zones} onUpdateZones={setZones} destinations={fixedDestinations} onUpdateDestinations={setFixedDestinations} specialRoutes={specialRoutes} onUpdateSpecialRoutes={setSpecialRoutes} onResetToDefaults={() => { setZones(ZONES); setFixedDestinations(FIXED_DESTINATIONS); setSpecialRoutes(SPECIAL_ROUTES); }} currentTeamId={teamId} onConnectTeam={(id) => { setTeamId(id); cloudSync.setTeamId(id); }}
                    />
                  </>
                ) : activeTab === 'facturation' ? (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 mb-2 px-1">
                        <ReceiptEuro className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Gestion Facturation</span>
                    </div>
                    <BillingManager 
                      billingProfiles={billingProfiles}
                      onUpdateBillingProfiles={setBillingProfiles}
                      missions={missions}
                      onUpdateMission={(m) => setMissions(prev => prev.map(mis => mis.id === m.id ? m : mis))}
                      invoices={invoices}
                      onUpdateInvoices={setInvoices}
                      zones={zones}
                      fixedDestinations={fixedDestinations}
                      specialRoutes={specialRoutes}
                      settings={settings}
                    />
                  </>
                ) : activeTab === 'rapports' ? (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 mb-2 px-1">
                        <User className="w-5 h-5 text-pink-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Rapports Chauffeurs</span>
                    </div>
                    <DriverReports missions={missions} staff={staff} />
                  </>
                ) : activeTab === 'settings' ? (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 mb-2 px-1">
                        <Settings className="w-5 h-5 text-slate-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Paramètres de Calcul</span>
                    </div>
                    <SettingsManager settings={settings} onSave={setSettings} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-slate-500 mb-2 px-1">
                        <CalendarOff className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Gestion des Absences & Congés</span>
                    </div>
                    <CongesManager holidays={holidays} onUpdateHolidays={setHolidays} staff={staff} onUpdateStaff={setStaff} />
                  </>
                )}
            </div>
        </div>

        {activeTab === 'mission' && (
          <aside className="w-[440px] bg-[#1A1A1A] border-l border-[#2A2A2A] flex flex-col overflow-y-auto custom-scrollbar shadow-2xl animate-in slide-in-from-right-4 duration-500">
              <div className="p-8 border-b border-[#2A2A2A] bg-[#1A1A1A]">
                  <div className="flex items-center gap-3 text-slate-400 mb-6 px-1">
                      <div className="p-2 bg-[#FF6600]/10 rounded-xl">
                        <Settings2 className="w-5 h-5 text-[#FF6600]" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Configuration Mission</span>
                  </div>
                  <PricingControl request={request} result={result} settings={settings} onChange={setRequest} onCopyWhatsapp={handleCopyWhatsapp} onOpenEmailModal={() => setIsEmailModalOpen(true)} onValidateMission={handleAddMission} onResetRequest={handleResetRequest} />
              </div>
              <div className="flex-1 flex flex-col">
                  <div className="p-8 flex items-center gap-3 text-slate-400">
                      <div className="p-2 bg-[#0088CC]/10 rounded-xl">
                        <ReceiptEuro className="w-5 h-5 text-[#0088CC]" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">DEVIS</span>
                  </div>
                  <div className="px-6 pb-10">
                      <ResultDisplay result={result} request={request} currency="€" vatPercent={request.customVatPercent} zones={zones} fixedDestinations={fixedDestinations} settings={settings} />
                  </div>
              </div>
          </aside>
        )}
      </main>
      <EmailModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} request={request} result={result} zones={zones} fixedDestinations={fixedDestinations} />
      
      {isWhatsappModalOpen && (
        <WhatsappPreviewModal 
            isOpen={isWhatsappModalOpen}
            onClose={() => setIsWhatsappModalOpen(false)}
            initialText={whatsappText}
        />
      )}
      <AdminExportButton 
        data={{ 
          clients, 
          staff, 
          holidays, 
          missions, 
          billingProfiles, 
          invoices, 
          zones, 
          fixedDestinations, 
          specialRoutes,
          settings 
        }} 
      />
      <AIAssistant 
        appContext={{
          settings,
          zones,
          fixedDestinations,
          request,
          activeTab
        }} 
      />
    </div>
  );
};

export default App;

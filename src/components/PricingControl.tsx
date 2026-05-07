import React, { useState } from 'react';
import { QuoteRequest, PriceBreakdown, GlobalSettings } from '../types';
import { VEHICLES } from '../constants';
import { Zap, Clock, Package, FileCheck, Percent, Copy, Mail, CheckCircle, Calculator, Car, Truck, Minus, Plus, Settings, RefreshCw } from 'lucide-react';

interface Props {
  request: QuoteRequest;
  result?: PriceBreakdown;
  settings: GlobalSettings;
  onChange: (r: QuoteRequest) => void;
  onCopyWhatsapp: () => void;
  onOpenEmailModal: () => void;
  onValidateMission: () => void;
  onResetRequest: () => void;
}

const PricingControl: React.FC<Props> = ({ request, result, settings, onChange, onCopyWhatsapp, onOpenEmailModal, onValidateMission, onResetRequest }) => {
  const [showWaitingSettings, setShowWaitingSettings] = useState(false);

  const handleVehicleChange = (vehicleId: string) => {
    onChange({ ...request, vehicleId });
  };

  const toggleOption = (key: keyof QuoteRequest) => {
    onChange({ ...request, [key]: !request[key] });
  };

  const updateWaitingTime = (increment: boolean) => {
    const current = request.waitingTimeMinutes || 0;
    const newValue = increment ? current + 5 : Math.max(0, current - 5);
    onChange({ ...request, waitingTimeMinutes: newValue });
  };

  return (
    <div className="space-y-10">
      {/* Vehicle Selection */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1 h-4 bg-[#0088CC] rounded-full" />
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Véhicule</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {VEHICLES.map((v) => (
            <button
              key={v.id}
              onClick={() => handleVehicleChange(v.id)}
              className={`group relative flex flex-col justify-between p-4 rounded-[24px] border transition-all duration-300 text-left overflow-hidden h-28 ${
                request.vehicleId === v.id
                  ? 'bg-[#0088CC] border-[#0088CC] text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex justify-between w-full items-start">
                  <div className={`p-2.5 rounded-xl transition-colors ${request.vehicleId === v.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    {v.id === 'camionnette' ? <Truck className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                  </div>
                  {request.vehicleId === v.id && (
                    <div className="text-white animate-in zoom-in-50">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
              </div>
              
              <div>
                <div className="text-xs font-black uppercase tracking-wider mb-1">
                  {v.name}
                </div>
                <div className={`text-[10px] font-medium leading-tight ${request.vehicleId === v.id ? 'text-blue-100' : 'text-slate-500'}`}>
                  {v.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Options */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1 h-4 bg-amber-500 rounded-full" />
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Options & Services</h3>
        </div>
        <div className="flex flex-col gap-3">
          {/* Urgence */}
          <div
            className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ${
              request.isUrgent
                ? 'bg-red-500/10 border-red-500/40 text-white shadow-lg shadow-red-500/10'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => toggleOption('isUrgent')}>
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${request.isUrgent ? 'bg-red-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <Zap className={`w-4 h-4 ${request.isUrgent ? 'text-red-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[11px] font-black uppercase tracking-wide ${request.isUrgent ? 'text-red-400' : ''}`}>Urgence</span>
                        <span className={`text-[10px] font-bold ${request.isUrgent ? 'text-red-300/70' : 'text-slate-500'}`}>
                            Supplément Urgence
                        </span>
                    </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${request.isUrgent ? 'bg-red-500 border-red-500 scale-110 shadow-lg shadow-red-500/40' : 'border-slate-800 bg-slate-950'}`} />
            </div>

            {request.isUrgent && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between animate-in slide-in-from-top-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Majoration %</span>
                    <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 w-20">
                        <input 
                            type="number"
                            value={request.urgencySurchargePercent ?? ''}
                            onChange={(e) => onChange({ ...request, urgencySurchargePercent: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-transparent text-xs font-black text-white text-right outline-none"
                        />
                        <span className="text-[9px] font-black text-slate-500">%</span>
                    </div>
                </div>
            )}
          </div>

          {/* Horaire Précis */}
          <div
            className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ${
              request.isPreciseTime
                ? 'bg-blue-500/10 border-blue-500/40 text-white shadow-lg shadow-blue-500/10'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => toggleOption('isPreciseTime')}>
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${request.isPreciseTime ? 'bg-blue-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <Clock className={`w-4 h-4 ${request.isPreciseTime ? 'text-blue-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[11px] font-black uppercase tracking-wide ${request.isPreciseTime ? 'text-blue-400' : ''}`}>Horaire Précis</span>
                        <span className={`text-[10px] font-bold ${request.isPreciseTime ? 'text-blue-300/70' : 'text-slate-500'}`}>
                            Horaire Précis
                        </span>
                    </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${request.isPreciseTime ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/40' : 'border-slate-800 bg-slate-950'}`} />
            </div>

            {request.isPreciseTime && (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Heure de Pick-up</span>
                        <input 
                            type="time"
                            value={request.pickupTimeValue || ''}
                            onChange={(e) => onChange({ ...request, pickupTimeValue: e.target.value })}
                            className="bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 text-xs font-black text-white outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Heure de Livraison</span>
                        <input 
                            type="time"
                            value={request.preciseTimeValue || ''}
                            onChange={(e) => onChange({ ...request, preciseTimeValue: e.target.value })}
                            className="bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 text-xs font-black text-white outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Majoration %</span>
                        <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 w-20">
                            <input 
                                type="number"
                                value={request.preciseTimeSurchargePercent ?? ''}
                                onChange={(e) => onChange({ ...request, preciseTimeSurchargePercent: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-transparent text-xs font-black text-white text-right outline-none"
                            />
                            <span className="text-[9px] font-black text-slate-500">%</span>
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* Grand Volume */}
          <div
            className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ${
              request.isBigVolume
                ? 'bg-purple-500/10 border-purple-500/40 text-white shadow-lg shadow-purple-500/10'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => toggleOption('isBigVolume')}>
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${request.isBigVolume ? 'bg-purple-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <Package className={`w-4 h-4 ${request.isBigVolume ? 'text-purple-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[11px] font-black uppercase tracking-wide ${request.isBigVolume ? 'text-purple-400' : ''}`}>Grand Volume</span>
                        <span className={`text-[10px] font-bold ${request.isBigVolume ? 'text-purple-300/70' : 'text-slate-500'}`}>
                            Grand Volume
                        </span>
                    </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${request.isBigVolume ? 'bg-purple-500 border-purple-500 scale-110 shadow-lg shadow-purple-500/40' : 'border-slate-800 bg-slate-950'}`} />
            </div>
            
            {request.isBigVolume && (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Majoration %</span>
                        <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 w-20">
                            <input 
                                type="number"
                                value={request.volumeSurchargePercent ?? ''}
                                onChange={(e) => onChange({ ...request, volumeSurchargePercent: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-transparent text-xs font-black text-white text-right outline-none"
                            />
                            <span className="text-[9px] font-black text-slate-500">%</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Colis</span>
                        <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 w-20">
                            <input 
                                type="number"
                                min="1"
                                value={request.packageCount ?? 1}
                                onChange={(e) => onChange({ ...request, packageCount: parseInt(e.target.value) || 1 })}
                                className="w-full bg-transparent text-xs font-black text-white text-right outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* Apostille */}
          <div className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ${
            request.isApostille
              ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:border-white/10'
          }`}>
            <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => toggleOption('isApostille')}>
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${request.isApostille ? 'bg-emerald-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <FileCheck className={`w-4 h-4 ${request.isApostille ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[11px] font-black uppercase tracking-wide ${request.isApostille ? 'text-emerald-400' : ''}`}>Apostille</span>
                        <span className={`text-[10px] font-bold ${request.isApostille ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                            Service Apostille
                        </span>
                    </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${request.isApostille ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-lg shadow-emerald-500/40' : 'border-slate-800 bg-slate-950'}`} />
            </div>
            
            {request.isApostille && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between animate-in slide-in-from-top-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Prix</span>
                  <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/10 w-20">
                    <input 
                      type="number"
                      value={request.apostillePrice ?? ''}
                      onChange={(e) => onChange({ ...request, apostillePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-transparent text-xs font-black text-white text-right outline-none"
                    />
                    <span className="text-[9px] font-black text-slate-500">€</span>
                  </div>
                </div>
            )}
          </div>

          {/* MAE Supplements */}
          {request.isMae && (
            <div className="flex flex-col gap-3 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-white/5 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer" onClick={() => toggleOption('isMaeAller')}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg transition-colors ${request.isMaeAller ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                    <Zap className={`w-4 h-4 ${request.isMaeAller ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-[11px] font-black uppercase tracking-wide ${request.isMaeAller ? 'text-blue-400' : ''}`}>Aller vers MAE</span>
                    <span className={`text-[10px] font-bold ${request.isMaeAller ? 'text-blue-300/70' : 'text-slate-500'}`}>Supplément 0.44€</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${request.isMaeAller ? 'bg-blue-500 border-blue-500 scale-110' : 'border-slate-800 bg-slate-950'}`} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-white/5 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer" onClick={() => toggleOption('isMaePickup')}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg transition-colors ${request.isMaePickup ? 'bg-orange-500/20' : 'bg-white/5'}`}>
                    <Zap className={`w-4 h-4 ${request.isMaePickup ? 'text-orange-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-[11px] font-black uppercase tracking-wide ${request.isMaePickup ? 'text-orange-400' : ''}`}>Récupérer au MAE</span>
                    <span className={`text-[10px] font-bold ${request.isMaePickup ? 'text-orange-300/70' : 'text-slate-500'}`}>Supplément 5.00€</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${request.isMaePickup ? 'bg-orange-500 border-orange-500 scale-110' : 'border-slate-800 bg-slate-950'}`} />
              </div>
            </div>
          )}
        </div>
      </section>



      {/* Adjustments Group */}
      <section className="space-y-6 p-6 bg-slate-950/40 rounded-[32px] border border-white/5 shadow-inner">
        {/* Waiting Time */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attente & Retard</h4>
            </div>
            <div className="flex items-center gap-1.5">
                {request.isUrgent && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full animate-in zoom-in-50">
                        <Zap className="w-2.5 h-2.5 text-red-500" />
                        <span className="text-[8px] font-black text-red-500 uppercase">Urgent</span>
                    </div>
                )}
                {request.isPreciseTime && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full animate-in zoom-in-50">
                        <Clock className="w-2.5 h-2.5 text-blue-500" />
                        <span className="text-[8px] font-black text-blue-500 uppercase">Horaire</span>
                    </div>
                )}
                {request.isBigVolume && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full animate-in zoom-in-50">
                        <Package className="w-2.5 h-2.5 text-purple-500" />
                        <span className="text-[8px] font-black text-purple-500 uppercase">Volume</span>
                    </div>
                )}
                {request.isApostille && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-in zoom-in-50">
                        <FileCheck className="w-2.5 h-2.5 text-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-500 uppercase">Apostille</span>
                    </div>
                )}
            </div>
          </div>
          
          <div className={`bg-slate-900/40 border rounded-2xl p-4 transition-all hover:border-white/10 ${request.waitingTimeMinutes > 0 ? 'bg-blue-500/5 border-blue-500/30' : 'border-white/5'}`}>
            {/* Main Control Row */}
            <div className="flex items-center justify-between mb-4">
               <button 
                 onClick={() => updateWaitingTime(false)} 
                 className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
               >
                 <Minus className="w-4 h-4 text-slate-400" />
               </button>
               
               <div className="flex flex-col items-center">
                 <span className="text-2xl font-black text-white tabular-nums">
                    {request.waitingTimeMinutes} <span className="text-sm text-slate-500 font-bold">min</span>
                 </span>
                 <span className="text-[10px] font-bold text-slate-500">
                    {Math.ceil(request.waitingTimeMinutes / 5)} tranches
                 </span>
               </div>

               <button 
                 onClick={() => updateWaitingTime(true)} 
                 className="w-10 h-10 rounded-xl bg-[#0088CC] hover:bg-[#0077B3] flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
               >
                 <Plus className="w-4 h-4 text-white" />
               </button>
            </div>

            {/* Price Details & Settings Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
               <div className="flex flex-col">
                  <span className="text-xs font-black text-[#0088CC]">
                     Frais d'attente
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                     (Calculé par tranche de 5min)
                  </span>
               </div>
               
               <button 
                 onClick={() => setShowWaitingSettings(!showWaitingSettings)} 
                 className={`p-2 rounded-lg transition-colors ${showWaitingSettings ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-600 hover:text-slate-400'}`}
               >
                  <Settings className="w-3.5 h-3.5" />
               </button>
            </div>

            {/* Settings Panel (Collapsible) */}
            {showWaitingSettings && (
               <div className="mt-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Prix par tranche (5min)</span>
                     <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/5 w-20 focus-within:border-[#0088CC]/50 transition-colors">
                        <input 
                          type="number"
                          step="0.1"
                          value={request.waitingTimePricePerMin ?? ''}
                          onChange={(e) => onChange({ ...request, waitingTimePricePerMin: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent text-xs font-black text-white text-right outline-none"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">€</span>
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Discount */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Percent className="w-3.5 h-3.5 text-slate-500" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remise Commerciale</h4>
          </div>
          <div className="flex gap-2">
              <div className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border transition-all group focus-within:border-emerald-500/30 ${request.discountValue > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/80 border-white/5'}`}>
                  <input 
                      type="number" 
                      min="0"
                      max="100"
                      placeholder="0"
                      value={request.discountValue === 0 ? '' : (request.discountValue ?? '')}
                      onChange={(e) => onChange({ ...request, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-transparent text-sm font-black text-white outline-none placeholder:text-slate-700"
                  />
              </div>
              <button 
                  onClick={() => onChange({ ...request, discountType: request.discountType === 'percent' ? 'euro' : 'percent' })}
                  className={`px-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                    request.discountType === 'percent' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : 'bg-slate-900 border-white/5 text-slate-400'
                  }`}
              >
                  {request.discountType === 'percent' ? '%' : 'FIXE'}
              </button>
          </div>
        </div>

        {/* Manual Adjustment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calculator className="w-3.5 h-3.5 text-slate-500" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ajustement Manuel</h4>
          </div>
          <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group focus-within:border-orange-500/30 ${request.manualAdjustment !== 0 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-slate-900/80 border-white/5'}`}>
              <input 
                  type="number" 
                  placeholder="0.00"
                  value={request.manualAdjustment === 0 ? '' : (request.manualAdjustment ?? '')}
                  onChange={(e) => onChange({ ...request, manualAdjustment: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm font-black text-white outline-none placeholder:text-slate-700"
              />
              <span className="text-xs font-black text-slate-600">AJUST.</span>
          </div>
        </div>

        {/* Advanced Fees */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calculator className="w-3.5 h-3.5 text-slate-500" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frais Avancés (Débours)</h4>
          </div>
          <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group focus-within:border-blue-500/30 ${request.advancedFees !== 0 ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-900/80 border-white/5'}`}>
              <input 
                  type="number" 
                  placeholder="0.00"
                  value={request.advancedFees === 0 ? '' : (request.advancedFees ?? '')}
                  onChange={(e) => onChange({ ...request, advancedFees: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm font-black text-white outline-none placeholder:text-slate-700"
              />
              <span className="text-xs font-black text-slate-600">SANS TVA</span>
          </div>
          <p className="text-[9px] font-bold text-slate-500 px-1 italic">Frais tiers déjà taxés (ex: timbres, frais consulaires, etc.)</p>
        </div>
      </section>

      {/* Actions */}
      <div className="pt-8 border-t border-white/5 space-y-4">
        <button 
            onClick={onValidateMission}
            className="w-full py-5 bg-gradient-to-r from-[#0088CC] to-[#0077B3] hover:from-[#0099ee] hover:to-[#0088CC] text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.97] flex items-center justify-center gap-3"
        >
            <CheckCircle className="w-5 h-5" /> Valider la Mission
        </button>
        
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={onCopyWhatsapp}
                className="flex items-center justify-center gap-3 py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            >
                <Copy className="w-4 h-4" /> WhatsApp
            </button>
            <button 
                onClick={onOpenEmailModal}
                className="flex items-center justify-center gap-3 py-4 bg-slate-800/50 hover:bg-slate-800 text-white border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            >
                <Mail className="w-4 h-4" /> Email
            </button>
        </div>

        <button 
            onClick={onResetRequest}
            className="w-full py-4 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
        >
            <RefreshCw className="w-4 h-4" /> Nouvelle Course
        </button>
      </div>
    </div>
  );
};

export default PricingControl;

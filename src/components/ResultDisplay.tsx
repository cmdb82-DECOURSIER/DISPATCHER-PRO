
import React from 'react';
import { PriceBreakdown, QuoteRequest, Zone, FixedDestination, GlobalSettings } from '../types';
import { Leaf, ReceiptText, Zap, Navigation, Box, Clock, FileCheck, Timer, Settings } from 'lucide-react';

interface ResultDisplayProps {
  result: PriceBreakdown;
  request: QuoteRequest;
  currency: string;
  vatPercent: number;
  zones: Zone[];
  fixedDestinations: FixedDestination[];
  settings: GlobalSettings;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, request, currency = '€', vatPercent, zones, fixedDestinations, settings }) => {
  // const formatPrice = (amount: number) => (amount || 0).toFixed(2);
  const co2Emission = ((result.totalDistance || 0) * 0.16).toFixed(2);

  const resolveLocationName = (id: string | null) => {
    if (!id) return null;
    if (id.startsWith('zone_')) {
      const idStr = id.replace('zone_', '');
      return zones.find(z => String(z.id) === idStr)?.name;
    }
    if (id.startsWith('fixed_')) {
      const idStr = id.replace('fixed_', '');
      return fixedDestinations.find(f => String(f.id) === idStr)?.name;
    }
    if (id.startsWith('client_')) {
      return "Adresse Client";
    }
    return null;
  };

  const getStartLocation = () => {
    if (request.pricingMode === 'forfait' || request.pricingMode === 'city') {
        return resolveLocationName(request.startZoneId) || 'Zone Départ';
    }
    return request.stops[0]?.address || 'Adresse Départ';
  };

  const getEndLocation = () => {
    if (request.pricingMode === 'forfait' || request.pricingMode === 'city') {
        return resolveLocationName(request.endZoneId) || 'Destination Finale';
    }
    return request.stops[request.stops.length - 1]?.address || 'Destination Finale';
  };

  return (
    <div className="flex flex-col bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Header Tarif Final */}
      <div className="relative p-6 overflow-hidden bg-black/40 border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-[#0088CC]/50" />
        
        <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                TARIF FINAL TTC
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-5xl font-black text-white tracking-tighter">{(result.priceTTC || 0).toFixed(2)}</span>
                <span className="text-xl font-black text-[#0088CC]">{currency}</span>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 w-full justify-center opacity-60">
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">HT</span>
                    <span className="text-xs font-bold text-slate-300">{(result.priceHT || 0).toFixed(2)}</span>
                </div>
                <div className="w-px h-4 bg-white/10"></div>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TVA</span>
                    <span className="text-xs font-bold text-slate-300">{(result.vatAmount || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Audit de Calcul */}
        <div className="bg-slate-950/40 rounded-3xl border border-white/5 p-6 space-y-5 shadow-inner">
            <div className="flex items-center gap-3 mb-1 px-1">
                <ReceiptText className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit de Calcul</span>
            </div>
            
            <div className="space-y-4 font-mono text-[11px]">
                {request.basePriceOverride ? (
                    <div className="flex flex-col gap-2 pb-3 border-b border-white/5 italic text-slate-500">
                        <span>Calcul automatique désactivé par la correction manuelle du prix de base.</span>
                    </div>
                ) : (
                    <>
                        {(request.pricingMode === 'forfait' || request.pricingMode === 'city' || (request.pricingMode === 'distance' && result.zoneDetails)) && result.zoneDetails && (
                            <div className="flex flex-col gap-3 pb-3 border-b border-white/5">
                                <span className="uppercase tracking-tighter text-slate-500">
                                    {request.pricingMode === 'city' ? 'Formule Ville à Ville' : 'Calcul Tarifaire'}
                                </span>
                                <div className="flex flex-col gap-2 text-slate-300 font-bold pl-2 border-l-2 border-white/10">
                                    {result.zoneDetails.legs && result.zoneDetails.legs.length > 0 ? (
                                        result.zoneDetails.legs.map((leg, idx) => (
                                            <div key={idx} className={`flex flex-col gap-1 ${idx > 0 ? 'pt-2 border-t border-white/5' : ''}`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">{leg.startName}</span>
                                                    <span>{leg.startPrice.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">{leg.endName}</span>
                                                    <span>{leg.endPrice.toFixed(2)}</span>
                                                </div>
                                                {leg.deduction > 0 && (
                                                    <div className="flex justify-between items-center text-red-400">
                                                        <span>Déduction</span>
                                                        <span>-{leg.deduction.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : result.zoneDetails.startPrice > 0 && result.zoneDetails.endPrice > 0 ? (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">{result.zoneDetails.startName}</span>
                                                <span>{result.zoneDetails.startPrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">{result.zoneDetails.endName}</span>
                                                <span>{result.zoneDetails.endPrice.toFixed(2)}</span>
                                            </div>
                                            {result.zoneDetails.deduction > 0 && (
                                                <div className="flex justify-between items-center text-red-400">
                                                    <span>Déduction</span>
                                                    <span>-{result.zoneDetails.deduction.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Tarif Zone</span>
                                            <span>{result.baseSubTotal.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {result.zoneDetails.returnPrice > 0 && (
                                        <div className="flex justify-between items-center text-[#0088CC]">
                                            <span>Retour ({settings.return_trip_percent !== undefined ? settings.return_trip_percent : 35}%)</span>
                                            <span>{result.zoneDetails.returnPrice.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {request.pricingMode === 'distance' && result.distanceDetails && !result.zoneDetails && (
                            <div className="flex flex-col gap-3 pb-3 border-b border-white/5">
                                <span className="uppercase tracking-tighter text-slate-500">Formule Route</span>
                                <div className="flex flex-col gap-2 text-slate-300 font-bold pl-2 border-l-2 border-white/10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Prise en charge</span>
                                        <span>{result.distanceDetails.basePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Distance</span>
                                        <span>{result.distanceDetails.distanceCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Temps</span>
                                        <span>{result.distanceDetails.durationCost.toFixed(2)}</span>
                                    </div>
                                    {result.distanceDetails.returnPrice > 0 && (
                                        <div className="flex justify-between items-center text-[#0088CC]">
                                            <span>Retour</span>
                                            <span>{result.distanceDetails.returnPrice.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                        {request.basePriceOverride ? 'Prix de Base (Corrigé)' : 'Total de Base HT'}
                    </span>
                    <span className={`text-sm font-black ${request.basePriceOverride ? 'text-[#0088CC]' : 'text-white'}`}>
                        {result.baseSubTotal.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>

        {/* Itinerary Summary */}
        <div className="space-y-6 px-2">
            <div className="flex items-start gap-5 relative group">
                <div className="absolute left-[5px] top-6 bottom-[-24px] w-0.5 bg-gradient-to-b from-emerald-500/50 to-orange-500/50 border-dashed border-l border-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shadow-[0_0_15px_rgba(16,185,129,0.5)] shrink-0 z-10" />
                <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Départ</span>
                    {request.stops[0]?.clientName && <span className="text-xs font-black text-yellow-400 uppercase block mb-0.5 truncate">{request.stops[0].clientName}</span>}
                    <span className="text-xs font-bold text-slate-300 leading-relaxed truncate block group-hover:text-white transition-colors">{getStartLocation()}</span>
                </div>
            </div>
            <div className="flex items-start gap-5 group">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF6600] mt-1.5 shadow-[0_0_15px_rgba(255,102,0,0.5)] shrink-0 z-10" />
                <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Arrivée</span>
                    {request.stops[request.stops.length - 1]?.clientName && <span className="text-xs font-black text-yellow-400 uppercase block mb-0.5 truncate">{request.stops[request.stops.length - 1].clientName}</span>}
                    <span className="text-xs font-bold text-slate-300 leading-relaxed truncate block group-hover:text-white transition-colors">
                        {getEndLocation()}
                        {request.returnToStart && <span className="text-[#0088CC] ml-3 font-black bg-blue-500/10 px-2 py-0.5 rounded-md text-[9px]">Aller-Retour</span>}
                    </span>
                </div>
            </div>
        </div>

        {/* Options & Suppléments */}
        <div className="space-y-4 pt-8 border-t border-white/5">
            <div className="px-1 mb-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Options & Suppléments</span>
            </div>
            
            <div className="space-y-3">
                {result.urgencyFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform"/> Urgence</span>
                        <span className="text-slate-200">{result.urgencyFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.preciseTimeFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Clock className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform"/> Horaire Précis</span>
                        <span className="text-slate-200">{result.preciseTimeFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.volumeFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Box className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform"/> Volume ({request.packageSize})</span>
                        <span className="text-slate-200">{result.volumeFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.apostilleFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><FileCheck className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"/> Apostille</span>
                        <span className="text-slate-200">{result.apostilleFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.maeFee !== undefined && result.maeFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><FileCheck className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform"/> MAE (Signatures)</span>
                        <span className="text-slate-200">{result.maeFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.maeAllerFee !== undefined && result.maeAllerFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Navigation className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform"/> Supplément MAE Aller</span>
                        <span className="text-slate-200">{result.maeAllerFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.maePickupFee !== undefined && result.maePickupFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Navigation className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform"/> Supplément MAE Retour</span>
                        <span className="text-slate-200">{result.maePickupFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.waitingFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Timer className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform"/> Attente ({request.waitingTimeMinutes}m)</span>
                        <span className="text-slate-200">{result.waitingFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.customRulesFee !== undefined && result.customRulesFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1 group">
                        <span className="uppercase tracking-tight flex items-center gap-3"><Settings className="w-3.5 h-3.5 text-slate-500 group-hover:scale-110 transition-transform"/> Règles Perso.</span>
                        <span className="text-slate-200">{result.customRulesFee.toFixed(2)} {currency}</span>
                    </div>
                )}

                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1">
                    <span className="uppercase tracking-tight flex items-center gap-3"><Navigation className="w-3.5 h-3.5 text-slate-500"/> Carburant ({request.customFuelSurchargePercent}%)</span>
                    <span className="text-slate-200">{result.fuelCost.toFixed(2)} {currency}</span>
                </div>

                {result.manualAdjustment !== 0 && (
                    <div className={`flex justify-between items-center text-[11px] font-black px-3 py-2 rounded-xl border ${result.manualAdjustment > 0 ? 'bg-orange-500/5 border-orange-500/10 text-orange-500' : 'bg-blue-500/5 border-blue-500/10 text-blue-400'}`}>
                        <span className="uppercase tracking-tight">Ajustement Manuel</span>
                        <span>{result.manualAdjustment.toFixed(2)} {currency}</span>
                    </div>
                )}
                
                {result.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-black text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                        <span className="uppercase tracking-tight">Remise Commerciale</span>
                        <span>-{result.discountAmount.toFixed(2)} {currency}</span>
                    </div>
                )}

                {result.advancedFees > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-black text-blue-400 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                        <span className="uppercase tracking-tight">Frais Avancés (Débours)</span>
                        <span>{result.advancedFees.toFixed(2)} {currency}</span>
                    </div>
                )}
            </div>

            <div className="pt-8 space-y-3 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <span>Sous-Total Options</span>
                    <span>{(result.finalSubTotal - result.baseSubTotal).toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <span>Carburant ({request.customFuelSurchargePercent}%)</span>
                    <span>{result.fuelCost.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total HT</span>
                    <span className="text-lg font-black text-slate-200 tracking-tight">{result.priceHT.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">TVA ({vatPercent}%)</span>
                    <span className="text-xs font-bold text-slate-500">{result.vatAmount.toFixed(2)} {currency}</span>
                </div>
                {result.advancedFees > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Frais Avancés</span>
                        <span className="text-xs font-bold text-slate-500">{result.advancedFees.toFixed(2)} {currency}</span>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className="p-8 bg-black/40 border-t border-white/10 grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-blue-400/60" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Distance</span>
                </div>
                <div className="text-lg font-black text-blue-400 tracking-tight">{(result.totalDistance || 0).toFixed(1)} <span className="text-[10px] opacity-60">KM</span></div>
            </div>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-emerald-500/60" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CO₂</span>
                </div>
                <div className="text-lg font-black text-emerald-400 tracking-tight">{co2Emission} <span className="text-[10px] opacity-60">KG</span></div>
            </div>
      </div>
    </div>
  );
};

export default ResultDisplay;

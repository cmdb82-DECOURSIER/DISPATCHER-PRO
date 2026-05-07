
import React, { useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { QuoteRequest, Zone, FixedDestination } from '../types';
import { Map as MapIcon, ExternalLink, Navigation } from 'lucide-react';

interface Props {
  request: QuoteRequest;
  isXXL?: boolean;
  zones?: Zone[];
  fixedDestinations?: FixedDestination[];
}

/**
 * Nettoie les noms de lieux pour Google Maps.
 * Retire les mentions de "Zone" et les parenthèses complexes qui perdent l'algorithme de recherche de Maps.
 */
const cleanAddressForMaps = (address: string): string => {
  if (!address) return '';
  
  // Si l'adresse contient "Zone X (Lieu1, Lieu2...)", on extrait le premier lieu significatif
  const zoneMatch = address.match(/\(([^)]+)\)/);
  if (zoneMatch && address.toLowerCase().includes('zone')) {
    const locations = zoneMatch[1].split(',');
    // On prend le premier lieu de la liste et on s'assure qu'il est rattaché au Luxembourg
    return `${locations[0].trim()}, Luxembourg`;
  }

  // Nettoyage standard : on s'assure que le nom est propre
  let cleaned = address.replace(/^Luxembourg City,?\s*/i, '');
  cleaned = cleaned.replace(/^Zone\s*\d+\s*/i, '');
  
  // Si c'est juste un nom de quartier, on rajoute Luxembourg pour la précision
  if (cleaned.length < 20 && !cleaned.toLowerCase().includes('luxembourg')) {
    cleaned += ', Luxembourg';
  }
  
  return cleaned;
};

const MapPreview: React.FC<Props> = ({ request, isXXL = false, zones = [], fixedDestinations = [] }) => {
  
  const getPlaceNameFromId = useCallback((id: string | null): string => {
    if (!id) return '';
    if (id.startsWith('zone_')) {
      const idStr = id.replace('zone_', '');
      const zone = zones.find(z => String(z.id) === idStr);
      return zone ? cleanAddressForMaps(zone.name) : '';
    }
    if (id.startsWith('fixed_')) {
      const idStr = id.replace('fixed_', '');
      const fixed = fixedDestinations.find(f => String(f.id) === idStr);
      return fixed ? fixed.name : '';
    }
    return '';
  }, [zones, fixedDestinations]);

  const { mapsLink, embedUrl } = useMemo(() => {
    let addresses: string[] = [];
    const stopAddresses = request.stops
      .filter(s => s.address && s.address.trim() !== '')
      .map(s => cleanAddressForMaps(s.address.trim()));

    if (stopAddresses.length >= 2) {
      addresses = stopAddresses;
    } else if (request.pricingMode === 'forfait') {
      const start = getPlaceNameFromId(request.startZoneId);
      const end = getPlaceNameFromId(request.endZoneId);
      if (start && end) {
        addresses = [start, end];
      }
    }

    if (addresses.length < 2) return { mapsLink: '', embedUrl: '' };
    
    // Génération du lien externe
    const baseUrl = "https://www.google.com/maps/dir/";
    const encodedParts = addresses.map(addr => encodeURIComponent(addr));
    if (request.returnToStart && encodedParts.length > 0) {
      encodedParts.push(encodedParts[0]);
    }
    const link = baseUrl + encodedParts.join('/');

    // Génération de l'URL embed
    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1);
    
    let daddr = encodeURIComponent(destination);
    if (waypoints.length > 0) {
      daddr += waypoints.map(w => '+to:' + encodeURIComponent(w)).join('');
    }
    if (request.returnToStart) {
      daddr += '+to:' + encodeURIComponent(origin);
    }

    const url = `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${daddr}&output=embed&t=m`;

    return { mapsLink: link, embedUrl: url };
  }, [request, getPlaceNameFromId]);

  if (!mapsLink) return null;

  return (
    <div className={`mt-8 bg-white rounded-[32px] border-2 border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8 ${isXXL ? 'scale-[1.005]' : ''}`}>
      {/* Header Premium - Plus compact */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
            <MapIcon className="w-4 h-4 text-[#0088CC]" />
          </div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Visualisation Itinéraire
          </h3>
        </div>
        <div className="flex gap-3">
          <a 
            href={mapsLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white hover:bg-[#0088CC] hover:text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#0088CC] border border-[#0088CC]/20 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            OUVRIR GPS <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Map Embed Area */}
      <div className={`w-full ${isXXL ? 'h-[400px]' : 'h-64'} bg-slate-100 relative group`}>
        {embedUrl ? (
          <iframe
            key={embedUrl}
            title="Google Maps Route Preview"
            width="100%"
            height="100%"
            style={{ border: 0, backgroundColor: '#f1f5f9' }}
            loading="lazy"
            allowFullScreen
            src={embedUrl}
            className="opacity-95 group-hover:opacity-100 transition-opacity duration-500"
          ></iframe>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 p-8 text-center">
             <Navigation className="w-10 h-10 opacity-20" />
             <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Génération de la carte...</span>
          </div>
        )}
        
        {embedUrl && (
          <>
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black text-slate-800 border border-slate-200 shadow-xl flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0088CC] animate-pulse" />
                  PRÉVISUALISATION ACTIVE
              </div>
            </div>
            {request.totalDistance > 0 && (
              <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md text-[9px] px-3 py-1.5 text-white font-bold rounded-lg border border-white/10 shadow-2xl pointer-events-none transition-all">
                 {request.totalDistance.toFixed(1)} km • {request.totalDuration.toFixed(0)} min
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MapPreview;

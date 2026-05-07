import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { toPng } from 'html-to-image';
import { Client, QuoteRequest } from '../types';
import { ZONES, FIXED_DESTINATIONS } from '../constants';

interface Props {
  request: QuoteRequest;
  onChange?: (r: QuoteRequest) => void;
  clients?: Client[];
}

export interface DeliveryNoteFormHandle {
  handleDownloadJPG: () => Promise<void>;
  handleShare: () => void;
}

const AutoResizeTextarea = ({ value, onChange, className, rows = 1, isCapturing }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, rows?: number, isCapturing: boolean }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && !isCapturing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, isCapturing]);

  if (isCapturing) {
    return <div className={`${className} whitespace-pre-wrap break-words min-h-[1.5em]`}>{value}</div>;
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      rows={rows}
      className={`${className} resize-none overflow-hidden`}
    />
  );
};

const PrintableInput = ({ value, onChange, className, isCapturing }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, isCapturing: boolean }) => {
  if (isCapturing) {
    return <div className={`${className} min-h-[1.5em] flex items-center whitespace-pre-wrap break-words`}>{value}</div>;
  }
  return (
    <input type="text" value={value} onChange={onChange} className={className} />
  );
};

const ZoneInput = ({ value, onChange, className, isCapturing }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, isCapturing: boolean }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isCapturing) {
    return <div className={`${className} min-h-[1.5em] flex items-center whitespace-pre-wrap break-words`}>{value}</div>;
  }

  const allZones = [
    ...ZONES.map(z => ({ name: z.name, price: z.price })),
    ...FIXED_DESTINATIONS.map(d => ({ name: d.name, price: d.price }))
  ];

  const filtered = value ? allZones.filter(z => z.name.toLowerCase().includes(value.toLowerCase())) : allZones;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input 
        type="text" 
        value={value} 
        onChange={onChange} 
        onFocus={() => setShowSuggestions(true)}
        className={className} 
      />
      {showSuggestions && (value.length > 0 || filtered.length > 0) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg max-h-60 overflow-y-auto rounded-md">
          {filtered.map((item, idx) => (
            <div 
              key={idx}
              className="px-3 py-2 text-[10px] hover:bg-slate-100 cursor-pointer text-slate-700"
              onClick={() => {
                const event = { target: { value: item.name } } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
                setShowSuggestions(false);
              }}
            >
              <span className="font-bold">{item.name}</span>
              <span className="float-right text-slate-400">---</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DeliveryNoteForm = forwardRef<DeliveryNoteFormHandle, Props>(({ request, onChange, clients = [] }, ref) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const destIdx = request.tripType === 'normal' ? request.stops.length - 1 : 0;

  const [noteData, setNoteData] = useState({
    number: request.deliveryNoteNumber || '',
    date: new Date().toLocaleDateString('fr-FR'),
    clientName: request.client?.name || '',
    clientAddress: request.client?.default_address || '',
    clientZone: '',
    destName: request.stops[destIdx]?.clientName || '',
    destAddress: request.stops[destIdx]?.address || '',
    destZone: '',
    pickupTime: request.pickupTimeValue || '',
    destTime: request.stops[destIdx]?.scheduledTime || '',
    courseSimpleAller: !request.returnToStart,
    courseSimpleRetour: false,
    courseARAller: request.returnToStart,
    courseARRetour: false,
    urgent: request.isUrgent,
    grosVolumes: request.isBigVolume,
    horairePrecis: request.isPreciseTime,
    preciseTime: request.preciseTimeValue || request.selectedTime || '',
    accuseReception: false,
    frais: '',
    remarques: request.instructions || ''
  });

  const handleShare = () => {
    const text = `*BON DE LIVRAISON N°${noteData.number}*
Date: ${noteData.date}

*CLIENT*
Nom: ${noteData.clientName}
Adresse: ${noteData.clientAddress}
Zone: ${noteData.clientZone}

*DESTINATAIRE*
Nom: ${noteData.destName}
Adresse: ${noteData.destAddress}
Zone: ${noteData.destZone}
Heure prévue: ${noteData.destTime}

*DÉTAILS*
${noteData.courseSimpleAller ? '☑ Course simple Aller' : '☐ Course simple Aller'}
${noteData.courseARAller ? '☑ Course AR Aller' : '☐ Course AR Aller'}
${noteData.urgent ? '☑ Urgent' : '☐ Urgent'}
${noteData.grosVolumes ? '☑ Gros volumes' : '☐ Gros volumes'}
${noteData.horairePrecis ? '☑ Horaire précis' : '☐ Horaire précis'} ${noteData.horairePrecis ? `(${noteData.preciseTime})` : ''}
${noteData.accuseReception ? '☑ Accusé de réception' : '☐ Accusé de réception'}

Frais: ${noteData.frais}
Remarques: ${noteData.remarques}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadJPG = async () => {
    if (!formRef.current) return;
    setIsCapturing(true);
    
    // Wait for state to update and re-render without buttons
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const dataUrl = await toPng(formRef.current!, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true // Skip fetching fonts to avoid CORS issues if any remain
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `bon-livraison-${noteData.number || 'nouveau'}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsCapturing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleDownloadJPG,
    handleShare
  }));

  useEffect(() => {
    const destIdx = request.tripType === 'normal' ? request.stops.length - 1 : 0;

    setNoteData(prev => ({
      ...prev,
      number: request.deliveryNoteNumber || prev.number,
      clientName: request.client?.name || prev.clientName,
      clientAddress: request.client?.default_address || prev.clientAddress,
      destName: request.stops[destIdx]?.clientName || prev.destName,
      destAddress: request.stops[destIdx]?.address || prev.destAddress,
      destTime: request.stops[destIdx]?.scheduledTime || prev.destTime,
      courseSimpleAller: !request.returnToStart,
      courseARAller: request.returnToStart,
      urgent: request.isUrgent,
      grosVolumes: request.isBigVolume,
      horairePrecis: request.isPreciseTime,
      preciseTime: request.preciseTimeValue || request.selectedTime || prev.preciseTime,
      remarques: request.instructions || prev.remarques
    }));
  }, [request]);

  const updateClient = (client: Client) => {
    setNoteData(prev => ({
      ...prev,
      clientName: client.name,
      clientAddress: client.default_address || '',
      clientZone: client.default_tariff_id || ''
    }));

    if (onChange) {
      const newRequest = { ...request, client: { ...client } };
      const clientIdx = request.tripType === 'normal' ? 0 : newRequest.stops.length - 1;
      
      if (newRequest.stops[clientIdx]) {
        const newStops = [...newRequest.stops];
        newStops[clientIdx] = { 
          ...newStops[clientIdx], 
          clientName: client.name, 
          address: client.default_address || '',
          zoneId: client.default_tariff_id || null
        };
        newRequest.stops = newStops;
      }
      
      onChange(newRequest);
    }
  };

  const updateField = (field: string, value: string | boolean | number) => {
    setNoteData(prev => ({ ...prev, [field]: value }));
    
    if (onChange) {
      const newRequest = { ...request };
      let hasChanges = false;
      
      // We need to use the new value for the current field, but we might need other values from noteData
      // However, noteData might be stale here if we just called setNoteData.
      // But actually, we are updating 'request' based on 'field' and 'value', so we don't necessarily need 'noteData' for the request update logic 
      // EXCEPT for cases where one field depends on another (like courseARAller depends on courseARRetour logic in the original code?)
      
      // Let's look at the logic.
      // The original logic used 'newData' which was 'prev' + change.
      
      // We can replicate the logic using 'noteData' but overriding the current field.
      const currentData = { ...noteData, [field]: value };

      if (field === 'urgent') { newRequest.isUrgent = value as boolean; hasChanges = true; }
      if (field === 'grosVolumes') { newRequest.isBigVolume = value as boolean; hasChanges = true; }
      if (field === 'horairePrecis') { newRequest.isPreciseTime = value as boolean; hasChanges = true; }
      if (field === 'preciseTime') { newRequest.preciseTimeValue = value as string; hasChanges = true; }
      if (field === 'remarques') { newRequest.instructions = value as string; hasChanges = true; }
      if (field === 'courseARAller' || field === 'courseARRetour') {
        newRequest.returnToStart = currentData.courseARAller || currentData.courseARRetour;
        hasChanges = true;
      }
      if (field === 'courseSimpleAller' || field === 'courseSimpleRetour') {
        if (currentData.courseSimpleAller || currentData.courseSimpleRetour) {
          newRequest.returnToStart = false;
        }
        hasChanges = true;
      }
      if (field === 'clientName' || field === 'clientAddress') {
        newRequest.client = newRequest.client ? { ...newRequest.client } : { id: '', name: '', phone: '' };
        if (field === 'clientName') newRequest.client.name = value as string;
        if (field === 'clientAddress') newRequest.client.default_address = value as string;
        
        // Sync with corresponding stop
        const clientIdx = request.tripType === 'normal' ? 0 : newRequest.stops.length - 1;
        if (newRequest.stops[clientIdx]) {
          const updatedStop = { ...newRequest.stops[clientIdx] };
          if (field === 'clientName') updatedStop.clientName = value as string;
          if (field === 'clientAddress') updatedStop.address = value as string;
          newRequest.stops = [...newRequest.stops];
          newRequest.stops[clientIdx] = updatedStop;
        }
        hasChanges = true;
      }
      if (field === 'destName' || field === 'destAddress' || field === 'destTime') {
        if (newRequest.stops.length > 0) {
          const destIdx = request.tripType === 'normal' ? newRequest.stops.length - 1 : 0;
          if (newRequest.stops[destIdx]) {
            const updatedStop = { ...newRequest.stops[destIdx] };
            if (field === 'destName') updatedStop.clientName = value as string;
            if (field === 'destAddress') updatedStop.address = value as string;
            if (field === 'destTime') updatedStop.scheduledTime = value as string;
            newRequest.stops = [...newRequest.stops];
            newRequest.stops[destIdx] = updatedStop;
            hasChanges = true;
          }
        }
      }
      if (field === 'number') {
        newRequest.deliveryNoteNumber = value as string;
        hasChanges = true;
      }

      if (hasChanges) {
        onChange(newRequest);
      }
    }
  };

  return (
    <div className="space-y-4 flex flex-col items-center">
      <div 
        ref={formRef} 
        className="bg-white text-slate-900 font-sans relative shadow-2xl transition-all duration-300 ease-in-out" 
        style={{ 
          width: '210mm', 
          minHeight: '148mm',
          height: '148mm',
          paddingBottom: '0'
        }}
      >
        {/* Header with Triangle */}
        <div className="relative h-32 mb-4">
          {/* Red/Orange Triangle Background */}
          <div 
            className="absolute top-0 left-0 right-0 h-24 bg-[#E85C4A]" 
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
          ></div>
          
          {/* Left Side: Number and Date */}
          <div className="absolute top-2 left-6 space-y-4 z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-[#82b1d4] font-bold text-lg italic">Nº</span>
              <PrintableInput isCapturing={isCapturing} value={noteData.number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('number', e.target.value)} className="w-32 border-b border-[#E85C4A] outline-none bg-transparent text-slate-700 font-bold text-xl" />
            </div>
            <div className="flex gap-4">
              <div className="space-y-1">
                <span className="text-[#82b1d4] font-bold text-sm block italic">DATE</span>
                <PrintableInput isCapturing={isCapturing} value={noteData.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('date', e.target.value)} className="w-28 border-b border-[#E85C4A] outline-none bg-transparent text-slate-700 font-medium text-sm" />
              </div>
              <div className="space-y-1">
                <span className="text-[#82b1d4] font-bold text-sm block italic">HEURE</span>
                <PrintableInput isCapturing={isCapturing} value={noteData.preciseTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('preciseTime', e.target.value)} className="w-20 border-b border-[#E85C4A] outline-none bg-transparent text-slate-700 font-medium text-sm" />
              </div>
            </div>
          </div>

          {/* Center: Company Info */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center text-white z-10 w-full max-w-xs">
            <h1 className="text-2xl font-bold leading-tight">DE COURSIER S.à r.l</h1>
            <div className="text-white/90">
              <h2 className="text-sm font-bold tracking-widest uppercase">Express Delivery</h2>
              <p className="text-[10px] mt-0.5">Tél.: + 352 26 70 72 - 1</p>
            </div>
          </div>

          {/* Right Side: Logo */}
          <div className="absolute top-2 right-6 w-32 h-24 z-10">
            <svg viewBox="0 0 1200 750" className="w-full h-full">
              <g transform="translate(300, 40)">
                <rect x="50" y="20" width="380" height="420" fill="none" stroke="#E85C4A" strokeWidth="10" transform="rotate(-12 240 230)" />
                <path d="M 240 80 C 280 70, 320 90, 320 130 C 320 160, 290 180, 260 170 L 250 200 C 270 210, 290 230, 300 250 L 330 250 L 340 230 L 370 240 L 370 270 L 330 280 L 310 270 L 280 300 L 260 340 L 190 390 L 240 420 L 240 440 L 170 440 C 150 440, 140 420, 160 400 L 210 350 L 240 300 L 180 280 L 130 320 C 110 340, 80 320, 90 300 L 140 250 L 190 210 L 170 190 L 200 170 L 230 170 L 240 140 C 220 130, 220 90, 240 80 Z" fill="#82b1d4" />
                <path d="M 260 90 L 340 50 L 340 60 L 290 100 Z" fill="#82b1d4" />
                <circle cx="330" cy="140" r="12" fill="#82b1d4" />
                <g transform="translate(80, 200) rotate(-20)">
                  <polygon points="0,0 180,0 180,120 0,120" fill="#E85C4A" stroke="white" strokeWidth="6" strokeLinejoin="round" />
                  <path d="M 0 0 L 90 70 L 180 0" fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round" />
                  <path d="M 0 120 L 90 70 L 180 120" fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round" />
                </g>
              </g>
              <g transform="translate(100, 650)">
                <text x="60" y="0" fontFamily="Century Gothic, Futura, sans-serif" fontWeight="800" fontSize="140" fill="#82b1d4" letterSpacing="-2">DE COURSIER</text>
              </g>
            </svg>
          </div>
        </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-0 px-1">
        
        {/* Client Column */}
        <div className="border-r border-slate-200">
          <div className="bg-[#82b1d4] text-white text-center font-bold py-1 text-sm tracking-widest mx-1 rounded-sm">CLIENT</div>
          <div className="p-3 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900">Nom :</label>
                {!isCapturing && (
                  <select 
                    className="text-[12px] bg-transparent border border-slate-900 text-slate-900 rounded px-1 outline-none w-20 font-bold"
                    onChange={(e) => {
                      const c = clients.find(c => c.id === e.target.value);
                      if (c) {
                        updateClient(c);
                      }
                    }}
                  >
                    <option value="">...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <AutoResizeTextarea isCapturing={isCapturing} value={noteData.clientName} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('clientName', e.target.value)} rows={1} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[11px]" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Adresse :</label>
              <div className="space-y-3">
                <AutoResizeTextarea isCapturing={isCapturing} value={noteData.clientAddress} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('clientAddress', e.target.value)} rows={3} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px] leading-relaxed" />
                <div className="border-b border-[#E85C4A] w-full h-0"></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Zone :</label>
              <ZoneInput isCapturing={isCapturing} value={noteData.clientZone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('clientZone', e.target.value)} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px]" />
            </div>
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-900 block mb-1">Signature :</label>
              <div className="h-10 border-b border-[#E85C4A]"></div>
            </div>
          </div>
        </div>

        {/* Destinataire Column */}
        <div className="border-r border-slate-200">
          <div className="bg-[#82b1d4] text-white text-center font-bold py-1 text-sm tracking-widest mx-1 rounded-sm">DESTINATAIRE</div>
          <div className="p-3 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900">Nom :</label>
                {!isCapturing && (
                  <select 
                    className="text-[12px] bg-transparent border border-slate-900 text-slate-900 rounded px-1 outline-none w-20 font-bold"
                    onChange={(e) => {
                      const c = clients.find(c => c.id === e.target.value);
                      if (c) {
                        updateField('destName', c.name);
                        updateField('destAddress', c.default_address || '');
                        updateField('destZone', c.default_tariff_id || '');
                      }
                    }}
                  >
                    <option value="">...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <AutoResizeTextarea isCapturing={isCapturing} value={noteData.destName} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('destName', e.target.value)} rows={1} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[11px]" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Adresse :</label>
              <div className="space-y-3">
                <AutoResizeTextarea isCapturing={isCapturing} value={noteData.destAddress} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('destAddress', e.target.value)} rows={3} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px] leading-relaxed" />
                <div className="border-b border-[#E85C4A] w-full h-0"></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Zone :</label>
              <ZoneInput isCapturing={isCapturing} value={noteData.destZone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('destZone', e.target.value)} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px]" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Heure d'enlèvement :</label>
              {isCapturing ? (
                <div className="text-[10px] font-bold text-slate-900 border-b border-[#E85C4A] min-h-[1.5em]">{noteData.pickupTime}</div>
              ) : (
                <input 
                  type="time" 
                  value={noteData.pickupTime} 
                  onChange={(e) => updateField('pickupTime', e.target.value)}
                  className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px]" 
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Heure prévue (livraison) :</label>
              {isCapturing ? (
                <div className="text-[10px] font-bold text-slate-900 border-b border-[#E85C4A] min-h-[1.5em]">{noteData.destTime}</div>
              ) : (
                <input 
                  type="time" 
                  value={noteData.destTime} 
                  onChange={(e) => updateField('destTime', e.target.value)}
                  className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px]" 
                />
              )}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-900 block mb-1">Signature :</label>
              <div className="h-10 border-b border-[#E85C4A]"></div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-slate-900">Nom :</span>
                <PrintableInput isCapturing={isCapturing} value="" onChange={() => {}} className="flex-1 border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[9px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Details Column */}
        <div>
          <div className="bg-[#82b1d4] text-white text-center font-bold py-1 text-sm tracking-widest mx-1 rounded-sm">BON DE LIVRAISON</div>
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900">Course simple</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className={`w-4 h-4 border border-[#E85C4A] rounded flex items-center justify-center ${noteData.courseSimpleAller ? 'bg-[#E85C4A]' : ''}`}>
                    {noteData.courseSimpleAller && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                  </div>
                  <input type="checkbox" checked={noteData.courseSimpleAller} onChange={e => updateField('courseSimpleAller', e.target.checked)} className="hidden" />
                  <span className="text-[10px] text-slate-900 font-bold">Aller</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className={`w-4 h-4 border border-[#E85C4A] rounded flex items-center justify-center ${noteData.courseSimpleRetour ? 'bg-[#E85C4A]' : ''}`}>
                    {noteData.courseSimpleRetour && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                  </div>
                  <input type="checkbox" checked={noteData.courseSimpleRetour} onChange={e => updateField('courseSimpleRetour', e.target.checked)} className="hidden" />
                  <span className="text-[10px] text-slate-900 font-bold">Retour</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900">Course AR</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className={`w-4 h-4 border border-[#E85C4A] rounded flex items-center justify-center ${noteData.courseARAller ? 'bg-[#E85C4A]' : ''}`}>
                    {noteData.courseARAller && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                  </div>
                  <input type="checkbox" checked={noteData.courseARAller} onChange={e => updateField('courseARAller', e.target.checked)} className="hidden" />
                  <span className="text-[10px] text-slate-900 font-bold">Aller</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className={`w-4 h-4 border border-[#E85C4A] rounded flex items-center justify-center ${noteData.courseARRetour ? 'bg-[#E85C4A]' : ''}`}>
                    {noteData.courseARRetour && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                  </div>
                  <input type="checkbox" checked={noteData.courseARRetour} onChange={e => updateField('courseARRetour', e.target.checked)} className="hidden" />
                  <span className="text-[10px] text-slate-900 font-bold">Retour</span>
                </label>
              </div>
            </div>

            {/* Second Course Option Removed */}

            <div className="space-y-2 pt-1">
              {[
                { label: 'Urgent', field: 'urgent' },
                { label: 'Gros volumes', field: 'grosVolumes' },
                { label: 'Horaire précis', field: 'horairePrecis' },
                { label: 'Accusé de réception', field: 'accuseReception' }
              ].map(opt => (
                <div key={opt.field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-900">{opt.label}</span>
                    <label className="cursor-pointer">
                      <div className={`w-4 h-4 border border-[#E85C4A] rounded flex items-center justify-center ${(noteData as Record<string, string | boolean | number>)[opt.field] ? 'bg-[#E85C4A]' : ''}`}>
                        {(noteData as Record<string, string | boolean | number>)[opt.field] && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                      </div>
                      <input type="checkbox" checked={!!(noteData as Record<string, string | boolean | number>)[opt.field]} onChange={e => updateField(opt.field, e.target.checked)} className="hidden" />
                    </label>
                  </div>
                  {opt.field === 'horairePrecis' && noteData.horairePrecis && (
                    <div className="pl-4 animate-in slide-in-from-top-1">
                      {isCapturing ? (
                        <div className="text-[10px] font-bold text-red-600">{noteData.preciseTime}</div>
                      ) : (
                        <input 
                          type="time" 
                          value={noteData.preciseTime} 
                          onChange={(e) => updateField('preciseTime', e.target.value)}
                          className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px]" 
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-900 flex items-center gap-2">
                Frais: 
                <PrintableInput isCapturing={isCapturing} value={noteData.frais} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('frais', e.target.value)} className="flex-1 border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[10px]" />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-900 block">Remarques:</label>
              <div className="space-y-2">
                <AutoResizeTextarea isCapturing={isCapturing} value={noteData.remarques} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('remarques', e.target.value)} rows={2} className="w-full border-b border-[#E85C4A] outline-none bg-transparent text-slate-900 font-medium text-[9px]" />
                <div className="border-b border-[#E85C4A] w-full h-0"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#E85C4A] text-white text-center py-1.5 text-[10px] font-medium tracking-tight">
        www.coursier.lu | info@coursier.lu | Fax : + 352 26 66 01 20 | RCSL : B193204 | TVA : LU27381955
      </div>
      </div>
    </div>
  );
});

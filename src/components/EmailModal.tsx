import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle } from 'lucide-react';
import { QuoteRequest, TariffItem, PriceBreakdown } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  request: QuoteRequest;
  result: PriceBreakdown;
  zones: TariffItem[];
  fixedDestinations: TariffItem[];
}

export const EmailModal: React.FC<Props> = ({ isOpen, onClose, request, result }) => {
  const [email, setEmail] = useState(request.client?.email || '');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [generatedBody, setGeneratedBody] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
        const stops = request.stops.map((s, i) => {
            const type = i === 0 ? "DÉPART" : i === request.stops.length - 1 ? "ARRIVÉE" : `ÉTAPE ${i}`;
            const clientInfo = s.clientName ? ` (${s.clientName})` : '';
            const refInfo = s.reference ? ` [Réf: ${s.reference}]` : '';
            return `${type}: ${s.address || 'Non spécifié'}${clientInfo}${refInfo}`;
        }).join('\n');

        const activeModules = [];
        if (request.isUrgent) activeModules.push('URGENT');
        if (request.isPreciseTime) activeModules.push('HORAIRE PRÉCIS');
        if (request.isBigVolume) activeModules.push('GROS VOLUME');
        if (request.returnToStart) activeModules.push('ALLER RETOUR');

        const modulesHeader = activeModules.length > 0 ? `${activeModules.join(' / ')}\n\n` : '';

        const body = `Bonjour,

Voici le devis pour votre demande de transport du ${request.selectedDate}.

${modulesHeader}ITINÉRAIRE :
${stops}

DÉTAILS DU TARIF :
- Prix HT : ${result.priceHT.toFixed(2)} €
${result.fuelCost > 0 ? `- (Incluant Surcharge Carburant : ${result.fuelCost.toFixed(2)} €)\n` : ''}- TVA (${request.customVatPercent}%) : ${result.vatAmount.toFixed(2)} €
${result.advancedFees > 0 ? `- Frais Avancés : ${result.advancedFees.toFixed(2)} €\n` : ''}- TOTAL TTC : ${result.priceTTC.toFixed(2)} €

${request.instructions ? `NOTE : ${request.instructions}\n` : ''}
Merci de nous confirmer votre accord pour valider la mission.

Cordialement,
L'équipe Dispatch`;
        setGeneratedBody(body);
    }
  }, [isOpen, request, result]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedBody);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Mock send
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <Mail className="w-6 h-6 text-[#0088CC]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Envoyer Devis</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirmation par email</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/5 rounded-xl text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          {isSent ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Email Envoyé !</h3>
              <p className="text-sm text-slate-400">Le devis a été transmis avec succès.</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destinataire</label>
                <input 
                  type="email" 
                  required
                  placeholder="email@client.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-950/50 border border-white/5 focus:border-[#0088CC] rounded-2xl text-white font-bold outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenu du message</label>
                    <button 
                      type="button" 
                      onClick={handleCopy} 
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        copySuccess 
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-[#0088CC]/10 text-[#0088CC] border border-[#0088CC]/20 hover:bg-[#0088CC]/20'
                      }`}
                    >
                        {copySuccess ? <CheckCircle className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                        {copySuccess ? 'Copié !' : 'Copier le texte'}
                    </button>
                 </div>
                 <textarea 
                    value={generatedBody}
                    onChange={(e) => setGeneratedBody(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/5 focus:border-[#0088CC] rounded-2xl text-slate-300 text-sm font-mono outline-none transition-all min-h-[250px]"
                 />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-white/5"
                >
                  Copier
                </button>
                <button 
                  type="submit"
                  disabled={isSending}
                  className="flex-[2] py-5 bg-[#0088CC] hover:bg-[#0077B3] disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
                >
                  {isSending ? 'Envoi en cours...' : 'Envoyer par Mail'} 
                  {!isSending && <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

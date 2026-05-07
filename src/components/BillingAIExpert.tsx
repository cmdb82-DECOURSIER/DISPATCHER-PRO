
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Calculator, Send, X, Bot, Sparkles, Loader2, Minus, Maximize2, Eraser, ReceiptEuro, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BillingAIExpertProps {
  appContext: {
    settings: any;
    zones: any[];
    fixedDestinations: any[];
    missions: any[];
  };
}

const BillingAIExpert: React.FC<BillingAIExpertProps> = ({ appContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre expert IA en Facturation. Je suis spécialisé dans les règles de calcul tarifaire, les zones et les suppléments. Comment puis-je vous aider à optimiser vos revenus aujourd\'hui ?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Mémoire de facturation réinitialisée. Prêt pour de nouveaux calculs.' }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      
      const systemInstruction = `
        Vous êtes l'EXPERT IA EN FACTURATION de "Dispatcher Pro". 
        Votre spécialité est l'application et l'explication des méthodes de calcul de prix pour les courses de coursiers.
        
        VOTRE LOGIQUE DE CALCUL INTERNE (Basée sur le PricingEngine):
        1. MODE DISTANCE: Base du véhicule + (km * prix_km) + (minutes * prix_minute).
        2. MODE FORFAIT: Somme des prix des zones. Si Zone à Zone -> déduction configurable.
        3. ALLER-RETOUR: Généralement +35% sur le prix de base.
        4. SUPPLÉMENTS:
           - Urgence: % du prix de base.
           - Volume: % du prix de base.
           - Horaire Précis: % du prix de base.
           - Attente: 2.50€ par tranche de 5 min.
           - Apostille: ~5€ par point.
           - MAE: Forfaits spécifiques (MAE Aller 0.44€, MAE Pickup 5.00€, Signatures 20€).
        5. TVA: Souvent 17% ou 3%.
        6. CARBURANT: Surcharge % appliquée sur le TOTAL HT.
        
        CONTEXTE ACTUEL:
        - Paramètres tarifaires: ${JSON.stringify(appContext.settings)}
        - Nombre de zones: ${appContext.zones.length}
        - Missions à facturer: ${appContext.missions.length}
        
        VOTRE RÔLE:
        - Répondez précisément aux questions sur "Combien coûte..." ou "Comment a été calculé...".
        - APPRENTISSAGE: Si l'utilisateur vous dit "À partir de maintenant, le tarif de base est de 15€" ou "Le supplément urgence passe à 50%", vous DEVEZ intégrer cette nouvelle règle dans vos calculs pour le reste de la conversation.
        - Proposez des optimisations de tarifs si l'utilisateur demande.
        - Aidez l'utilisateur à définir de nouvelles règles de calcul si nécessaire.
        - Soyez très rigoureux sur les chiffres. Utilisez le symbole € et arrondissez à 2 décimales.
        
        Si l'utilisateur change la méthode de calcul par texte, confirmez la nouvelle règle et utilisez-la.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' as const : 'user' as const, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.2, // Temperature basse pour plus de précision mathématique
        }
      });

      const assistantMessage = response.text || "Je n'ai pas pu calculer la réponse.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error("Billing AI Expert Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Erreur lors du calcul IA. Vérifiez vos paramètres." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Launch Button in Billing Context */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl hover:bg-indigo-600/40 transition-all shadow-sm text-xs font-black uppercase tracking-widest"
      >
        <Calculator className="w-4 h-4" />
        Expert IA Facturation
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '550px',
              width: '420px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-24 right-6 z-[120] bg-[#1A1A1A] border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <ReceiptEuro className="w-5 h-5" />
                <span className="font-black text-xs uppercase tracking-widest">Expert IA Facturation</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                  title="Réinitialiser"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0A0A0A]">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-2.5 px-3.5 rounded-lg text-[11px] font-medium leading-normal shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-[#1A1A1A] text-slate-300 border border-white/5 rounded-tl-none font-sans'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#1A1A1A] p-2.5 px-4 rounded-lg text-[10px] font-bold border border-white/5 rounded-tl-none flex items-center gap-2.5 text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                        <span className="uppercase tracking-[0.1em]">Expert en calcul...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Info Bar */}
                <div className="px-4 py-2 bg-indigo-500/5 border-t border-white/5 flex items-center gap-2">
                   <Lightbulb className="w-3 h-3 text-yellow-400" />
                   <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Calculateur en temps réel activé</span>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/5 bg-[#141414]">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Décrivez un trajet ou une règle..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all font-bold"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:bg-slate-800 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BillingAIExpert;

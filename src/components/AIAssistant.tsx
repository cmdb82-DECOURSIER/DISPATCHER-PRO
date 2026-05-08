
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, Send, X, Bot, Sparkles, Loader2, Minus, Maximize2, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantProps {
  appContext: {
    settings: any;
    zones: any[];
    fixedDestinations: any[];
    request: any;
    activeTab: string;
  };
}

const AIAssistant: React.FC<AIAssistantProps> = ({ appContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA expert "Dispatcher Pro". Je connais vos tarifs, vos zones et vos règles de calcul. Comment puis-je vous aider ?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat réinitialisé. Comment puis-je vous aider ?' }]);
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
        Vous êtes l'assistant IA de "Dispatcher Pro", un outil de gestion pour coursiers.
        
        CONTEXTE DE L'APPLICATION:
        - Onglet: ${appContext.activeTab}
        - Modes de calcul: GPS (Distance), Zone à Zone, Ville à Ville, Bon de livraison.
        - Véhicules: Voiture (base 12.22€), Camionnette (base 25.10€).
        - Règles: Urgence, Volume, Horaire Précis, Apostille (MAE).
        - Tarifs Zones: ${appContext.zones.length} zones configurées.
        - Destinations Fixes: ${appContext.fixedDestinations.length} destinations.
        - Mission active: ${JSON.stringify(appContext.request)}
        
        RÈGLES DE CALCUL SPÉCIFIQUES:
        1. "Zone à Zone": Déduction si les deux points sont dans des zones définies.
        2. "Zone à Hors-Zone": Déduction partielle.
        3. Coefficient Aller-Retour: En général 35% de majoration sur le prix de base.
        4. TVA: Généralement 17% ou 3%.
        
        VOTRE MISSION:
        - Répondez aux questions sur le fonctionnement du dispatcher.
        - Aidez à configurer une mission complexe.
        - Si l'utilisateur donne un texte brut de dispatch, proposez une analyse structurée.
        - Soyez technique, précis et utilisez le jargon luxembourgeois/français des coursiers (Zones, Forfaits, MAE, Apostille).
        
        RÉPONSE:
        - Langue: Français.
        - Format: Markdown propre.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const assistantMessage = response.text || "Désolé, je n'ai pas pu générer de réponse.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, je rencontre une erreur technique. Vérifiez votre connexion." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '500px',
              width: '380px'
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-[#0088CC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Bot className="w-5 h-5" />
                <span className="font-bold text-sm tracking-tight">Assistant IA</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={clearChat}
                  className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                  title="Effacer le chat"
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
                {/* Chat Display */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0A0A0A]">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-2.5 px-3.5 rounded-lg text-[11px] font-medium leading-normal shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-[#0088CC] text-white rounded-tr-none' 
                        : 'bg-[#1A1A1A] text-slate-300 border border-white/5 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#1A1A1A] p-2.5 px-4 rounded-lg text-[10px] font-bold border border-white/5 rounded-tl-none flex items-center gap-2.5 text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin text-[#0088CC]" />
                        <span className="uppercase tracking-[0.1em]">IA en réflexion...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/5 bg-[#1A1A1A]">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Posez une question à l'IA..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#0088CC]/50 transition-colors"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-[#0088CC] text-white rounded-lg disabled:opacity-50 disabled:bg-slate-700 transition-all hover:scale-105 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#0088CC]" />
                    Propulsé par Gemini 3 Flash
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-red-500 rotate-90' : 'bg-[#0088CC] hover:bg-[#0077B3]'
        }`}
      >
        {isOpen ? <X className="text-white w-6 h-6" /> : <MessageSquare className="text-white w-6 h-6" />}
        {!isOpen && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#121212] flex items-center justify-center"
          >
            <Sparkles className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
};

export default AIAssistant;

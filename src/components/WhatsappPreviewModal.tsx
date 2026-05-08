import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageSquare } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
}

export const WhatsappPreviewModal: React.FC<Props> = ({ isOpen, onClose, initialText }) => {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#25D366]/10 rounded-xl">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Aperçu WhatsApp</h3>
              <p className="text-[10px] font-medium text-slate-500">Modifiez le message avant l'envoi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-64 bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-medium text-slate-300 focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/50 outline-none resize-none leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              placeholder="Votre message..."
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-600 bg-slate-900/80 px-2 py-1 rounded-lg border border-white/5">
              {text.length} caractères
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              copied 
                ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/20' 
                : 'bg-white text-slate-900 hover:bg-slate-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier le message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

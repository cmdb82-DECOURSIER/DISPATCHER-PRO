import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { Message } from '../types';

interface Props {
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export const DiscussionThread: React.FC<Props> = ({ messages, onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-white/5 hover:bg-[#0088CC]/10 text-slate-400 hover:text-[#0088CC] rounded-xl transition-all border border-white/5 hover:border-[#0088CC]/20 group relative"
      >
        <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#0088CC] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-80 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100]">
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Discussion</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-4">Aucun message</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'Moi' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 mb-1">{msg.sender}</span>
                  <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'Moi' ? 'bg-[#0088CC] text-white rounded-tr-sm' : 'bg-white/10 text-slate-200 rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-600 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/5 bg-black/20 flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Votre message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#0088CC] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="p-2 bg-[#0088CC] text-white rounded-xl hover:bg-[#0077B3] disabled:opacity-50 disabled:hover:bg-[#0088CC] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

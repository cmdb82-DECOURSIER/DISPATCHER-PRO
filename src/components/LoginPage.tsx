import React, { useState } from 'react';
import { Package, Lock, User, ArrowRight } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple demo auth
    if (login === '2013' && password === '2013') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-tr from-[#0088CC] to-blue-400 rounded-[24px] shadow-2xl shadow-blue-500/20 mb-6">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter text-center">DE COURSIER</h1>
          <p className="text-[#FF6600] text-xs font-black uppercase tracking-[0.3em] mt-2">Dispatcher Pro • Server Edition</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identifiant</label>
                <div className="relative group">
                  <User className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within:text-[#0088CC] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Login..." 
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className={`w-full pl-14 pr-6 py-5 bg-slate-950/50 border rounded-2xl text-white font-bold outline-none transition-all ${error ? 'border-red-500 ring-4 ring-red-500/10' : 'border-white/5 focus:border-[#0088CC] focus:ring-4 focus:ring-blue-500/10'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within:text-[#0088CC] transition-colors" />
                  <input 
                    type="password" 
                    placeholder="Password..." 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-14 pr-6 py-5 bg-slate-950/50 border rounded-2xl text-white font-bold outline-none transition-all ${error ? 'border-red-500 ring-4 ring-red-500/10' : 'border-white/5 focus:border-[#0088CC] focus:ring-4 focus:ring-blue-500/10'}`}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-[#0088CC] hover:bg-[#0077B3] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              Se Connecter <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">© 2026 De Coursier Luxembourg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

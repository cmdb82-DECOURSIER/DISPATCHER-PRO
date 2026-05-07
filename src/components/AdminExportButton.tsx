import React from 'react';
import { Download } from 'lucide-react';
import JSZip from 'jszip';

interface AdminExportButtonProps {
  data: unknown;
}

export const AdminExportButton: React.FC<AdminExportButtonProps> = ({ data }) => {
  const handleExport = async () => {
    const zip = new JSZip();
    const dataStr = JSON.stringify(data, null, 2);
    
    // Create a README to explain how to use this for Vercel if needed
    const readme = `SAUVEGARDE DES DONNÉES - DISPATCHER PRO
Date: ${new Date().toLocaleString()}

Ce fichier contient l'intégralité de votre base de données locale (Clients, Missions, Zones, Réglages).
IMPORTANT : Ce bouton exporte vos DONNÉES (JSON) pour sauvegarde.

POUR DÉPLOYER LE SITE SUR VERCEL :
1. Cliquez sur l'icône "Paramètres" (roue dentée) tout en haut à droite de l'interface Google AI Studio.
2. Cliquez sur "Download ZIP" ou "Export to GitHub".
3. Le fichier ZIP obtenu contiendra tout le code source (React + Vite + Tailwind) prêt à être mis sur Vercel.
4. Une fois sur Vercel, n'oubliez pas d'ajouter votre GEMINI_API_KEY dans les variables d'environnement.`;

    zip.file("LISEZ-MOI.txt", readme);
    zip.file("backup_data.json", dataStr);
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_dispatcher_data_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleExport}
        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all bg-red-600/20 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white shadow-sm"
      >
        <Download className="w-3 h-3" />
        Backup
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-black/90 backdrop-blur-xl p-3 rounded-xl border border-white/10 text-[9px] text-slate-300 font-bold uppercase tracking-widest hidden group-hover:block transition-all shadow-2xl z-[200]">
        Sauvegarde complète des données (JSON)
      </div>
    </div>
  );
};

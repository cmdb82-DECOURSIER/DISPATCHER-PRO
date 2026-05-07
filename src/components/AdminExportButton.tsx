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
    const readme = `SAUVEGARDE COMPLÈTE DES DONNÉES - DISPATCHER PRO
Date: ${new Date().toLocaleString()}

Ce fichier contient l'intégralité de votre base de données locale (Clients, Missions, Zones, Réglages).
Pour déployer le SITE COMPLET sur Vercel :
1. Utilisez l'icône "Paramètres" (engrenage) en haut à droite de l'interface AI Studio.
2. Choisissez "Exporter vers GitHub" ou "Télécharger ZIP".
3. Ce bouton ci (ADMIN EXPORT) est uniquement pour vos DONNÉES de travail.`;

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
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col items-start gap-2">
      <div className="bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/5 text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden group-hover:block transition-all">
        Export complet des données (Backup)
      </div>
      <button
        onClick={handleExport}
        className="group flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-lg transition-all font-black text-xs uppercase tracking-widest"
      >
        <Download className="w-4 h-4" />
        ADMIN - BACKUP DATA
      </button>
    </div>
  );
};

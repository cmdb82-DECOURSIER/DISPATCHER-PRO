import React, { useState } from 'react';
import { GlobalSettings, CustomRule } from '../types';
import { Settings, Plus, Trash2, Save, Percent, Euro } from 'lucide-react';

interface Props {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

const SettingsManager: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);

  const handleSettingChange = (key: keyof GlobalSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAddRule = () => {
    const newRule: CustomRule = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nouvelle Règle',
      value: 0,
      type: 'percent',
      isActive: true
    };
    setLocalSettings(prev => ({
      ...prev,
      customRules: [...(prev.customRules || []), newRule]
    }));
  };

  const handleUpdateRule = (id: string, field: keyof CustomRule, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      customRules: prev.customRules?.map(rule => 
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const handleDeleteRule = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      customRules: prev.customRules?.filter(rule => rule.id !== id)
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    alert('Paramètres sauvegardés avec succès !');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl border border-white/10">
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Paramètres de Calcul</h2>
            <p className="text-xs text-slate-400 font-medium">Gérez les coefficients et les règles de tarification</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-[#0088CC] hover:bg-[#0088CC]/80 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          <Save className="w-4 h-4" />
          Sauvegarder
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paramètres de base */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Coefficients Standards</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Majoration Urgence (%)</span>
              <input 
                type="number" 
                value={localSettings.urgency_coefficient}
                onChange={(e) => handleSettingChange('urgency_coefficient', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Majoration Gros Volume (%)</span>
              <input 
                type="number" 
                value={localSettings.volume_coefficient}
                onChange={(e) => handleSettingChange('volume_coefficient', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Majoration Horaire Précis (%)</span>
              <input 
                type="number" 
                value={localSettings.precise_time_fee}
                onChange={(e) => handleSettingChange('precise_time_fee', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Majoration Week-end (%)</span>
              <input 
                type="number" 
                value={localSettings.weekend_coefficient}
                onChange={(e) => handleSettingChange('weekend_coefficient', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Surcharge Carburant par défaut (%)</span>
              <input 
                type="number" 
                value={localSettings.default_fuel_surcharge_percent}
                onChange={(e) => handleSettingChange('default_fuel_surcharge_percent', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">TVA (%)</span>
              <input 
                type="number" 
                value={localSettings.vat_percent}
                onChange={(e) => handleSettingChange('vat_percent', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Prix Apostille par défaut (€)</span>
              <input 
                type="number" 
                value={localSettings.apostille_price || 5}
                onChange={(e) => handleSettingChange('apostille_price', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
          </div>
        </div>

        {/* Règles Zone & Hors Zone */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Règles Zone & Hors Zone</h3>
          
          <div className="space-y-6">
            {/* Zone à Zone */}
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Déduction Zone à Zone</span>
                <button
                  onClick={() => handleSettingChange('zone_to_zone_deduction', localSettings.zone_to_zone_deduction === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${localSettings.zone_to_zone_deduction !== false ? 'bg-[#0088CC]' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.zone_to_zone_deduction !== false ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              {localSettings.zone_to_zone_deduction !== false && (
                <div className="flex gap-2 items-center mt-2">
                  <select
                    value={localSettings.zone_to_zone_deduction_type || 'zone'}
                    onChange={(e) => handleSettingChange('zone_to_zone_deduction_type', e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-medium outline-none focus:border-[#0088CC] flex-1"
                  >
                    <option value="zone">Prix d'une Zone</option>
                    <option value="fixed">Montant Fixe (€)</option>
                    <option value="percent">Pourcentage (%)</option>
                  </select>
                  <input
                    type="number"
                    value={localSettings.zone_to_zone_deduction_value !== undefined ? localSettings.zone_to_zone_deduction_value : 1}
                    onChange={(e) => handleSettingChange('zone_to_zone_deduction_value', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-xs font-bold outline-none focus:border-[#0088CC]"
                    placeholder={localSettings.zone_to_zone_deduction_type === 'zone' ? 'ID Zone' : 'Valeur'}
                  />
                </div>
              )}
            </div>

            {/* Zone à Hors Zone */}
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Déduction Zone à Hors Zone</span>
                <button
                  onClick={() => handleSettingChange('zone_to_hors_zone_deduction', localSettings.zone_to_hors_zone_deduction === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${localSettings.zone_to_hors_zone_deduction !== false ? 'bg-[#0088CC]' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.zone_to_hors_zone_deduction !== false ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              {localSettings.zone_to_hors_zone_deduction !== false && (
                <div className="flex gap-2 items-center mt-2">
                  <select
                    value={localSettings.zone_to_hors_zone_deduction_type || 'zone'}
                    onChange={(e) => handleSettingChange('zone_to_hors_zone_deduction_type', e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-medium outline-none focus:border-[#0088CC] flex-1"
                  >
                    <option value="zone">Prix d'une Zone</option>
                    <option value="fixed">Montant Fixe (€)</option>
                    <option value="percent">Pourcentage (%)</option>
                  </select>
                  <input
                    type="number"
                    value={localSettings.zone_to_hors_zone_deduction_value !== undefined ? localSettings.zone_to_hors_zone_deduction_value : 1}
                    onChange={(e) => handleSettingChange('zone_to_hors_zone_deduction_value', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-xs font-bold outline-none focus:border-[#0088CC]"
                    placeholder={localSettings.zone_to_hors_zone_deduction_type === 'zone' ? 'ID Zone' : 'Valeur'}
                  />
                </div>
              )}
            </div>

            {/* Hors Zone à Hors Zone */}
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Déduction Hors Zone à Hors Zone</span>
                <button
                  onClick={() => handleSettingChange('hors_zone_to_hors_zone_deduction', localSettings.hors_zone_to_hors_zone_deduction === true ? false : true)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${localSettings.hors_zone_to_hors_zone_deduction === true ? 'bg-[#0088CC]' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.hors_zone_to_hors_zone_deduction === true ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              {localSettings.hors_zone_to_hors_zone_deduction === true && (
                <div className="flex gap-2 items-center mt-2">
                  <select
                    value={localSettings.hors_zone_to_hors_zone_deduction_type || 'zone'}
                    onChange={(e) => handleSettingChange('hors_zone_to_hors_zone_deduction_type', e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-medium outline-none focus:border-[#0088CC] flex-1"
                  >
                    <option value="zone">Prix d'une Zone</option>
                    <option value="fixed">Montant Fixe (€)</option>
                    <option value="percent">Pourcentage (%)</option>
                  </select>
                  <input
                    type="number"
                    value={localSettings.hors_zone_to_hors_zone_deduction_value !== undefined ? localSettings.hors_zone_to_hors_zone_deduction_value : 1}
                    onChange={(e) => handleSettingChange('hors_zone_to_hors_zone_deduction_value', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-xs font-bold outline-none focus:border-[#0088CC]"
                    placeholder={localSettings.hors_zone_to_hors_zone_deduction_type === 'zone' ? 'ID Zone' : 'Valeur'}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-slate-300">Pourcentage Aller-Retour (%)</span>
              <input 
                type="number" 
                value={localSettings.return_trip_percent !== undefined ? localSettings.return_trip_percent : 35}
                onChange={(e) => handleSettingChange('return_trip_percent', parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-right text-sm font-bold outline-none focus:border-[#0088CC]"
              />
            </div>
          </div>
        </div>

        {/* Règles Personnalisées */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Règles Supplémentaires</h3>
            <button 
              onClick={handleAddRule}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0088CC] hover:text-white transition-colors bg-[#0088CC]/10 hover:bg-[#0088CC] px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {(!localSettings.customRules || localSettings.customRules.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-xs font-medium italic">
                Aucune règle personnalisée.
              </div>
            ) : (
              localSettings.customRules.map(rule => (
                <div key={rule.id} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                  <button
                    onClick={() => handleUpdateRule(rule.id, 'isActive', !rule.isActive)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rule.isActive ? 'bg-[#0088CC] border-[#0088CC]' : 'border-slate-600 bg-transparent'}`}
                  >
                    {rule.isActive && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </button>
                  <input 
                    type="text"
                    value={rule.name}
                    onChange={(e) => handleUpdateRule(rule.id, 'name', e.target.value)}
                    placeholder="Nom de la règle"
                    className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none"
                  />
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-white/10">
                    <input 
                      type="number"
                      value={rule.value}
                      onChange={(e) => handleUpdateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent text-right text-sm font-bold text-white outline-none"
                    />
                    <button 
                      onClick={() => handleUpdateRule(rule.id, 'type', rule.type === 'percent' ? 'fixed' : 'percent')}
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                    >
                      {rule.type === 'percent' ? <Percent className="w-3 h-3" /> : <Euro className="w-3 h-3" />}
                    </button>
                  </div>
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;

import React, { useState, useEffect } from 'react';
import { Sun, Thermometer, Wind } from 'lucide-react';

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState({
    temp: 15.2,
    condition: 'Ensoleillé',
    wind: 12,
    city: 'Luxembourg'
  });

  // Mock weather update
  useEffect(() => {
    const timer = setInterval(() => {
      setWeather(prev => ({
        ...prev,
        temp: +(prev.temp + (Math.random() - 0.5)).toFixed(1)
      }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/5 rounded-xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-r border-white/10 pr-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{weather.city}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Sun className="w-4 h-4 text-yellow-400" />
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-white">{weather.temp}°C</span>
          <Thermometer className="w-3 h-3 text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-3 border-l border-white/10 pl-4">
        <Wind className="w-4 h-4 text-blue-400" />
        <span className="text-[10px] font-bold text-slate-400">{weather.wind} km/h</span>
      </div>
    </div>
  );
};

export default WeatherWidget;

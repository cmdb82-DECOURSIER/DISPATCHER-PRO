import React, { useState, useEffect } from 'react';

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-xl font-black text-[#FF6600] tracking-tighter leading-none drop-shadow-[0_0_8px_rgba(255,102,0,0.5)]">
        {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
        {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
};

export default ClockWidget;

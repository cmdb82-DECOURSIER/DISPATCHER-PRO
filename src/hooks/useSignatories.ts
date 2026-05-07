import { useState, useEffect } from 'react';
import { maeSignatories as defaultSignatories } from '../data/mae_options';

export const useSignatories = () => {
  const [signatories, setSignatories] = useState<string[]>(defaultSignatories);

  useEffect(() => {
    const loadSignatories = () => {
      const stored = localStorage.getItem('customMaeSignatories');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSignatories([...new Set([...parsed, ...defaultSignatories])].sort());
            return;
          }
        } catch (e) {
          console.error('Error parsing custom signatories', e);
        }
      }
      setSignatories([...defaultSignatories].sort());
    };

    loadSignatories();

    // Listen for changes from other components
    window.addEventListener('signatoriesUpdated', loadSignatories);
    return () => window.removeEventListener('signatoriesUpdated', loadSignatories);
  }, []);

  const addSignatories = (newSignatories: string[]) => {
    const stored = localStorage.getItem('customMaeSignatories');
    let currentCustom: string[] = [];
    if (stored) {
      try {
        currentCustom = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    
    const updatedCustom = [...new Set([...currentCustom, ...newSignatories])];
    localStorage.setItem('customMaeSignatories', JSON.stringify(updatedCustom));
    
    // Trigger update
    window.dispatchEvent(new Event('signatoriesUpdated'));
  };

  return { signatories, addSignatories };
};

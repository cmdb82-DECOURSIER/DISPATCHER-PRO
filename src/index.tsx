
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Erreur critique au rendu de l'application:", e);
  rootElement.innerHTML = `<div style="color: white; padding: 20px; font-family: sans-serif;">
    <h1>Erreur de chargement</h1>
    <p>Une erreur est survenue lors du démarrage de l'application.</p>
    <p>Veuillez rafraîchir la page.</p>
  </div>`;
}

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// --- CONFIGURATION FIREBASE ---
// TODO: Remplacez les valeurs ci-dessous par celles de votre nouveau projet Firebase
// (Console Firebase > Paramètres du projet > Général > Vos applications > Web)
const firebaseConfig = {
  apiKey: "", // ex: "AIzaSy..."
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

let app = undefined;
let db = undefined;
let analytics = undefined;

// Initialisation sécurisée
try {
  // On ne tente l'initialisation que si une clé API est présente
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    try {
      analytics = getAnalytics(app);
    } catch {
      console.warn("Analytics non configuré ou bloqué.");
    }
    console.log("🔥 Firebase connecté");
  } else {
    console.log("⚠️ Aucune configuration Firebase détectée. Mode hors-ligne activé.");
  }
} catch (e) {
  console.error("Erreur initialisation Firebase:", e);
  console.warn("Passage en mode hors-ligne.");
}

export { app, analytics, db };
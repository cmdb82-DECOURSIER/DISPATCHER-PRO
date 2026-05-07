
import { GoogleGenAI, Type } from "@google/genai";
import { RouteEstimation } from "../types";

const MAPS_MODEL = "gemini-2.5-flash";
const GENERAL_MODEL = "gemini-3-flash-preview";

export interface ParsedDispatchData {
  stops?: string[];
  selectedDate?: string;
  selectedTime?: string;
  isUrgent?: boolean;
}

// 1. Parsing Natural Language Dispatch Requests
export const parseDispatchNote = async (note: string): Promise<ParsedDispatchData> => {
  if (!process.env.API_KEY || !note.trim()) return {};

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are a logistics AI. Extract trip details from this dispatcher note: "${note}".
      Extract origin, destination (or list of stops), date (YYYY-MM-DD), time (HH:mm).
      If the note implies urgency (words like "urgent", "asap", "rush"), set isUrgent to true.
      Return JSON only.
    `;

    const response = await ai.models.generateContent({
      model: GENERAL_MODEL, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stops: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of addresses in order" 
            },
            selectedDate: { type: Type.STRING, description: "YYYY-MM-DD" },
            selectedTime: { type: Type.STRING, description: "HH:mm" },
            isUrgent: { type: Type.BOOLEAN },
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data;

  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    if (e.status === 429 || e.message?.includes('quota')) {
      console.warn("AI Parse Quota Exceeded");
      return {};
    }
    console.error("AI Parse failed", e);
    return {};
  }
}

// 2. Multi-stop Route Estimation with Google Maps Grounding
export const estimateMultiStopRoute = async (stops: string[]): Promise<RouteEstimation> => {
  const calculateFallback = () => {
    const totalDist = (stops.length - 1) * 12.5;
    const totalDur = (stops.length - 1) * 25;
    return {
      distance: totalDist,
      duration: totalDur,
      clean_stops: stops,
    };
  };

  if (!process.env.API_KEY || stops.length < 2) {
    return calculateFallback();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Utilise l'outil Google Maps pour estimer précisément la distance totale de conduite (en km) et la durée (en minutes) pour un trajet passant par ces étapes dans l'ordre:
      ${stops.join(' -> ')}.
      
      Fournis ta réponse EXACTEMENT sous ce format texte :
      DISTANCE: [nombre] KM
      DURATION: [nombre] MIN
      CLEAN_STOPS: [adresse 1];[adresse 2];...
    `;

    const latLng = undefined;
    // Geolocation removed to speed up request
    // try {
    //   const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    //     navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 1000 });
    //   });
    //   latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    // } catch (error) {
    //   console.debug("Geolocation skipped or denied", error);
    // }

    const response = await ai.models.generateContent({
      model: MAPS_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: latLng ? {
          retrievalConfig: { latLng }
        } : undefined
      },
    });

    const text = response.text || "";
    
    // Extraction des grounding chunks
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingLinks = groundingMetadata?.groundingChunks
      ?.filter((chunk: { maps?: { title?: string; uri: string } }) => chunk.maps)
      ?.map((chunk: { maps: { title?: string; uri: string } }) => ({
        title: chunk.maps.title || 'Source Google Maps',
        uri: chunk.maps.uri
      })) || [];

    // Parsing manuel par Regex avec support des formats numériques internationaux (ex: 12,5 ou 1 200)
    const distMatch = text.match(/DISTANCE:\s*([\d.,\s]+)/i);
    const durMatch = text.match(/DURATION:\s*([\d.,\s]+)/i);
    const stopsMatch = text.match(/CLEAN_STOPS:\s*(.*)/i);

    // Fonction locale pour parser les nombres (nettoie espaces et remplace virgule par point)
    const parseLocalFloat = (val: string) => {
        return parseFloat(val.replace(/\s/g, '').replace(',', '.'));
    };

    const distance = distMatch ? parseLocalFloat(distMatch[1]) : (stops.length - 1) * 12.5;
    const duration = durMatch ? parseLocalFloat(durMatch[1]) : (stops.length - 1) * 25;
    const clean_stops = stopsMatch 
      ? stopsMatch[1].split(';').map(s => s.trim()).filter(s => s.length > 0) 
      : stops;

    return {
      distance,
      duration,
      clean_stops: clean_stops.length === stops.length ? clean_stops : stops,
      groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined
    };

  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    if (e.status === 429 || e.message?.includes('quota')) {
      console.warn("Route Estimation Quota Exceeded - Using fallback");
      return calculateFallback();
    }
    console.error("Gemini Route Estimation Failed:", error);
    return calculateFallback();
  }
};

export const estimateRoute = async (origin: string, destination: string) => {
  const result = await estimateMultiStopRoute([origin, destination]);
  return {
    distance: result.distance,
    duration: result.duration,
    origin_clean: result.clean_stops[0],
    destination_clean: result.clean_stops[1],
    groundingLinks: result.groundingLinks
  };
};

// 3. Real-time Traffic Updates using Maps Grounding - REMOVED

// 4. Intelligent Email Generation
export const generateQuoteEmail = async (
  clientName: string,
  startAddress: string,
  endAddress: string,
  price: string,
  details: string,
  language: 'fr' | 'en' = 'fr',
  tone: 'formal' | 'friendly' = 'formal'
): Promise<string> => {
  if (!process.env.API_KEY) return "";
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Rédige un email ${tone === 'formal' ? 'très professionnel' : 'amical mais pro'} en ${language === 'fr' ? 'Français' : 'Anglais'} pour le client "${clientName}".
      Sujet : Devis de Transport.
      
      Contexte de la course :
      - Enlèvement : ${startAddress}
      - Livraison : ${endAddress}
      - Prix Total : ${price}
      - Détails techniques : ${details}
      
      L'email doit être clair, rassurer sur la qualité de service, et demander une validation.
      Ne mets pas de placeholders []. Signe "L'équipe Dispatch De Coursier".
    `;

    const response = await ai.models.generateContent({
      model: GENERAL_MODEL,
      contents: prompt,
    });

    return response.text || "";
  } catch (e: unknown) {
    const error = e as { status?: number; message?: string };
    console.error("Email Generation Failed:", error);
    if (error.message?.includes('quota') || error.status === 429) {
      return "Désolé, le quota d'IA est dépassé. Veuillez utiliser le modèle standard ci-dessous.";
    }
    return "";
  }
}

// 5. Route Optimization
export const optimizeRoute = async (stops: string[]): Promise<{ optimizedStops: string[]; explanation: string }> => {
  if (!process.env.API_KEY || stops.length <= 2) {
    return { optimizedStops: stops, explanation: "Not enough stops to optimize." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are an expert route planner. I have a list of stops for a delivery route.
      Please reorder them to minimize total driving time and distance.
      The first stop MUST remain the first (Start).
      The last stop MUST remain the last (End) if it is a specific destination, otherwise optimize it too.
      
      Current list:
      ${stops.map((s, i) => `${i + 1}. ${s}`).join('\n')}
      
      Return a JSON object with:
      - "optimizedStops": array of strings with the new order.
      - "explanation": a short sentence explaining why this order is better (e.g. "Avoids city center traffic", "Reduces backtracking").
    `;

    const response = await ai.models.generateContent({
      model: GENERAL_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedStops: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            explanation: { type: Type.STRING }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      optimizedStops: data.optimizedStops || stops,
      explanation: data.explanation || "Optimization completed."
    };

  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    if (e.status === 429 || e.message?.includes('quota')) {
      console.warn("Route Optimization Quota Exceeded");
      return { optimizedStops: stops, explanation: "Optimisation indisponible (Quota)." };
    }
    console.error("Route Optimization Failed", e);
    return { optimizedStops: stops, explanation: "Optimization failed, keeping original order." };
  }
};

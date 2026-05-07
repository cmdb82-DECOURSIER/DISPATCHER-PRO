
export type ApostilleStatus = 'en attente' | 'en cours de traitement' | 'fini' | 'refusee' | 'remboursée';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

export interface ApostilleRequest {
  id: string;
  missionId: string;
  reference: string;
  status: ApostilleStatus;
  remarks?: string;
  createdAt: number;
}

export interface Zone {
  id: number;
  name: string;
  price: number;
  traversesLux: boolean;
}

export interface FixedDestination {
  id: string;
  name: string;
  price: number;
}

export interface VehicleConfig {
  id: string;
  name: string;
  description: string;
  image: string;
  base_price: number;
  price_per_km: number;
  price_per_minute: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  clientNumber?: string;
  default_address?: string;
  email?: string;
  default_tariff_id?: string;
}

export type StaffRole = 'Chauffeur' | 'Gérant' | 'Chef Dispatch' | 'Assistant Polyvalent';

export interface Staff {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: StaffRole;
  address?: string;
  vehicle?: string;
  status: 'actif' | 'inactif';
  contractType?: string;
  order: number; // Position pour le tri manuel
  workingHours?: {
    start: string;
    end: string;
  };
  notes?: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
}

export interface Stop {
  id: string;
  address: string;
  clientName?: string; // Nom du client ou contact sur place
  reference?: string; // Référence spécifique à cette étape
  type: 'pickup' | 'dropoff' | 'stop';
  zoneId?: string | null; // ID de la zone ou du forfait associé à cette étape
  isMae?: boolean;
  scheduledTime?: string;
}

export interface CustomRule {
  id: string;
  name: string;
  value: number;
  type: 'percent' | 'fixed';
  isActive: boolean;
}

export interface GlobalSettings {
  urgency_coefficient: number;
  precise_time_fee: number;
  volume_coefficient: number;
  weekend_coefficient: number;
  default_fuel_surcharge_percent: number;
  vat_percent: number;
  useDeliveryNoteNumbering?: boolean;
  deliveryNoteStartNumber?: number;
  apostille_price?: number;
  customRules?: CustomRule[];
  
  // Règles Zone & Hors Zone
  zone_to_zone_deduction?: boolean;
  zone_to_zone_deduction_type?: 'zone' | 'fixed' | 'percent';
  zone_to_zone_deduction_value?: number;
  
  zone_to_hors_zone_deduction?: boolean;
  zone_to_hors_zone_deduction_type?: 'zone' | 'fixed' | 'percent';
  zone_to_hors_zone_deduction_value?: number;
  
  hors_zone_to_hors_zone_deduction?: boolean;
  hors_zone_to_hors_zone_deduction_type?: 'zone' | 'fixed' | 'percent';
  hors_zone_to_hors_zone_deduction_value?: number;
  
  return_trip_percent?: number;
  base_hors_zone_price?: number;
}

export interface TariffItem {
  id: string;
  name: string;
  price: number;
  category: 'zone' | 'destination' | 'route' | 'special';
}

export interface Holiday {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  type: 'vacances' | 'maladie' | 'retard' | 'formation' | 'indisponible' | 'autre';
  status: 'valide' | 'attente';
  comment?: string;
  time?: string; // Pour les retards
}

export interface BillingProfile {
  id: string;
  companyName: string;
  address: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface MaeDocument {
  id: string;
  country: string;
  signatory: string;
  documentType: string;
  signatureCount: number;
  price: number;
}

export interface QuoteRequest {
  client: Client | null;
  billingProfileId?: string;
  deliveryNoteNumber?: string;
  reference?: string;
  stops: Stop[];
  instructions?: string; // Instructions pour le chauffeur
  returnToStart: boolean;
  totalDistance: number;
  totalDuration: number;
  pricingMode: 'distance' | 'forfait' | 'calculator' | 'text' | 'city' | 'delivery_note';
  startZoneId: string | null;
  endZoneId: string | null;
  fixedDestinationId: string | null;
  manualItems: TariffItem[];
  isScheduled: boolean;
  selectedDate: string;
  selectedTime: string;
  preciseTimeValue?: string;
  pickupTimeValue?: string;
  tripType: 'normal' | 'return';
  vehicleId: string;
  isUrgent: boolean;
  urgentPercent?: number;
  isPreciseTime: boolean;
  preciseTimePercent?: number;
  isBigVolume: boolean;
  bigVolumePercent?: number;
  packageSize: 'S' | 'M' | 'L';
  packageCount: number;
  isApostille: boolean;
  isMae?: boolean;
  isMaeAller?: boolean;
  isMaePickup?: boolean;
  maeCountry?: string;
  maeType?: 'apostille' | 'legalisation';
  maeDocuments?: MaeDocument[];
  waitingTimeMinutes: number;
  waitingTimePricePerMin: number;
  customFuelSurchargePercent: number;
  customVatPercent: number;
  urgencySurchargePercent: number;
  volumeSurchargePercent: number;
  preciseTimeSurchargePercent: number;
  apostillePrice: number;
  discountValue: number;
  discountType: 'euro' | 'percent';
  manualAdjustment: number;
  advancedFees: number;
  basePriceOverride?: number;
  secondCourse?: boolean;
  course2SimpleAller?: boolean;
  course2SimpleRetour?: boolean;
  course2ARAller?: boolean;
  course2ARRetour?: boolean;
  course2Zone?: string;
  course2Name?: string;
  course2Address?: string;
}

export interface PriceBreakdown {
  baseSubTotal: number;
  finalSubTotal: number;
  multiplier: number;
  urgencyFee: number;
  volumeFee: number;
  preciseTimeFee: number;
  waitingFee: number;
  weekendFee: number;
  apostilleFee: number;
  maeFee?: number;
  maeAllerFee?: number;
  maePickupFee?: number;
  advancedFees: number;
  discountAmount: number;
  manualAdjustment: number;
  customRulesFee?: number;
  fuelCost: number;
  priceHT: number;
  vatAmount: number;
  priceTTC: number;
  totalDistance: number;
  totalDuration: number;
  isWeekend: boolean;
  basePrice?: number;
  urgentFee?: number;
  fuelSurcharge?: number;
  zoneDetails?: {
      startName: string;
      startPrice: number;
      endName: string;
      endPrice: number;
      deduction: number;
      returnPrice: number;
      legs?: {
          startName: string;
          startPrice: number;
          endName: string;
          endPrice: number;
          deduction: number;
          legPrice: number;
      }[];
  };
  distanceDetails?: {
      basePrice: number;
      distanceCost: number;
      durationCost: number;
      returnPrice: number;
      deduction?: number;
  };
}

export type MissionStatus = 'en attente' | 'en cours' | 'finalisé' | 'annulé' | 'à facturer' | 'facturée';
export type MissionPriority = 'Basse' | 'Moyenne' | 'Haute';

export interface Mission {
  id: string;
  missionNumber: string;
  createdAt: number;
  date: string;
  time: string;
  request: QuoteRequest;
  result: PriceBreakdown;
  status: MissionStatus;
  priority: MissionPriority;
  dispatcherNotes?: string;
  assignedStaffId?: string;
  archivedForBilling?: boolean;
  billingStatus?: 'en attente de contrôle' | 'en cours de traitement' | 'finalisée';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  missionId: string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface RouteEstimation {
  distance: number;
  duration: number;
  clean_stops: string[];
  groundingLinks?: { title: string, uri: string }[];
}

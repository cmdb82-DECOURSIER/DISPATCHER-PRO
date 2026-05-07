
import { GlobalSettings, PriceBreakdown, QuoteRequest, VehicleConfig } from '../types';

/**
 * Helper to round to 2 decimal places to avoid floating point issues in totals
 */
const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

export const calculatePrice = (
  request: QuoteRequest,
  vehicle: VehicleConfig,
  settings: GlobalSettings,
  dynamicZones: Zone[],
  dynamicFixedDestinations: FixedDestination[]
): PriceBreakdown => {
  const { 
    totalDistance = 0, 
    totalDuration = 0, 
    isScheduled = false,
    selectedDate = '', 
    selectedTime = '', 
    isUrgent = false, 
    isPreciseTime = false, 
    isBigVolume = false,
    isApostille = false,
    waitingTimeMinutes = 0,
    customFuelSurchargePercent = settings.default_fuel_surcharge_percent,
    customVatPercent = settings.vat_percent,
    returnToStart = false,
    discountValue = 0,
    discountType = 'percent',
    apostillePrice = 0,
    manualAdjustment = 0,
    advancedFees = 0,
    basePriceOverride
  } = request;

  const safeUrgencySurchargePercent = Number(request.urgencySurchargePercent) || 0;
  const safeVolumeSurchargePercent = Number(request.volumeSurchargePercent) || 0;
  const safePreciseTimeSurchargePercent = Number(request.preciseTimeSurchargePercent) || 0;
  const safeCustomFuelSurchargePercent = Number(customFuelSurchargePercent) || 0;
  const safeCustomVatPercent = Number(customVatPercent) || 0;
  const safeManualAdjustment = Number(manualAdjustment) || 0;
  const safeAdvancedFees = Number(advancedFees) || 0;
  const safeDiscountValue = Number(discountValue) || 0;
  const safeWaitingTimeMinutes = Number(waitingTimeMinutes) || 0;
  const safeApostillePrice = Number(apostillePrice) || 0;
  const safeBasePriceOverride = basePriceOverride !== undefined ? Number(basePriceOverride) : undefined;

  let dateObj: Date;
  if (isScheduled) {
    const fullDateStr = `${selectedDate}T${selectedTime}`;
    dateObj = new Date(fullDateStr);
  } else {
    dateObj = new Date();
  }

  const day = dateObj.getDay();
  const isWeekend = day === 0 || day === 6;

  let baseSubTotalInitial = 0;
  let legPrice = 0;
  
  let zoneDetails: {
      startName: string;
      startPrice: number;
      endName: string;
      endPrice: number;
      deduction: number;
      returnPrice: number;
  } | undefined = undefined;

  let distanceDetails: {
      basePrice: number;
      distanceCost: number;
      durationCost: number;
      returnPrice: number;
      deduction?: number;
  } | undefined = undefined;

  const resolveLocation = (id: string | null) => {
    if (!id) return null;
    if (id.startsWith('zone_')) {
      const idStr = id.replace('zone_', '');
      const z = (dynamicZones || []).find(z => String(z.id) === idStr);
      return z ? { name: z.name, price: Number(z.price) || 0, traversesLux: !!z.traversesLux, isZone: true } : null;
    }
    if (id.startsWith('fixed_')) {
      const idStr = id.replace('fixed_', '');
      const f = (dynamicFixedDestinations || []).find(f => String(f.id) === idStr);
      return f ? { name: f.name, price: Number(f.price) || 0, traversesLux: false, isZone: false } : null;
    }
    if (id.startsWith('client_')) {
      // Fallback simple pour adresse client
      return { name: "Adresse Client", price: 12.22, traversesLux: false, isZone: false };
    }
    return null;
  };

  if (request.pricingMode === 'distance') {
      const distanceCost = round(totalDistance * Number(vehicle.price_per_km));
      const durationCost = round(totalDuration * Number(vehicle.price_per_minute));
      legPrice = round(Number(vehicle.base_price) + distanceCost + durationCost);
      baseSubTotalInitial = legPrice;

      let returnPrice = 0;
      if (returnToStart) {
          const returnPercent = settings.return_trip_percent !== undefined ? settings.return_trip_percent : 35;
          returnPrice = round(legPrice * (returnPercent / 100));
          baseSubTotalInitial += returnPrice;
      }

      distanceDetails = {
          basePrice: Number(vehicle.base_price),
          distanceCost,
          durationCost,
          returnPrice
      };
  } else if (request.pricingMode === 'forfait' || request.pricingMode === 'city') {
      const validStops = request.stops.filter(s => s.zoneId);
      
      if (validStops.length >= 2) {
          const getDeductionAmount = (isActive: boolean | undefined, type: 'zone' | 'fixed' | 'percent' | undefined, value: number | undefined, startPrice: number, endPrice: number) => {
              if (isActive === false) return 0;
              
              const t = type || 'zone';
              const v = value !== undefined ? value : 1;
              
              if (t === 'fixed') {
                  return v;
              } else if (t === 'percent') {
                  return round((startPrice + endPrice) * (v / 100));
              } else {
                  // type === 'zone'
                  const zone = (dynamicZones || []).find(z => String(z.id) === String(v));
                  return zone ? (Number(zone.price) || 12.22) : 12.22;
              }
          };
          
          let totalLegPrice = 0;
          let firstActualDeduction = 0;
          const legs = [];
          
          for (let i = 0; i < validStops.length - 1; i++) {
              const startLoc = resolveLocation(validStops[i].zoneId);
              const endLoc = resolveLocation(validStops[i + 1].zoneId);
              
              if (startLoc && endLoc) {
                  let actualDeduction = 0;
                  
                  if (startLoc.isZone && endLoc.isZone) {
                      actualDeduction = getDeductionAmount(settings.zone_to_zone_deduction, settings.zone_to_zone_deduction_type, settings.zone_to_zone_deduction_value, startLoc.price, endLoc.price);
                  } else if ((startLoc.isZone && !endLoc.isZone) || (!startLoc.isZone && endLoc.isZone)) {
                      actualDeduction = getDeductionAmount(settings.zone_to_hors_zone_deduction, settings.zone_to_hors_zone_deduction_type, settings.zone_to_hors_zone_deduction_value, startLoc.price, endLoc.price);
                  } else if (!startLoc.isZone && !endLoc.isZone) {
                      actualDeduction = getDeductionAmount(settings.hors_zone_to_hors_zone_deduction === true ? true : false, settings.hors_zone_to_hors_zone_deduction_type, settings.hors_zone_to_hors_zone_deduction_value, startLoc.price, endLoc.price);
                  }

                  if (i === 0) firstActualDeduction = actualDeduction;
                  const legPrice = round(startLoc.price + endLoc.price - actualDeduction);
                  totalLegPrice += legPrice;
                  
                  legs.push({
                      startName: startLoc.name,
                      startPrice: startLoc.price,
                      endName: endLoc.name,
                      endPrice: endLoc.price,
                      deduction: actualDeduction,
                      legPrice: legPrice
                  });
              }
          }
          
          legPrice = round(totalLegPrice);
          baseSubTotalInitial = legPrice;
          
          let returnPrice = 0;
          if (returnToStart) {
              const returnPercent = settings.return_trip_percent !== undefined ? settings.return_trip_percent : 35;
              returnPrice = round(legPrice * (returnPercent / 100));
              baseSubTotalInitial += returnPrice;
          }

          const firstLoc = resolveLocation(validStops[0].zoneId);
          const lastLoc = resolveLocation(validStops[validStops.length - 1].zoneId);

          zoneDetails = {
              startName: firstLoc?.name || 'N/A',
              startPrice: firstLoc?.price || 0,
              endName: lastLoc?.name || 'N/A',
              endPrice: lastLoc?.price || 0,
              deduction: firstActualDeduction,
              returnPrice: returnPrice,
              legs: legs
          };
      } else {
          const startLoc = resolveLocation(request.startZoneId);
          const endLoc = resolveLocation(request.endZoneId);

          if (startLoc || endLoc) {
              // Only one location selected
              legPrice = Number(startLoc?.price) || Number(endLoc?.price) || Number(vehicle.base_price) || 0;
              baseSubTotalInitial = legPrice;
              
              let returnPrice = 0;
              if (returnToStart) {
                  const returnPercent = settings.return_trip_percent !== undefined ? settings.return_trip_percent : 35;
                  returnPrice = round(legPrice * (returnPercent / 100));
                  baseSubTotalInitial += returnPrice;
              }

              zoneDetails = {
                  startName: startLoc?.name || 'N/A',
                  startPrice: startLoc?.price || 0,
                  endName: endLoc?.name || 'N/A',
                  endPrice: endLoc?.price || 0,
                  deduction: 0,
                  returnPrice: returnPrice
              };
          } else {
              // No locations selected
              legPrice = Number(vehicle.base_price) || 0;
              baseSubTotalInitial = legPrice;
              
              if (returnToStart) {
                  const returnPercent = settings.return_trip_percent !== undefined ? settings.return_trip_percent : 35;
                  const returnPrice = round(legPrice * (returnPercent / 100));
                  baseSubTotalInitial += returnPrice;
              }
          }
      }
  } else if (request.pricingMode === 'calculator' || request.pricingMode === 'text') {
      baseSubTotalInitial = (request.manualItems || []).reduce((acc, item) => acc + (Number(item.price) || 0), 0);
      legPrice = baseSubTotalInitial;
      if (baseSubTotalInitial < 0) baseSubTotalInitial = 0;

      if (returnToStart) {
          const returnPercent = settings.return_trip_percent !== undefined ? settings.return_trip_percent : 35;
          const returnPrice = round(legPrice * (returnPercent / 100));
          baseSubTotalInitial += returnPrice;
      }
  }

  // Capture single trip price before return surcharge logic for distance mode
  // Note: For 'forfait', baseSubTotalInitial is already set correctly above.
  // For 'distance', baseSubTotalInitial is the single trip price here.
  // And below I add returnSurcharge to baseSubTotalInitial.

  if (safeBasePriceOverride !== undefined && safeBasePriceOverride > 0) {
      baseSubTotalInitial = safeBasePriceOverride;
  }

  let multiplier = 1.0;
  const weekendFee = 0;
  let urgencyFee = 0;
  let volumeFee = 0;
  let preciseTimeFee = 0;

  if (isWeekend) {
      // Pas de majoration week-end
      // const addedCoeff = settings.weekend_coefficient - 1;
      // multiplier += addedCoeff;
      // weekendFee = round(singleTripPrice * addedCoeff);
  }
  if (isUrgent) {
      const addedCoeff = safeUrgencySurchargePercent / 100;
      multiplier += addedCoeff;
      urgencyFee = round(baseSubTotalInitial * addedCoeff);
  }
  if (isBigVolume) {
      const addedCoeff = safeVolumeSurchargePercent / 100;
      multiplier += addedCoeff;
      volumeFee = round(baseSubTotalInitial * addedCoeff);
  }
  if (isPreciseTime) {
      const addedCoeff = safePreciseTimeSurchargePercent / 100;
      multiplier += addedCoeff;
      preciseTimeFee = round(baseSubTotalInitial * addedCoeff);
  }

  // Final Subtotal based on rounded fees to ensure visual consistency
  const apostilleFee = isApostille
    ? round(Math.max(1, request.stops.filter(s => s.isMae).length) * (safeApostillePrice || 5))
    : 0;
  
  const maeFee = request.isMae && request.maeDocuments 
      ? request.maeDocuments.reduce((acc, doc) => acc + (doc.price || ((Number(doc.signatureCount) || 0) * 20)), 0) 
      : 0;

  let maeAllerFee = request.isMaeAller ? 0.44 : 0;
  let maePickupFee = request.isMaePickup ? 5.00 : 0;

  // Si service MAE en aller-retour, on applique les deux suppléments
  if (request.isMae && request.returnToStart) {
      maeAllerFee = 0.44;
      maePickupFee = 5.00;
  }

  const waitingSlices = Math.ceil(safeWaitingTimeMinutes / 5);
  const waitingFee = round(waitingSlices * 2.50);

  // Custom Rules
  let customRulesFee = 0;
  if (settings.customRules) {
    settings.customRules.forEach(rule => {
      if (rule.isActive) {
        if (rule.type === 'percent') {
          customRulesFee += round(baseSubTotalInitial * (rule.value / 100));
        } else {
          customRulesFee += round(rule.value);
        }
      }
    });
  }

  // Add fees to subTotal (maeFee is excluded because it's an advanced fee)
  let subTotal = round(baseSubTotalInitial + urgencyFee + volumeFee + preciseTimeFee + apostilleFee + waitingFee + maeAllerFee + maePickupFee + customRulesFee);

  let discountAmount = 0;
  if (safeDiscountValue > 0) {
      if (discountType === 'percent') {
          discountAmount = round(subTotal * (safeDiscountValue / 100));
      } else {
          discountAmount = round(safeDiscountValue);
      }
      if (discountAmount > subTotal) discountAmount = subTotal;
      subTotal -= discountAmount;
  }

  subTotal += safeManualAdjustment;

  const fuelCost = round(subTotal * (safeCustomFuelSurchargePercent / 100));
  const priceHT = round(subTotal + fuelCost);
  const vatAmount = round(priceHT * (safeCustomVatPercent / 100));
  const priceTTC = round(priceHT + vatAmount + safeAdvancedFees + maeFee);

  return {
    baseSubTotal: round(baseSubTotalInitial),
    finalSubTotal: round(subTotal),
    multiplier,
    urgencyFee,
    volumeFee,
    preciseTimeFee,
    weekendFee,
    apostilleFee,
    maeFee,
    maeAllerFee,
    maePickupFee,
    advancedFees: safeAdvancedFees,
    waitingFee,
    discountAmount,
    manualAdjustment: safeManualAdjustment,
    customRulesFee,
    zoneDetails,
    distanceDetails,
    fuelCost,
    fuelSurcharge: fuelCost,
    basePrice: legPrice,
    urgentFee: urgencyFee,
    priceHT,
    vatAmount,
    priceTTC,
    totalDistance,
    totalDuration,
    isWeekend
  };
};

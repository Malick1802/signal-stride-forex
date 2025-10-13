import { StructurePoint, MarketStructure } from './marketStructureAnalysis';
import { getPipValue } from './pipCalculator';

export interface AOI {
  type: 'support' | 'resistance';
  priceLevel: number;
  width: number;
  strength: number;
  touchPoints: number;
  firstSeen: Date;
  lastTested: Date;
}

// Cluster 3+ structure points within 5-60 pips
export function clusterStructurePoints(
  structurePoints: StructurePoint[],
  symbol: string,
  minWidth: number = 5,
  maxWidth: number = 60,
  optimalWidth: number = 25
): AOI[] {
  const pipValue = getPipValue(symbol);
  const zones: AOI[] = [];
  const sorted = [...structurePoints].sort((a, b) => a.price - b.price);
  
  let currentZone: StructurePoint[] = [];
  
  for (const point of sorted) {
    if (currentZone.length === 0) {
      currentZone.push(point);
      continue;
    }
    
    const zoneMin = Math.min(...currentZone.map(p => p.price));
    const zoneMax = Math.max(...currentZone.map(p => p.price));
    
    const newMax = Math.max(zoneMax, point.price);
    const newMin = Math.min(zoneMin, point.price);
    const newPips = (newMax - newMin) / pipValue;
    
    if (newPips <= maxWidth) {
      currentZone.push(point);
    } else {
      if (currentZone.length >= 3) {
        zones.push(createAOI(currentZone, symbol));
      }
      currentZone = [point];
    }
  }
  
  if (currentZone.length >= 3) {
    zones.push(createAOI(currentZone, symbol));
  }
  
  return zones;
}

function createAOI(points: StructurePoint[], symbol: string): AOI {
  const prices = points.map(p => p.price);
  const priceLevel = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const width = (Math.max(...prices) - Math.min(...prices)) / getPipValue(symbol);
  
  let strength = Math.min(5, points.length);
  if (width <= 25) strength = Math.min(5, strength + 1);
  
  return {
    type: points[0].type === 'LL' || points[0].type === 'HL' ? 'support' : 'resistance',
    priceLevel,
    width,
    strength,
    touchPoints: points.length,
    firstSeen: points[0].timestamp,
    lastTested: points[points.length - 1].timestamp
  };
}

// Identify support/resistance from W and D timeframes
export async function identifyAreasOfInterest(
  supabase: any,
  symbol: string,
  timeframe: 'W' | '1D',
  lookbackPeriod: string,
  currentStructure: MarketStructure
): Promise<{ support: AOI[]; resistance: AOI[] }> {
  
  const structurePoints = currentStructure.structurePoints;
  const zones = clusterStructurePoints(structurePoints, symbol);
  
  const support = zones.filter(z => z.type === 'support');
  const resistance = zones.filter(z => z.type === 'resistance');
  
  return { support, resistance };
}

// Find overlapping zones between W and D (within 10 pips)
export function findZoneOverlaps(
  weeklyZones: { support: AOI[]; resistance: AOI[] },
  dailyZones: { support: AOI[]; resistance: AOI[] },
  symbol: string = 'EURUSD'
): {
  support: AOI[];
  resistance: AOI[];
  bonusScore: number;
} {
  const overlappingSupport: AOI[] = [];
  const overlappingResistance: AOI[] = [];
  
  for (const wZone of weeklyZones.support) {
    for (const dZone of dailyZones.support) {
      const pipDiff = Math.abs(wZone.priceLevel - dZone.priceLevel) / getPipValue(symbol);
      
      if (pipDiff <= 10) {
        overlappingSupport.push({
          ...wZone,
          strength: Math.min(5, wZone.strength + 1),
          touchPoints: wZone.touchPoints + dZone.touchPoints
        });
      }
    }
  }
  
  for (const wZone of weeklyZones.resistance) {
    for (const dZone of dailyZones.resistance) {
      const pipDiff = Math.abs(wZone.priceLevel - dZone.priceLevel) / getPipValue(symbol);
      
      if (pipDiff <= 10) {
        overlappingResistance.push({
          ...wZone,
          strength: Math.min(5, wZone.strength + 1),
          touchPoints: wZone.touchPoints + dZone.touchPoints
        });
      }
    }
  }
  
  const bonusScore = (overlappingSupport.length + overlappingResistance.length) * 10;
  
  return { support: overlappingSupport, resistance: overlappingResistance, bonusScore };
}

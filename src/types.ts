export type SoilType = 'loamy' | 'sandy' | 'clay' | 'saline';
export type RainfallLevel = 'low' | 'moderate' | 'high';

export interface TreeSpecies {
  id: string;
  name: string;
  scientificName: string;
  growthRate: number; // Annual biomass increase factor
  carbonCoefficient: number; // CO2 sequestered per kg of biomass
  maxBiomass: number; // kg
  survivalRate: number; // 0 to 1 (base survival)
  rootShootRatio: number; // Factor for belowground biomass (e.g., 0.2)
  resilienceScore: number; // 0 to 100 (overall robustness)
  pestResistance: number; // 0 to 100 (resistance to local pests)
  description: string;
  preferences: {
    soil: SoilType[];
    rainfall: RainfallLevel;
  };
}

export const TREE_SPECIES: TreeSpecies[] = [
  {
    id: "teak",
    name: "Teak",
    scientificName: "Tectona grandis",
    growthRate: 0.15,
    carbonCoefficient: 0.5,
    maxBiomass: 1200,
    survivalRate: 0.9,
    rootShootRatio: 0.2,
    resilienceScore: 75,
    pestResistance: 70,
    description: "High-value timber tree with significant carbon storage potential in tropical regions.",
    preferences: {
      soil: ['loamy', 'sandy'],
      rainfall: 'high'
    }
  },
  {
    id: "oak",
    name: "Oak",
    scientificName: "Quercus robur",
    growthRate: 0.08,
    carbonCoefficient: 0.5,
    maxBiomass: 2500,
    survivalRate: 0.92,
    rootShootRatio: 0.25,
    resilienceScore: 85,
    pestResistance: 80,
    description: "Slow-growing but long-lived, providing massive long-term carbon sinks and biodiversity support.",
    preferences: {
      soil: ['loamy', 'clay'],
      rainfall: 'moderate'
    }
  },
  {
    id: "pine",
    name: "Pine",
    scientificName: "Pinus sylvestris",
    growthRate: 0.2,
    carbonCoefficient: 0.45,
    maxBiomass: 800,
    survivalRate: 0.85,
    rootShootRatio: 0.18,
    resilienceScore: 65,
    pestResistance: 50,
    description: "Fast-growing pioneer species, excellent for rapid initial carbon sequestration.",
    preferences: {
      soil: ['sandy', 'loamy'],
      rainfall: 'low'
    }
  },
  {
    id: "mangrove",
    name: "Mangrove",
    scientificName: "Rhizophora mangle",
    growthRate: 0.12,
    carbonCoefficient: 0.55,
    maxBiomass: 500,
    survivalRate: 0.8,
    rootShootRatio: 0.4,
    resilienceScore: 90,
    pestResistance: 85,
    description: "Critical for coastal protection and blue carbon storage, sequestering more carbon per acre than terrestrial forests.",
    preferences: {
      soil: ['saline', 'clay'],
      rainfall: 'high'
    }
  },
  {
    id: "bamboo",
    name: "Bamboo",
    scientificName: "Bambusoideae",
    growthRate: 0.4,
    carbonCoefficient: 0.45,
    maxBiomass: 150,
    survivalRate: 0.95,
    rootShootRatio: 0.3,
    resilienceScore: 95,
    pestResistance: 90,
    description: "Extremely fast-growing, reaching maturity in 3-5 years. Great for rapid biomass production.",
    preferences: {
      soil: ['loamy', 'clay', 'sandy'],
      rainfall: 'moderate'
    }
  }
];

export interface SimulationResult {
  year: number;
  biomass: number;
  co2Sequestered: number;
  co2Low?: number;
  co2High?: number;
  survivalCount: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  timestamp: number;
  parameters: {
    selectedSpeciesIds: string[];
    treeCount: number;
    years: number;
    soilType: SoilType;
    rainfallLevel: RainfallLevel;
    managementLevel: 'poor' | 'average' | 'good';
    isComparisonMode: boolean;
  };
}

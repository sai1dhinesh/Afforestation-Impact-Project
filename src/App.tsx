/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { 
  TreeDeciduous, 
  TrendingUp, 
  Info, 
  Download, 
  Leaf, 
  Wind, 
  ShieldCheck,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TREE_SPECIES, TreeSpecies, SimulationResult, SoilType, RainfallLevel } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([TREE_SPECIES[0].id]);
  const [treeCount, setTreeCount] = useState<number>(1000);
  const [years, setYears] = useState<number>(20);
  const [soilType, setSoilType] = useState<SoilType>('loamy');
  const [rainfallLevel, setRainfallLevel] = useState<RainfallLevel>('moderate');
  const [managementLevel, setManagementLevel] = useState<'good' | 'poor'>('good');
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'co2' | 'biomass'>('co2');

  const getEnvMultiplier = (species: TreeSpecies) => {
    let multiplier = 1.0;
    const combinedRobustness = (species.resilienceScore + species.pestResistance) / 2;
    const resilienceFactor = 1 - (combinedRobustness / 100);
    
    // Soil multiplier
    if (!species.preferences.soil.includes(soilType)) {
      const basePenalty = 0.2; // 20% growth penalty
      multiplier *= (1 - basePenalty * resilienceFactor);
    }
    
    // Rainfall multiplier
    const levels: RainfallLevel[] = ['low', 'moderate', 'high'];
    const preferredIdx = levels.indexOf(species.preferences.rainfall);
    const currentIdx = levels.indexOf(rainfallLevel);
    const diff = Math.abs(preferredIdx - currentIdx);
    
    if (diff === 1) {
      const basePenalty = 0.2;
      multiplier *= (1 - basePenalty * resilienceFactor);
    } else if (diff === 2) {
      const basePenalty = 0.5;
      multiplier *= (1 - basePenalty * resilienceFactor);
    }
    
    // Management impact on growth (not just survival)
    if (managementLevel === 'poor') multiplier *= 0.9;

    return multiplier;
  };

  const selectedSpeciesList = useMemo(() => 
    TREE_SPECIES.filter(s => selectedSpeciesIds.includes(s.id)),
  [selectedSpeciesIds]);

  const environmentalImpactData = useMemo(() => {
    return selectedSpeciesList.map(species => {
      const combinedRobustness = (species.resilienceScore + species.pestResistance) / 2;
      const resilienceFactor = 1 - (combinedRobustness / 100);
      
      let soilMultiplier = 1.0;
      if (!species.preferences.soil.includes(soilType)) {
        soilMultiplier = (1 - 0.2 * resilienceFactor);
      }
      
      let rainfallMultiplier = 1.0;
      const levels: RainfallLevel[] = ['low', 'moderate', 'high'];
      const preferredIdx = levels.indexOf(species.preferences.rainfall);
      const currentIdx = levels.indexOf(rainfallLevel);
      const diff = Math.abs(preferredIdx - currentIdx);
      if (diff === 1) rainfallMultiplier = (1 - 0.2 * resilienceFactor);
      else if (diff === 2) rainfallMultiplier = (1 - 0.5 * resilienceFactor);
      
      const managementMultiplier = managementLevel === 'poor' ? 0.9 : 1.0;
      
      return {
        name: species.name,
        soil: Number((soilMultiplier * 100).toFixed(1)),
        rainfall: Number((rainfallMultiplier * 100).toFixed(1)),
        management: Number((managementMultiplier * 100).toFixed(1)),
        total: Number((soilMultiplier * rainfallMultiplier * managementMultiplier * 100).toFixed(1))
      };
    });
  }, [selectedSpeciesList, soilType, rainfallLevel, managementLevel]);

  const selectedSpecies = selectedSpeciesList[0] || TREE_SPECIES[0];

  const synergyFactor = useMemo(() => {
    if (selectedSpeciesList.length <= 1) return 1;
    // Mixed-species synergy: up to 70% higher carbon stocks for 4+ species
    const factor = 1 + (selectedSpeciesList.length - 1) * 0.2;
    return Math.min(factor, 1.7);
  }, [selectedSpeciesList]);

  const comparisonData = useMemo(() => {
    const yearsArray = Array.from({ length: years + 1 }, (_, i) => i);
    
    return yearsArray.map(year => {
      const dataPoint: any = { year };
      
      selectedSpeciesList.forEach(species => {
        let currentBiomass = 5;
        let currentSurvival = treeCount;
        const envMultiplier = getEnvMultiplier(species);
        const effectiveSurvivalRate = managementLevel === 'good' ? species.survivalRate : species.survivalRate * 0.8;
        
        for (let y = 1; y <= year; y++) {
          const growth = (species.growthRate * envMultiplier * synergyFactor) * currentBiomass * (1 - currentBiomass / species.maxBiomass);
          currentBiomass += growth;
          const annualSurvivalRate = Math.pow(effectiveSurvivalRate, 1 / years);
          currentSurvival *= annualSurvivalRate;
        }
        
        // Include root biomass
        const totalBiomass = currentBiomass * (1 + species.rootShootRatio);
        const co2PerTree = totalBiomass * species.carbonCoefficient * 3.67;
        const totalCo2 = (co2PerTree * currentSurvival) / 1000;
        
        dataPoint[`co2_${species.id}`] = Number(totalCo2.toFixed(2));
        dataPoint[`biomass_${species.id}`] = Number(totalBiomass.toFixed(2));
        dataPoint[`survival_${species.id}`] = Math.floor(currentSurvival);
      });
      
      return dataPoint;
    });
  }, [selectedSpeciesList, treeCount, years, soilType, rainfallLevel, managementLevel, synergyFactor]);

  const simulationData = useMemo(() => {
    const species = selectedSpeciesList[0] || TREE_SPECIES[0];
    const data: SimulationResult[] = [];
    let currentBiomassPerTree = 5;
    let currentSurvivalCount = treeCount;
    const envMultiplier = getEnvMultiplier(species);
    const effectiveSurvivalRate = managementLevel === 'good' ? species.survivalRate : species.survivalRate * 0.8;

    for (let year = 0; year <= years; year++) {
      const totalBiomass = currentBiomassPerTree * (1 + species.rootShootRatio);
      const co2PerTree = totalBiomass * species.carbonCoefficient * 3.67;
      const totalCo2 = (co2PerTree * currentSurvivalCount) / 1000;

      // Uncertainty based on +/- 10% survival variance
      const totalCo2Low = (co2PerTree * currentSurvivalCount * 0.9) / 1000;
      const totalCo2High = (co2PerTree * currentSurvivalCount * 1.1) / 1000;

      data.push({
        year,
        biomass: Number(totalBiomass.toFixed(2)),
        co2Sequestered: Number(totalCo2.toFixed(2)),
        co2Low: Number(totalCo2Low.toFixed(2)),
        co2High: Number(totalCo2High.toFixed(2)),
        survivalCount: Math.floor(currentSurvivalCount)
      });

      const growth = (species.growthRate * envMultiplier * synergyFactor) * currentBiomassPerTree * (1 - currentBiomassPerTree / species.maxBiomass);
      currentBiomassPerTree += growth;
      const annualSurvivalRate = Math.pow(effectiveSurvivalRate, 1 / years);
      currentSurvivalCount *= annualSurvivalRate;
    }
    return data;
  }, [selectedSpeciesList, treeCount, years, soilType, rainfallLevel, managementLevel, synergyFactor]);

  const toggleSpecies = (id: string) => {
    if (isComparisonMode) {
      setSelectedSpeciesIds(prev => 
        prev.includes(id) 
          ? (prev.length > 1 ? prev.filter(sid => sid !== id) : prev)
          : [...prev, id]
      );
    } else {
      setSelectedSpeciesIds([id]);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const totalSequestered = simulationData[simulationData.length - 1].co2Sequestered;
  const carMilesEquivalent = (totalSequestered * 2500).toLocaleString(); // 1 ton CO2 approx 2500 miles in average car

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (isComparisonMode) {
      // Headers
      const headers = ["Year"];
      selectedSpeciesList.forEach(s => {
        headers.push(`${s.name} CO2 (Tons)`, `${s.name} Biomass (kg)`, `${s.name} Survival`);
      });
      csvContent += headers.join(",") + "\n";
      
      // Data
      comparisonData.forEach(row => {
        const line = [row.year];
        selectedSpeciesList.forEach(s => {
          line.push(row[`co2_${s.id}`], row[`biomass_${s.id}`], row[`survival_${s.id}`]);
        });
        csvContent += line.join(",") + "\n";
      });
    } else {
      // Headers
      csvContent += "Year,Biomass (kg),CO2 Sequestered (Metric Tons),Survival Count\n";
      
      // Data
      simulationData.forEach(row => {
        csvContent += `${row.year},${row.biomass},${row.co2Sequestered},${row.survivalCount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `afforestation_impact_${isComparisonMode ? 'comparison' : selectedSpecies.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-emerald-900 text-white py-8 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TreeDeciduous className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Afforestation Impact Modeler</h1>
              <p className="text-emerald-200/70 text-sm">Quantitative Carbon Sequestration Projection</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 transition-colors rounded-lg text-sm font-medium border border-emerald-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              onClick={() => setIsBriefOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 transition-colors rounded-lg text-sm font-medium border border-emerald-700"
            >
              <Info className="w-4 h-4" />
              Policy Brief
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Simulation Parameters
            </h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Tree Species</label>
                  <button 
                    onClick={() => setIsComparisonMode(!isComparisonMode)}
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md transition-all",
                      isComparisonMode ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {isComparisonMode ? "Multi-Select ON" : "Compare Mode"}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {TREE_SPECIES.map((species) => (
                    <button
                      key={species.id}
                      onClick={() => toggleSpecies(species.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        selectedSpeciesIds.includes(species.id)
                          ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                          : "bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-slate-900">{species.name}</p>
                          <div className="flex gap-1">
                            <div className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-bold uppercase">
                              Res: {species.resilienceScore}
                            </div>
                            <div className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-bold uppercase">
                              Pest: {species.pestResistance}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic mb-1">{species.scientificName}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${species.growthRate * 200}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Growth Rate</span>
                        </div>
                      </div>
                      {selectedSpeciesIds.includes(species.id) && (
                        <div className="ml-3 p-1 bg-emerald-500 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Number of Trees</label>
                  <span className="text-sm font-bold text-emerald-600">{treeCount.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="10000" 
                  step="100"
                  value={treeCount}
                  onChange={(e) => setTreeCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Simulation Period (Years)</label>
                  <span className="text-sm font-bold text-emerald-600">{years} yrs</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Environmental Factors</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Soil Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['loamy', 'sandy', 'clay', 'saline'] as SoilType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSoilType(type)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize",
                            soilType === type 
                              ? "bg-emerald-600 border-emerald-600 text-white" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Annual Rainfall</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'moderate', 'high'] as RainfallLevel[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setRainfallLevel(level)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize",
                            rainfallLevel === level 
                              ? "bg-emerald-600 border-emerald-600 text-white" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Management Level</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['good', 'poor'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setManagementLevel(level)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize",
                            managementLevel === level 
                              ? "bg-emerald-600 border-emerald-600 text-white" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <h3 className="text-emerald-900 font-semibold mb-2 flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              Species Profile
            </h3>
            <p className="text-sm text-emerald-800 leading-relaxed mb-4">
              {selectedSpecies.description}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-medium">Preferred Soil:</span>
                <span className="text-emerald-900 font-bold capitalize">{selectedSpecies.preferences.soil.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-medium">Preferred Rainfall:</span>
                <span className="text-emerald-900 font-bold capitalize">{selectedSpecies.preferences.rainfall}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-medium">Root:Shoot Ratio:</span>
                <span className="text-emerald-900 font-bold capitalize">{selectedSpecies.rootShootRatio}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-medium">Resilience Score:</span>
                <span className="text-emerald-900 font-bold">{selectedSpecies.resilienceScore}/100</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-medium">Pest Resistance:</span>
                <span className="text-emerald-900 font-bold">{selectedSpecies.pestResistance}/100</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-emerald-200/50">
                <span className="text-emerald-600 font-medium">Environmental Match:</span>
                <span className={cn(
                  "font-bold",
                  getEnvMultiplier(selectedSpecies) > 0.9 ? "text-emerald-600" : 
                  getEnvMultiplier(selectedSpecies) > 0.6 ? "text-orange-600" : "text-red-600"
                )}>
                  {(getEnvMultiplier(selectedSpecies) * 100).toFixed(0)}% Efficiency
                </span>
              </div>
              {selectedSpeciesIds.length > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-medium">Biodiversity Synergy:</span>
                  <span className="text-emerald-900 font-bold">+{((synergyFactor - 1) * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-white/50 p-3 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Growth Rate</p>
                <p className="text-lg font-bold text-emerald-900">{(selectedSpecies.growthRate * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-white/50 p-3 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Survival</p>
                <p className="text-lg font-bold text-emerald-900">{(selectedSpecies.survivalRate * 100).toFixed(0)}%</p>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Wind className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">Total CO₂ Stored</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{totalSequestered} <span className="text-sm font-normal text-slate-500">Metric Tons</span></p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">Car Miles Offset</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{carMilesEquivalent} <span className="text-sm font-normal text-slate-500">Miles</span></p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">Projected Survival</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{simulationData[simulationData.length - 1].survivalCount} <span className="text-sm font-normal text-slate-500">Trees</span></p>
            </motion.div>
          </div>

          {/* Chart Section */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isComparisonMode 
                    ? `Species Comparison: ${activeMetric === 'co2' ? 'CO₂ Sequestration' : 'Biomass Growth'}` 
                    : `${activeMetric === 'co2' ? 'Sequestration Timeline' : 'Biomass Growth Curve'}`}
                </h2>
                <p className="text-sm text-slate-500">
                  {isComparisonMode 
                    ? `Comparing ${selectedSpeciesList.length} species over ${years} years`
                    : `Projected ${activeMetric === 'co2' ? 'cumulative CO₂ capture' : 'tree biomass growth'} over ${years} years`}
                </p>
              </div>
              
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveMetric('co2')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeMetric === 'co2' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  CO₂ Impact
                </button>
                <button
                  onClick={() => setActiveMetric('biomass')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeMetric === 'biomass' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Biomass
                </button>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {isComparisonMode ? (
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      label={{ 
                        value: activeMetric === 'co2' ? 'CO₂ (Metric Tons)' : 'Biomass (kg)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        fill: '#94a3b8', 
                        fontSize: 10 
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    {selectedSpeciesList.map((species, index) => (
                      <Line 
                        key={species.id}
                        type="monotone" 
                        dataKey={activeMetric === 'co2' ? `co2_${species.id}` : `biomass_${species.id}`} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={3}
                        dot={false}
                        name={species.name}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={simulationData}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeMetric === 'co2' ? "#10b981" : "#3b82f6"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={activeMetric === 'co2' ? "#10b981" : "#3b82f6"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      label={{ value: 'Years After Planting', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      label={{ 
                        value: activeMetric === 'co2' ? 'CO₂ (Metric Tons)' : 'Biomass (kg)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        fill: '#94a3b8', 
                        fontSize: 10 
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={activeMetric === 'co2' ? "co2Sequestered" : "biomass"} 
                      stroke={activeMetric === 'co2' ? "#10b981" : "#3b82f6"} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMetric)" 
                      name={activeMetric === 'co2' ? "Cumulative CO₂" : "Tree Biomass"}
                    />
                    {activeMetric === 'co2' && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="co2High"
                          stroke="none"
                          fill="#10b981"
                          fillOpacity={0.1}
                          name="Upper Bound"
                        />
                        <Area
                          type="monotone"
                          dataKey="co2Low"
                          stroke="none"
                          fill="#f8fafc"
                          fillOpacity={1}
                          name="Lower Bound"
                        />
                      </>
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          {/* Growth Comparison */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                {isComparisonMode ? "Biomass Comparison" : "Biomass Accumulation"}
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={isComparisonMode ? comparisonData : simulationData}>
                    <XAxis dataKey="year" hide />
                    <YAxis hide />
                    <Tooltip />
                    {isComparisonMode ? (
                      selectedSpeciesList.map((species, index) => (
                        <Line 
                          key={species.id}
                          type="monotone" 
                          dataKey={`biomass_${species.id}`} 
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={2} 
                          dot={false} 
                          name={species.name}
                        />
                      ))
                    ) : (
                      <Line 
                        type="monotone" 
                        dataKey="biomass" 
                        stroke="#059669" 
                        strokeWidth={2} 
                        dot={false} 
                        name="Avg. Biomass (kg)"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2">Average dry biomass per tree in kilograms.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {isComparisonMode ? "Survival Comparison" : "Survival Curve"}
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={isComparisonMode ? comparisonData : simulationData}>
                    <XAxis dataKey="year" hide />
                    <YAxis hide />
                    <Tooltip />
                    {isComparisonMode ? (
                      selectedSpeciesList.map((species, index) => (
                        <Line 
                          key={species.id}
                          type="monotone" 
                          dataKey={`survival_${species.id}`} 
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={2} 
                          dot={false} 
                          name={species.name}
                        />
                      ))
                    ) : (
                      <Line 
                        type="monotone" 
                        dataKey="survivalCount" 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                        dot={false} 
                        name="Live Trees"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2">Projected population decline based on regional survival rates.</p>
            </div>
          </section>
          {/* Environmental Impact Visualization */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Wind className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Environmental Multiplier Breakdown</h2>
                <p className="text-sm text-slate-500">How current site conditions impact growth potential per species</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={environmentalImpactData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value}% Efficiency`, '']}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
                      {environmentalImpactData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.total > 90 ? '#10b981' : entry.total > 70 ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Efficiency Factors</h3>
                <div className="space-y-3">
                  {environmentalImpactData.map((data) => (
                    <div key={data.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-slate-900">{data.name}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          data.total > 90 ? "bg-emerald-100 text-emerald-700" : 
                          data.total > 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {data.total}% Match
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Soil</p>
                          <p className="text-sm font-bold text-slate-700">{data.soil}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Rain</p>
                          <p className="text-sm font-bold text-slate-700">{data.rainfall}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Mgmt</p>
                          <p className="text-sm font-bold text-slate-700">{data.management}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Growth</p>
                          <p className="text-sm font-bold text-emerald-600">x{(data.total / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Policy Brief Modal */}
      <AnimatePresence>
        {isBriefOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBriefOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-emerald-900 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">Policy Brief: Afforestation Impact</h2>
                    <p className="text-emerald-200/70">Strategic Recommendations for Land-Use Planning</p>
                  </div>
                  <button 
                    onClick={() => setIsBriefOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 rotate-90" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Executive Summary
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Planting {treeCount.toLocaleString()} {selectedSpeciesList.length > 1 ? "mixed species" : selectedSpeciesList[0]?.name || "trees"} is projected to sequester 
                    approximately <span className="font-bold text-emerald-700">{totalSequestered} metric tons of CO₂</span> over 
                    the next {years} years. This includes an estimated <span className="font-bold text-emerald-700">20-40% belowground biomass</span> (roots) and accounts for 
                    {managementLevel === 'good' ? ' optimal management' : ' standard management'} survival rates.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Biodiversity Impact</h4>
                    <p className="text-sm font-medium text-slate-800">
                      {selectedSpeciesList.length > 1 
                        ? `Mixed planting yields a ${((synergyFactor - 1) * 100).toFixed(0)}% increase in carbon stocks compared to monocultures.` 
                        : "Monoculture planting. Consider diversifying to boost resilience and carbon uptake by up to 70%."}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Environmental Match</h4>
                    <p className="text-sm font-medium text-slate-800">
                      {getEnvMultiplier(selectedSpeciesList[0] || TREE_SPECIES[0]) > 0.9 
                        ? "Optimal site-species matching. Growth is at peak potential." 
                        : "Suboptimal conditions detected. Matching species to local soil/rainfall could improve growth by 20-50%."}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Species Resilience & Pest Resistance</h4>
                    <p className="text-sm font-medium text-slate-800">
                      {selectedSpeciesList.length === 1 
                        ? `The selected species has a resilience score of ${selectedSpecies.resilienceScore}/100 and a pest resistance of ${selectedSpecies.pestResistance}/100, indicating its ability to withstand environmental stressors and local biological threats.`
                        : "The selected species mix provides a diversified resilience and pest resistance profile, reducing the risk of total project failure due to species-specific pests or climate events."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Implementation Roadmap
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="font-bold text-emerald-600">01.</span>
                      {managementLevel === 'poor' ? "Upgrade to 'Good' management to increase survival rates by 20%." : "Maintain current management standards for 90%+ survival."}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-emerald-600">02.</span>
                      Site selection based on soil compatibility for {selectedSpeciesList[0]?.scientificName || "target species"}.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-emerald-600">03.</span>
                      Integration into regional carbon credit registries for institutional offsets.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsBriefOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Close
                </button>
                <button 
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-200"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-8 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Leaf className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Sustainability Intelligence Platform</span>
          </div>
          <div className="flex gap-8 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-emerald-600 transition-colors">Methodology</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Data Sources</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

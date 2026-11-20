export type ScenarioKey = "ssp126" | "ssp245" | "ssp585";
export type HorizonKey = "today" | "2030" | "2040" | "2050";
export type DenominatorKey = "revenue_inr_cr" | "gross_block_inr_cr" | "output_mt" | "people";
export type LensKey = "board" | "auditor" | "investor";
export type HazardKey = "heat" | "rain" | "water" | "river" | "coastal";
export type ProvenanceLabel = "Real" | "Modelled" | "Assumption";
export type ScreenKey = "overview" | "plants" | "detail" | "chain" | "method" | "brief";

export interface ThresholdConfig {
  heat_high: number;
  heat_very_high: number;
  rain_high: number;
  rain_very_high: number;
  water_high: number;
  water_very_high: number;
  river_high: number;
  river_very_high: number;
  coastal_high: number;
  coastal_very_high: number;
}

export interface ScenarioHorizonPoint {
  median: number;
  min: number;
  max: number;
  rating: number;
  rating_range: [number, number];
  label: ProvenanceLabel;
  days_45_median?: number;
  days_64_5_median?: number;
  q25_projected_m3s?: number;
}

export interface HazardData {
  applicable: boolean;
  reason?: string;
  metric?: string;
  unit?: string;
  basin?: string;
  decoupled_freshwater?: boolean;
  future_note?: string;
  today?: {
    value: number;
    rating: number;
    label: ProvenanceLabel;
    days_45?: number;
    days_64_5?: number;
    q25_m3s?: number;
    mean_annual_peak_m3s?: number;
    total_1980_2024?: number;
    severe_1980_2024?: number;
    severe_per_decade?: number;
  };
  scenarios?: Record<ScenarioKey, Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>>;
}

export interface PlantRecord {
  id: string;
  name: string;
  town: string;
  state: string;
  lat: number;
  lon: number;
  type: "Integrated" | "Grinding unit" | string;
  water_source: string;
  water_basin: string;
  water_note: string;
  coastal: boolean;
  notes: string;
  cmip6_source_note: string;
  denominators: {
    revenue_inr_cr: number;
    gross_block_inr_cr: number;
    output_mt: number;
    people: number;
    capacity_mtpa: number;
    clinker_produced_mt: number;
    clinker_shipped_mt: number;
    scope1_co2_kt: number;
  };
  hazards: Record<HazardKey, HazardData>;
}

export interface ClinkerFlow {
  id: string;
  from: string;
  to: string;
  commodity: string;
  mt: number;
  mode: string;
  share_of_kiln_clinker_pct: number;
  label: ProvenanceLabel;
}

export interface AssumptionItem {
  id: string;
  text: string;
  value: string;
  owner: string;
  status: "Accepted" | "Proposed" | "Verified" | string;
}

export interface LedgerResults {
  meta: {
    run_id: string;
    generated_at: string;
    method_version: string;
    company: string;
    fiscal_year: string;
    scope: string;
    windows: Record<HorizonKey, string>;
    models: string[];
    default_thresholds: ThresholdConfig;
  };
  plants: PlantRecord[];
  flows: ClinkerFlow[];
  assumptions: AssumptionItem[];
}

export interface ProvenanceSource {
  id: string;
  name: string;
  version: string;
  resolution: string;
  retrieved_at: string;
  url: string;
  used_for: string;
  label: ProvenanceLabel;
  notes: string;
}

export interface ProvenanceData {
  run_id: string;
  retrieved_at: string;
  method_version: string;
  sources: ProvenanceSource[];
}

export interface EvaluatedHazard {
  applicable: boolean;
  reason?: string;
  value: number;
  min: number;
  max: number;
  rating: number;
  ratingRange: [number, number];
  ownHigh: boolean;
  upstreamHigh: boolean;
  upstreamSourceIds: string[];
  networkHigh: boolean;
  label: ProvenanceLabel;
  unit: string;
  decoupledFreshwater?: boolean;
}

export interface EvaluatedPlant {
  plant: PlantRecord;
  hazards: Record<HazardKey, EvaluatedHazard>;
  anyOwnHigh: boolean;
  anyNetworkHigh: boolean;
  inheritedOnly: boolean;
  maxRating: number;
  highHazardKeys: HazardKey[];
  inheritedHazardKeys: HazardKey[];
  revenueRank: number;
  grossBlockRank: number;
  rankFlip: number; // grossBlockRank - revenueRank (positive means higher importance under Revenue)
}

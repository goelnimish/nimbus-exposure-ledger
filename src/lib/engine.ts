import rawResults from "@/data/results.json";
import rawProvenance from "@/data/provenance.json";
import type {
  DenominatorKey,
  EvaluatedHazard,
  EvaluatedPlant,
  HazardKey,
  HorizonKey,
  LedgerResults,
  PlantRecord,
  ProvenanceData,
  ScenarioKey,
  ThresholdConfig,
} from "./types";

export const defaultLedgerData = rawResults as unknown as LedgerResults;
export const defaultProvenanceData = rawProvenance as unknown as ProvenanceData;

// Backward-compatible aliases for default static snapshot
export const ledgerData = defaultLedgerData;
export const provenanceData = defaultProvenanceData;

export const SCENARIO_META: Record<
  ScenarioKey,
  { short: string; label: string; description: string }
> = {
  ssp126: {
    short: "Low (SSP1-2.6)",
    label: "Low Emissions (SSP1-2.6)",
    description: "Strong mitigation pathway (~1.8°C by 2100)",
  },
  ssp245: {
    short: "Moderate (SSP2-4.5)",
    label: "Moderate Emissions (SSP2-4.5)",
    description: "Current-policy middle pathway (~2.7°C by 2100)",
  },
  ssp585: {
    short: "High (SSP5-8.5)",
    label: "High Emissions (SSP5-8.5)",
    description: "Unmitigated fossil-intensive pathway (~4.4°C by 2100)",
  },
};

export const HORIZON_META: Record<HorizonKey, { label: string; window: string }> = {
  today: { label: "Today", window: defaultLedgerData.meta.windows.today },
  "2030": { label: "2030", window: defaultLedgerData.meta.windows["2030"] },
  "2040": { label: "2040", window: defaultLedgerData.meta.windows["2040"] },
  "2050": { label: "2050", window: defaultLedgerData.meta.windows["2050"] },
};

export const DENOMINATOR_META: Record<
  DenominatorKey,
  { label: string; short: string; unit: string; format: (v: number) => string }
> = {
  revenue_inr_cr: {
    label: "Revenue (₹ cr)",
    short: "Revenue",
    unit: "₹ cr",
    format: (v) => `₹${Math.round(v).toLocaleString("en-IN")} cr`,
  },
  gross_block_inr_cr: {
    label: "Gross Block (₹ cr)",
    short: "Gross Block",
    unit: "₹ cr",
    format: (v) => `₹${Math.round(v).toLocaleString("en-IN")} cr`,
  },
  output_mt: {
    label: "Cement Output (Mt)",
    short: "Output",
    unit: "Mt",
    format: (v) => `${v.toFixed(2)} Mt`,
  },
  people: {
    label: "Workforce (People)",
    short: "People",
    unit: "people",
    format: (v) => `${Math.round(v).toLocaleString("en-IN")} people`,
  },
};

export const HAZARD_META: Record<
  HazardKey,
  { name: string; short: string; metricLabel: string; source: string }
> = {
  heat: {
    name: "Extreme Heat",
    short: "Heat",
    metricLabel: "Days/yr ≥ 40°C",
    source: "Open-Meteo ERA5 + CMIP6 HighResMIP",
  },
  rain: {
    name: "Extreme Rain & Pluvial Flood",
    short: "Extreme Rain",
    metricLabel: "Annual max 1-day rain (Rx1day)",
    source: "Open-Meteo ERA5 + CMIP6 HighResMIP",
  },
  water: {
    name: "Water Stress",
    short: "Water Stress",
    metricLabel: "Basin Water Stress (0–5)",
    source: "WRI Aqueduct 4.0 (qualified by intake)",
  },
  river: {
    name: "Riverine Flood",
    short: "River Flood",
    metricLabel: "1-in-25-yr discharge ratio",
    source: "Open-Meteo Flood API (GloFAS v4)",
  },
  coastal: {
    name: "Coastal Storms",
    short: "Coastal Storm",
    metricLabel: "Cyclone tracks/decade (≤200 km)",
    source: "NOAA IBTrACS v04r01 (1980–2024)",
  },
};

export const RATING_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very High",
};

export function computeRating(
  hazard: HazardKey,
  value: number,
  thresholds: ThresholdConfig
): number {
  switch (hazard) {
    case "heat":
      if (value < 2) return 1;
      if (value < 10) return 2;
      if (value < thresholds.heat_high) return 3;
      if (value < thresholds.heat_very_high) return 4;
      return 5;
    case "rain":
      if (value < 45) return 1;
      if (value < 64.5) return 2;
      if (value < thresholds.rain_high) return 3;
      if (value < thresholds.rain_very_high) return 4;
      return 5;
    case "water":
      if (value < 1.0) return 1;
      if (value < 2.0) return 2;
      if (value < thresholds.water_high) return 3;
      if (value < thresholds.water_very_high) return 4;
      return 5;
    case "river":
      if (value < 1.0) return 1;
      if (value < 1.03) return 2;
      if (value < thresholds.river_high) return 3;
      if (value < thresholds.river_very_high) return 4;
      return 5;
    case "coastal":
      if (value < 1.0) return 1;
      if (value < 2.5) return 2;
      if (value < thresholds.coastal_high) return 3;
      if (value < thresholds.coastal_very_high) return 4;
      return 5;
  }
}

export function getGroupTotals(data: LedgerResults = defaultLedgerData) {
  const plants = data.plants;
  return {
    revenue_inr_cr: plants.reduce((s, p) => s + p.denominators.revenue_inr_cr, 0),
    gross_block_inr_cr: plants.reduce((s, p) => s + p.denominators.gross_block_inr_cr, 0),
    output_mt: Number(plants.reduce((s, p) => s + p.denominators.output_mt, 0).toFixed(2)),
    people: plants.reduce((s, p) => s + p.denominators.people, 0),
    capacity_mtpa: Number(plants.reduce((s, p) => s + p.denominators.capacity_mtpa, 0).toFixed(1)),
    scope1_co2_kt: plants.reduce((s, p) => s + p.denominators.scope1_co2_kt, 0),
  };
}

export function getDenominatorValue(plant: PlantRecord, key: DenominatorKey): number {
  return plant.denominators[key];
}

export function evaluatePortfolio(
  scenario: ScenarioKey,
  horizon: HorizonKey,
  thresholds: ThresholdConfig = defaultLedgerData.meta.default_thresholds,
  data: LedgerResults = defaultLedgerData
): EvaluatedPlant[] {
  const plants = data.plants;
  const flows = data.flows;
  const hazardKeys: HazardKey[] = ["heat", "rain", "water", "river", "coastal"];

  const revSorted = [...plants].sort(
    (a, b) => b.denominators.revenue_inr_cr - a.denominators.revenue_inr_cr
  );
  const gbSorted = [...plants].sort(
    (a, b) => b.denominators.gross_block_inr_cr - a.denominators.gross_block_inr_cr
  );
  const revRankMap = new Map(revSorted.map((p, idx) => [p.id, idx + 1]));
  const gbRankMap = new Map(gbSorted.map((p, idx) => [p.id, idx + 1]));

  const ownMap = new Map<string, Record<HazardKey, EvaluatedHazard>>();

  for (const plant of plants) {
    const hRec = {} as Record<HazardKey, EvaluatedHazard>;
    for (const hk of hazardKeys) {
      const h = plant.hazards[hk];
      if (!h || !h.applicable) {
        hRec[hk] = {
          applicable: false,
          reason: h?.reason ?? "Not applicable",
          value: 0,
          min: 0,
          max: 0,
          rating: 0,
          ratingRange: [0, 0],
          ownHigh: false,
          upstreamHigh: false,
          upstreamSourceIds: [],
          networkHigh: false,
          label: "Real",
          unit: "",
        };
        continue;
      }

      let value = 0;
      let min = 0;
      let max = 0;
      let label = h.today?.label ?? "Real";
      if (horizon === "today") {
        value = h.today?.value ?? 0;
        min = value;
        max = value;
        label = h.today?.label ?? "Real";
      } else {
        const pt = h.scenarios?.[scenario]?.[horizon];
        value = pt?.median ?? 0;
        min = pt?.min ?? value;
        max = pt?.max ?? value;
        label = pt?.label ?? "Modelled";
      }

      const rating =
        hk === "river" && horizon === "today"
          ? h.today?.rating ?? 2
          : computeRating(hk, value, thresholds);
      const minRating =
        hk === "river" && horizon === "today"
          ? rating
          : computeRating(hk, min, thresholds);
      const maxRating =
        hk === "river" && horizon === "today"
          ? rating
          : computeRating(hk, max, thresholds);

      const decoupled = hk === "water" && Boolean(h.decoupled_freshwater);
      const ownHigh = !decoupled && rating >= 4;

      hRec[hk] = {
        applicable: true,
        value,
        min,
        max,
        rating,
        ratingRange: [Math.min(minRating, maxRating), Math.max(minRating, maxRating)],
        ownHigh,
        upstreamHigh: false,
        upstreamSourceIds: [],
        networkHigh: ownHigh,
        label,
        unit: h.unit ?? "",
        decoupledFreshwater: decoupled,
      };
    }
    ownMap.set(plant.id, hRec);
  }

  // Pass 2: Network propagation via flows (Union rule — each plant counted once per hazard)
  for (const plant of plants) {
    const incoming = flows.filter((f) => f.to === plant.id);
    if (incoming.length === 0) continue;
    const targetH = ownMap.get(plant.id)!;
    for (const hk of hazardKeys) {
      const upstreamSources: string[] = [];
      for (const f of incoming) {
        const srcH = ownMap.get(f.from)?.[hk];
        if (srcH?.ownHigh) {
          upstreamSources.push(f.from);
        }
      }
      if (upstreamSources.length > 0) {
        targetH[hk].upstreamHigh = true;
        targetH[hk].upstreamSourceIds = upstreamSources;
        targetH[hk].networkHigh = true;
      }
    }
  }

  return plants.map((plant) => {
    const hazards = ownMap.get(plant.id)!;
    const highHazardKeys = hazardKeys.filter((hk) => hazards[hk].ownHigh);
    const inheritedHazardKeys = hazardKeys.filter(
      (hk) => !hazards[hk].ownHigh && hazards[hk].upstreamHigh
    );
    const anyOwnHigh = highHazardKeys.length > 0;
    const anyNetworkHigh = hazardKeys.some((hk) => hazards[hk].networkHigh);
    const maxRating = Math.max(
      ...hazardKeys
        .filter((hk) => hazards[hk].applicable && !hazards[hk].decoupledFreshwater)
        .map((hk) => hazards[hk].rating),
      1
    );
    const revenueRank = revRankMap.get(plant.id) ?? plants.length;
    const grossBlockRank = gbRankMap.get(plant.id) ?? plants.length;

    return {
      plant,
      hazards,
      anyOwnHigh,
      anyNetworkHigh,
      inheritedOnly: !anyOwnHigh && anyNetworkHigh,
      maxRating,
      highHazardKeys,
      inheritedHazardKeys,
      revenueRank,
      grossBlockRank,
      rankFlip: grossBlockRank - revenueRank,
    };
  });
}

export interface HazardExposureSummary {
  hazard: HazardKey;
  ownAmount: number;
  ownSharePct: number;
  networkAmount: number;
  networkSharePct: number;
  networkMinSharePct: number;
  networkMaxSharePct: number;
  ownPlantIds: string[];
  networkPlantIds: string[];
  inheritedPlantIds: string[];
}

export function computeHazardSummary(
  evaluated: EvaluatedPlant[],
  hazard: HazardKey,
  denominator: DenominatorKey,
  data: LedgerResults = defaultLedgerData
): HazardExposureSummary {
  const totals = getGroupTotals(data);
  const totalDenom = totals[denominator] || 1;

  let ownAmount = 0;
  let networkAmount = 0;
  let minAmount = 0;
  let maxAmount = 0;
  const ownPlantIds: string[] = [];
  const networkPlantIds: string[] = [];
  const inheritedPlantIds: string[] = [];

  for (const ep of evaluated) {
    const val = getDenominatorValue(ep.plant, denominator);
    const h = ep.hazards[hazard];
    if (h.ownHigh) {
      ownAmount += val;
      ownPlantIds.push(ep.plant.id);
    }
    if (h.networkHigh) {
      networkAmount += val;
      networkPlantIds.push(ep.plant.id);
      if (!h.ownHigh && h.upstreamHigh) {
        inheritedPlantIds.push(ep.plant.id);
      }
    }

    const incoming = data.flows.filter((f) => f.to === ep.plant.id);
    const ownMinHigh = h.applicable && !h.decoupledFreshwater && h.ratingRange[0] >= 4;
    const ownMaxHigh = h.applicable && !h.decoupledFreshwater && h.ratingRange[1] >= 4;
    const upMinHigh = incoming.some((f) => {
      const src = evaluated.find((x) => x.plant.id === f.from)?.hazards[hazard];
      return Boolean(src && src.applicable && !src.decoupledFreshwater && src.ratingRange[0] >= 4);
    });
    const upMaxHigh = incoming.some((f) => {
      const src = evaluated.find((x) => x.plant.id === f.from)?.hazards[hazard];
      return Boolean(src && src.applicable && !src.decoupledFreshwater && src.ratingRange[1] >= 4);
    });
    if (ownMinHigh || upMinHigh) minAmount += val;
    if (ownMaxHigh || upMaxHigh) maxAmount += val;
  }

  return {
    hazard,
    ownAmount,
    ownSharePct: Number(((ownAmount / totalDenom) * 100).toFixed(1)),
    networkAmount,
    networkSharePct: Number(((networkAmount / totalDenom) * 100).toFixed(1)),
    networkMinSharePct: Number(((minAmount / totalDenom) * 100).toFixed(1)),
    networkMaxSharePct: Number(((maxAmount / totalDenom) * 100).toFixed(1)),
    ownPlantIds,
    networkPlantIds,
    inheritedPlantIds,
  };
}

export function computePortfolioUnionExposure(
  evaluated: EvaluatedPlant[],
  denominator: DenominatorKey,
  data: LedgerResults = defaultLedgerData
) {
  const totals = getGroupTotals(data);
  const totalDenom = totals[denominator] || 1;
  let ownAmount = 0;
  let networkAmount = 0;
  const ownIds: string[] = [];
  const networkIds: string[] = [];

  for (const ep of evaluated) {
    const val = getDenominatorValue(ep.plant, denominator);
    if (ep.anyOwnHigh) {
      ownAmount += val;
      ownIds.push(ep.plant.id);
    }
    if (ep.anyNetworkHigh) {
      networkAmount += val;
      networkIds.push(ep.plant.id);
    }
  }

  return {
    totalDenom,
    ownAmount,
    ownSharePct: Number(((ownAmount / totalDenom) * 100).toFixed(1)),
    networkAmount,
    networkSharePct: Number(((networkAmount / totalDenom) * 100).toFixed(1)),
    ownIds,
    networkIds,
  };
}

export function computeChainStats(
  denominator: DenominatorKey,
  data: LedgerResults = defaultLedgerData
) {
  const totals = getGroupTotals(data);
  const totalDenom = totals[denominator] || 1;

  // Dynamically group chains by supplier kiln (supports both Nimbus P01/P06 and any uploaded flows)
  const supplierIds = Array.from(new Set(data.flows.map((f) => f.from)));
  const p01Supplier = supplierIds[0] ?? "P01";
  const p06Supplier = supplierIds[1] ?? "P06";

  const getChainMemberIds = (supplier: string) => {
    const targets = data.flows.filter((f) => f.from === supplier).map((f) => f.to);
    return Array.from(new Set([supplier, ...targets]));
  };

  const p01Ids = getChainMemberIds(p01Supplier);
  const p06Ids = supplierIds.length > 1 ? getChainMemberIds(p06Supplier) : [];

  const sumFor = (ids: string[]) =>
    data.plants
      .filter((p) => ids.includes(p.id))
      .reduce((s, p) => s + getDenominatorValue(p, denominator), 0);

  const p01Val = sumFor(p01Ids);
  const p06Val = sumFor(p06Ids);
  const allChainIds = Array.from(new Set([...p01Ids, ...p06Ids]));
  const combinedVal = sumFor(allChainIds);

  return {
    p01Chain: {
      ids: p01Ids,
      value: p01Val,
      sharePct: Number(((p01Val / totalDenom) * 100).toFixed(1)),
    },
    p06Chain: {
      ids: p06Ids,
      value: p06Val,
      sharePct: Number(((p06Val / totalDenom) * 100).toFixed(1)),
    },
    combined: {
      value: combinedVal,
      sharePct: Number(((combinedVal / totalDenom) * 100).toFixed(1)),
    },
  };
}

export function computeOutageRevenueInPlay(
  chainIds: string[],
  outageDays: number,
  stockBufferDays: number,
  replacementSharePct: number,
  data: LedgerResults = defaultLedgerData
) {
  const clampedDays = Math.max(0, Math.min(180, outageDays));
  const clampedBuffer = Math.max(0, Math.min(90, stockBufferDays));
  const clampedRepl = Math.max(0, Math.min(100, replacementSharePct)) / 100;

  const effectiveDays = Math.max(0, clampedDays - clampedBuffer);
  const breakdown = data.plants
    .filter((p) => chainIds.includes(p.id))
    .map((p) => {
      const revInPlay = (p.denominators.revenue_inr_cr / 365) * effectiveDays * (1 - clampedRepl);
      return {
        plantId: p.id,
        plantName: p.name,
        type: p.type,
        annualRevenue: p.denominators.revenue_inr_cr,
        revenueInPlay: Number(revInPlay.toFixed(1)),
      };
    });

  const totalRevenueInPlay = Number(
    breakdown.reduce((s, b) => s + b.revenueInPlay, 0).toFixed(1)
  );
  const annualChainRevenue = breakdown.reduce((s, b) => s + b.annualRevenue, 0);

  return {
    effectiveDays,
    annualChainRevenue,
    totalRevenueInPlay,
    breakdown,
  };
}

export function buildDeterministicHeadline(
  scenario: ScenarioKey,
  horizon: HorizonKey,
  denominator: DenominatorKey,
  thresholds: ThresholdConfig,
  data: LedgerResults = defaultLedgerData
) {
  const currentEval = evaluatePortfolio(scenario, horizon, thresholds, data);
  const todayEval = evaluatePortfolio(scenario, "today", thresholds, data);
  const currentUnion = computePortfolioUnionExposure(currentEval, denominator, data);
  const todayUnion = computePortfolioUnionExposure(todayEval, denominator, data);
  const chains = computeChainStats(denominator, data);
  const dMeta = DENOMINATOR_META[denominator];

  const horizonPhrase = horizon === "today" ? "today (2005–2024 baseline)" : `by ${horizon}`;
  const deltaPp = Number((currentUnion.networkSharePct - todayUnion.networkSharePct).toFixed(1));
  const changePhrase =
    horizon === "today"
      ? `with ${currentUnion.ownSharePct}% at own sites and ${currentUnion.networkSharePct}% including upstream kiln dependencies`
      : deltaPp > 0
      ? `up +${deltaPp} pp from ${todayUnion.networkSharePct}% today`
      : deltaPp < 0
      ? `down ${deltaPp} pp from ${todayUnion.networkSharePct}% today`
      : `unchanged from ${todayUnion.networkSharePct}% today`;

  const chainLabel =
    data.flows.length > 0
      ? `The kiln supply chains carry ${chains.combined.sharePct}% of ${dMeta.short.toLowerCase()}.`
      : `All ${data.plants.length} facilities are modelled as standalone sites (no inter-plant flows defined).`;

  return {
    text: `Under the ${SCENARIO_META[scenario].short} scenario, ${currentUnion.networkSharePct}% of ${data.meta.company}'s ${dMeta.short.toLowerCase()} (${dMeta.format(currentUnion.networkAmount)}) sits in plants, or depends on kilns, rated High or Very High for at least one physical climate hazard ${horizonPhrase}, ${changePhrase}. ${chainLabel}`,
    currentUnion,
    todayUnion,
    chains,
  };
}

export function computeChallengeStability(
  horizon: HorizonKey,
  denominator: DenominatorKey,
  activeThresholds: ThresholdConfig,
  data: LedgerResults = defaultLedgerData
) {
  const baseEval = evaluatePortfolio("ssp245", horizon, data.meta.default_thresholds, data);
  const baseShare = computePortfolioUnionExposure(baseEval, denominator, data).networkSharePct;

  const alternatives: { name: string; scenario: ScenarioKey; thresholds: ThresholdConfig }[] = [
    { name: "Low Emissions (SSP1-2.6)", scenario: "ssp126", thresholds: activeThresholds },
    { name: "High Emissions (SSP5-8.5)", scenario: "ssp585", thresholds: activeThresholds },
    {
      name: "Stricter Heat (−20%: ≥24 d)",
      scenario: "ssp245",
      thresholds: { ...activeThresholds, heat_high: Math.round(activeThresholds.heat_high * 0.8) },
    },
    {
      name: "Looser Heat (+20%: ≥36 d)",
      scenario: "ssp245",
      thresholds: { ...activeThresholds, heat_high: Math.min(activeThresholds.heat_very_high - 1, Math.round(activeThresholds.heat_high * 1.2)) },
    },
    {
      name: "Stricter Rain (−15%: ≥81 mm)",
      scenario: "ssp245",
      thresholds: { ...activeThresholds, rain_high: Math.round(activeThresholds.rain_high * 0.85) },
    },
    {
      name: "Looser Water (+0.5: ≥3.5)",
      scenario: "ssp245",
      thresholds: { ...activeThresholds, water_high: Math.min(activeThresholds.water_very_high - 0.1, Number((activeThresholds.water_high + 0.5).toFixed(1))) },
    },
  ];

  const checks = alternatives.map((alt) => {
    const ev = evaluatePortfolio(alt.scenario, horizon, alt.thresholds, data);
    const union = computePortfolioUnionExposure(ev, denominator, data);
    const diff = Math.abs(union.networkSharePct - baseShare);
    const holds = diff <= 12.0 && union.networkSharePct >= 60.0;
    return {
      name: alt.name,
      sharePct: union.networkSharePct,
      diffPp: Number((union.networkSharePct - baseShare).toFixed(1)),
      holds,
    };
  });

  const passedCount = checks.filter((c) => c.holds).length;
  return {
    baseShare,
    passedCount,
    totalCount: checks.length,
    checks,
  };
}

/**
 * Neutralizes spreadsheet formula injection (OUT-005 / SEC-003) and escapes quotes/commas per RFC-4180 (OUT-004).
 */
export function sanitizeCsvField(raw: string | number | boolean): string {
  const str = String(raw ?? "");
  const formulaSafe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function generateAuditCsv(
  scenario: ScenarioKey,
  horizon: HorizonKey,
  thresholds: ThresholdConfig,
  data: LedgerResults = defaultLedgerData
): string {
  const evaluated = evaluatePortfolio(scenario, horizon, thresholds, data);
  const headers = [
    "run_id",
    "method_version",
    "scenario",
    "horizon",
    "plant_id",
    "plant_name",
    "town",
    "state",
    "plant_type",
    "revenue_inr_cr",
    "gross_block_inr_cr",
    "output_mt",
    "employees",
    "water_source",
    "coastal",
    "heat_days_ge40",
    "heat_rating",
    "heat_provenance",
    "rain_rx1day_mm",
    "rain_rating",
    "rain_provenance",
    "water_bws_0_5",
    "water_rating",
    "water_decoupled_freshwater",
    "river_q25_ratio",
    "river_rating",
    "coastal_storms_per_decade",
    "coastal_rating",
    "any_own_high_exposure",
    "any_network_high_exposure",
    "inherited_hazards",
  ];

  const rows = evaluated.map((ep) => {
    const p = ep.plant;
    const h = ep.hazards;
    const cells: (string | number)[] = [
      data.meta.run_id,
      data.meta.method_version,
      scenario,
      horizon,
      p.id,
      p.name,
      p.town,
      p.state,
      p.type,
      p.denominators.revenue_inr_cr,
      p.denominators.gross_block_inr_cr,
      p.denominators.output_mt,
      p.denominators.people,
      p.water_source,
      p.coastal ? "Y" : "N",
      h.heat.value,
      h.heat.rating,
      h.heat.label,
      h.rain.value,
      h.rain.rating,
      h.rain.label,
      h.water.value,
      h.water.rating,
      h.water.decoupledFreshwater ? "Y" : "N",
      h.river.applicable ? h.river.value : "N/A",
      h.river.applicable ? h.river.rating : "N/A",
      h.coastal.applicable ? h.coastal.value : "N/A",
      h.coastal.applicable ? h.coastal.rating : "N/A",
      ep.anyOwnHigh ? "Y" : "N",
      ep.anyNetworkHigh ? "Y" : "N",
      ep.inheritedHazardKeys.join("; "),
    ];
    return cells.map(sanitizeCsvField).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

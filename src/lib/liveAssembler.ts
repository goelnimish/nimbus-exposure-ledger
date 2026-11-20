import type { ValidatedFacilityRow } from "./csvValidator";
import { computeRating, defaultLedgerData, defaultProvenanceData } from "./engine";
import type {
  HazardData,
  LedgerResults,
  PlantRecord,
  ProvenanceData,
  ScenarioHorizonPoint,
  ScenarioKey,
} from "./types";

export const LIVE_CMIP6_MODELS = ["EC_Earth3P_HR", "MRI_AGCM3_2_S", "MPI_ESM1_2_XR"];

export const SCENARIO_SCALE: Record<ScenarioKey, Record<"2030" | "2040" | "2050", number>> = {
  ssp126: { "2030": 0.82, "2040": 0.65, "2050": 0.52 },
  ssp245: { "2030": 0.91, "2040": 0.80, "2050": 0.72 },
  ssp585: { "2030": 1.0, "2040": 1.0, "2050": 1.0 },
};

export interface WinStats {
  days_40: number;
  days_45: number;
  rx1day: number;
  days_rain_64_5: number;
}

export type DeltaBucket = Record<
  "2030" | "2040" | "2050",
  { d40: number[]; d45: number[]; drx: number[]; d64: number[] }
>;

export function calcWindowStats(
  dates: string[],
  tmax: (number | null)[],
  rain: (number | null)[],
  sy: number,
  ey: number
): WinStats | null {
  const y40 = new Map<number, number>();
  const y45 = new Map<number, number>();
  const yRx = new Map<number, number>();
  const y64 = new Map<number, number>();
  for (let i = 0; i < dates.length; i++) {
    const yr = Number(dates[i].slice(0, 4));
    if (yr < sy || yr > ey) continue;
    const t = tmax[i];
    const r = rain[i];
    if (t != null) {
      y40.set(yr, (y40.get(yr) ?? 0) + (t >= 40 ? 1 : 0));
      y45.set(yr, (y45.get(yr) ?? 0) + (t >= 45 ? 1 : 0));
    }
    if (r != null) {
      yRx.set(yr, Math.max(yRx.get(yr) ?? 0, r));
      y64.set(yr, (y64.get(yr) ?? 0) + (r >= 64.5 ? 1 : 0));
    }
  }
  const n = y40.size;
  if (!n) return null;
  const mean = (m: Map<number, number>) => Array.from(m.values()).reduce((a, b) => a + b, 0) / n;
  return {
    days_40: Number(mean(y40).toFixed(1)),
    days_45: Number(mean(y45).toFixed(1)),
    rx1day: Number(mean(yRx).toFixed(1)),
    days_rain_64_5: Number(mean(y64).toFixed(2)),
  };
}

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function buildDefaultCsvFromSnapshot(): string {
  const header =
    "plant_id,plant_name,town,state,latitude,longitude,plant_type,cement_capacity_mtpa,cement_output_fy2025_26_mt,clinker_produced_fy2025_26_mt,clinker_shipped_fy2025_26_mt,scope1_co2_fy2025_26_kt,water_source,coastal,asset_value_inr_cr,revenue_fy2025_26_inr_cr,employees,notes";
  const rows = defaultLedgerData.plants.map((p) =>
    [
      p.id, `"${p.name}"`, p.town, p.state, p.lat, p.lon, p.type,
      p.denominators.capacity_mtpa, p.denominators.output_mt, p.denominators.clinker_produced_mt,
      p.denominators.clinker_shipped_mt, p.denominators.scope1_co2_kt, `"${p.water_source}"`,
      p.coastal ? "Y" : "N", p.denominators.gross_block_inr_cr, p.denominators.revenue_inr_cr,
      p.denominators.people, `"${p.notes.replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function assembleLiveRun(params: {
  runId: string;
  nowIso: string;
  companyName: string;
  facilities: ValidatedFacilityRow[];
  flows: LedgerResults["flows"];
  obsByPid: Map<string, WinStats>;
  cmipByPid: Map<string, DeltaBucket>;
  floodByPid: Map<string, { q25: number; meanPeak: number }>;
}): { results: LedgerResults; provenance: ProvenanceData } {
  const { runId, nowIso, companyName, facilities, flows, obsByPid, cmipByPid, floodByPid } = params;
  const thresholds = defaultLedgerData.meta.default_thresholds;
  const snapById = new Map(defaultLedgerData.plants.map((p) => [p.id, p]));

  const plantsOut: PlantRecord[] = facilities.map((fac) => {
    const snap = snapById.get(fac.plant_id);
    const obs =
      obsByPid.get(fac.plant_id) ??
      (snap
        ? {
            days_40: snap.hazards.heat.today?.value ?? 0,
            days_45: snap.hazards.heat.today?.days_45 ?? 0,
            rx1day: snap.hazards.rain.today?.value ?? 0,
            days_rain_64_5: snap.hazards.rain.today?.days_64_5 ?? 0,
          }
        : null);
    const deltas = cmipByPid.get(fac.plant_id);

    let heatHazard: HazardData;
    let rainHazard: HazardData;

    if (obs && deltas) {
      const hS = {} as Record<ScenarioKey, Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>>;
      const rS = {} as Record<ScenarioKey, Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>>;
      for (const sc of ["ssp126", "ssp245", "ssp585"] as ScenarioKey[]) {
        hS[sc] = {} as Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>;
        rS[sc] = {} as Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>;
        for (const w of ["2030", "2040", "2050"] as const) {
          const sf = SCENARIO_SCALE[sc][w];
          const v40 = deltas[w].d40.map((d) => Math.max(0, Number((obs.days_40 + d * sf).toFixed(1))));
          const v45 = deltas[w].d45.map((d) => Math.max(0, Number((obs.days_45 + d * sf).toFixed(1))));
          const m40 = Number(median(v40).toFixed(1));
          hS[sc][w] = {
            median: m40,
            min: Math.min(...v40),
            max: Math.max(...v40),
            days_45_median: Number(median(v45).toFixed(1)),
            rating: computeRating("heat", m40, thresholds),
            rating_range: [
              computeRating("heat", Math.min(...v40), thresholds),
              computeRating("heat", Math.max(...v40), thresholds),
            ],
            label: "Modelled",
          };
          const vrx = deltas[w].drx.map((d) => Math.max(5, Number((obs.rx1day + d * sf).toFixed(1))));
          const v64 = deltas[w].d64.map((d) => Math.max(0, Number((obs.days_rain_64_5 + d * sf).toFixed(2))));
          const mrx = Number(median(vrx).toFixed(1));
          rS[sc][w] = {
            median: mrx,
            min: Math.min(...vrx),
            max: Math.max(...vrx),
            days_64_5_median: Number(median(v64).toFixed(2)),
            rating: computeRating("rain", mrx, thresholds),
            rating_range: [
              computeRating("rain", Math.min(...vrx), thresholds),
              computeRating("rain", Math.max(...vrx), thresholds),
            ],
            label: "Modelled",
          };
        }
      }
      heatHazard = {
        applicable: true,
        metric: "days_tmax_ge_40",
        unit: "days/yr",
        today: { value: obs.days_40, days_45: obs.days_45, rating: computeRating("heat", obs.days_40, thresholds), label: "Real" },
        scenarios: hS,
      };
      rainHazard = {
        applicable: true,
        metric: "rx1day_mm",
        unit: "mm/day",
        today: { value: obs.rx1day, days_64_5: obs.days_rain_64_5, rating: computeRating("rain", obs.rx1day, thresholds), label: "Real" },
        scenarios: rS,
      };
    } else if (snap) {
      heatHazard = snap.hazards.heat;
      rainHazard = snap.hazards.rain;
    } else {
      heatHazard = { applicable: false, reason: "Open-Meteo Climate API unavailable during live pull." };
      rainHazard = { applicable: false, reason: "Open-Meteo Climate API unavailable during live pull." };
    }

    const fl = floodByPid.get(fac.plant_id);
    let riverHazard: HazardData;
    if (/river|canal/i.test(fac.water_source) && fl && rainHazard.applicable && rainHazard.today && rainHazard.scenarios) {
      const rScen = {} as Record<ScenarioKey, Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>>;
      const bRx = Math.max(rainHazard.today.value, 1);
      for (const sc of ["ssp126", "ssp245", "ssp585"] as ScenarioKey[]) {
        rScen[sc] = {} as Record<"2030" | "2040" | "2050", ScenarioHorizonPoint>;
        for (const w of ["2030", "2040", "2050"] as const) {
          const pt = rainHazard.scenarios[sc][w];
          const rm = Number(Math.max(0.95, pt.median / bRx).toFixed(2));
          const rlo = Number(Math.max(0.9, pt.min / bRx).toFixed(2));
          const rhi = Number(Math.max(1.0, pt.max / bRx).toFixed(2));
          rScen[sc][w] = {
            median: rm,
            min: rlo,
            max: rhi,
            q25_projected_m3s: Number((fl.q25 * rm).toFixed(1)),
            rating: computeRating("river", rm, thresholds),
            rating_range: [computeRating("river", rlo, thresholds), computeRating("river", rhi, thresholds)],
            label: "Modelled",
          };
        }
      }
      riverHazard = {
        applicable: true,
        metric: "q25_discharge_ratio",
        unit: "ratio vs baseline",
        today: { value: 1.0, q25_m3s: fl.q25, mean_annual_peak_m3s: fl.meanPeak, rating: fl.q25 < 150 ? 2 : 3, label: "Real" },
        scenarios: rScen,
      };
    } else if (snap?.hazards.river.applicable && /river|canal/i.test(fac.water_source)) {
      riverHazard = snap.hazards.river;
    } else {
      riverHazard = { applicable: false, reason: `Not on a major river/canal intake (${fac.water_source}).` };
    }

    const isDesal = /desalinat/i.test(fac.water_source);
    const waterHazard: HazardData = snap
      ? { ...snap.hazards.water, decoupled_freshwater: isDesal }
      : { applicable: false, reason: "Custom coordinate requires WRI Aqueduct 4.0 spatial basin lookup." };
    const coastalHazard: HazardData = fac.coastal
      ? snap?.hazards.coastal.applicable
        ? snap.hazards.coastal
        : { applicable: false, reason: "Coastal site requires NOAA IBTrACS 200 km track lookup." }
      : { applicable: false, reason: "Inland plant (coastal = N)." };

    return {
      id: fac.plant_id,
      name: fac.plant_name,
      town: fac.town,
      state: fac.state,
      lat: fac.lat,
      lon: fac.lon,
      type: fac.plant_type,
      water_source: fac.water_source,
      water_basin: snap?.water_basin ?? `${fac.state} Basin`,
      water_note: isDesal ? "Uses desalinated seawater — freshwater basin stress decoupled." : snap?.water_note ?? `Intake: ${fac.water_source}.`,
      coastal: fac.coastal,
      notes: fac.notes,
      cmip6_source_note: deltas
        ? `Live Open-Meteo CMIP6 (${LIVE_CMIP6_MODELS.length}-model ensemble pulled ${nowIso})`
        : snap?.cmip6_source_note ?? "Unavailable",
      denominators: {
        revenue_inr_cr: fac.revenue_fy2025_26_inr_cr,
        gross_block_inr_cr: fac.asset_value_inr_cr,
        output_mt: fac.cement_output_fy2025_26_mt,
        people: fac.employees,
        capacity_mtpa: fac.cement_capacity_mtpa,
        clinker_produced_mt: fac.clinker_produced_fy2025_26_mt,
        clinker_shipped_mt: fac.clinker_shipped_fy2025_26_mt,
        scope1_co2_kt: fac.scope1_co2_fy2025_26_kt,
      },
      hazards: { heat: heatHazard, rain: rainHazard, water: waterHazard, river: riverHazard, coastal: coastalHazard },
    };
  });

  const results: LedgerResults = {
    meta: { ...defaultLedgerData.meta, run_id: runId, generated_at: nowIso, company: companyName, models: LIVE_CMIP6_MODELS },
    plants: plantsOut,
    flows,
    assumptions: defaultLedgerData.assumptions,
  };
  const provenance: ProvenanceData = {
    run_id: runId,
    retrieved_at: nowIso,
    method_version: defaultProvenanceData.method_version,
    sources: defaultProvenanceData.sources.map((s) => ({
      ...s,
      retrieved_at: s.id.startsWith("open_meteo") ? nowIso : s.retrieved_at,
    })),
  };
  return { results, provenance };
}

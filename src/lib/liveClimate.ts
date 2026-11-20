import { validateFacilitiesAndFlows } from "./csvValidator";
import {
  assembleLiveRun,
  buildDefaultCsvFromSnapshot,
  calcWindowStats,
  LIVE_CMIP6_MODELS,
  type DeltaBucket,
  type WinStats,
} from "./liveAssembler";

const cache = new Map<string, { data: unknown; at: number }>();

async function getJson(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 3600_000) return hit.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(url, { data, at: Date.now() });
    return data;
  }
  throw new Error("Open-Meteo rate limit exceeded");
}

export async function runLiveClimateIngestion(input: {
  mode?: "refresh_default" | "upload";
  facilitiesCsv?: string;
  flowsCsv?: string;
  companyName?: string;
}) {
  const csv = input.mode === "refresh_default" ? buildDefaultCsvFromSnapshot() : String(input.facilitiesCsv ?? "");
  const companyName = String(input.companyName ?? "Nimbus Cement Ltd").trim() || "Nimbus Cement Ltd";
  const validated = validateFacilitiesAndFlows(csv, input.flowsCsv);
  if (!validated.valid) return { valid: false as const, status: 400, errors: validated.errors };

  const facilities = validated.facilities;
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const runId = `NIM-LIVE-${nowIso.slice(0, 10).replace(/-/g, "")}-${nowIso.slice(11, 19).replace(/:/g, "")}`;
  const warnings: string[] = [];

  const obsByPid = new Map<string, WinStats>();
  try {
    const u = new URL("https://archive-api.open-meteo.com/v1/archive");
    u.searchParams.set("latitude", facilities.map((f) => f.lat).join(","));
    u.searchParams.set("longitude", facilities.map((f) => f.lon).join(","));
    u.searchParams.set("start_date", "2005-01-01");
    u.searchParams.set("end_date", "2024-12-31");
    u.searchParams.set("daily", "temperature_2m_max,precipitation_sum");
    u.searchParams.set("timezone", "Asia/Kolkata");
    const raw = await getJson(u.toString());
    const arr = Array.isArray(raw) ? raw : [raw];
    facilities.forEach((fac, idx) => {
      const d = (arr[idx] as { daily?: { time: string[]; temperature_2m_max: (number | null)[]; precipitation_sum: (number | null)[] } })?.daily;
      if (d) {
        const m = calcWindowStats(d.time, d.temperature_2m_max, d.precipitation_sum, 2005, 2024);
        if (m) obsByPid.set(fac.plant_id, m);
      }
    });
  } catch (e) {
    warnings.push(`ERA5 pull partial: ${String(e)}`);
  }

  const cmipByPid = new Map<string, DeltaBucket>();
  let cmipLiveCount = 0;
  for (let i = 0; i < facilities.length; i += 3) {
    const chunk = facilities.slice(i, i + 3);
    try {
      const u = new URL("https://climate-api.open-meteo.com/v1/climate");
      u.searchParams.set("latitude", chunk.map((f) => f.lat).join(","));
      u.searchParams.set("longitude", chunk.map((f) => f.lon).join(","));
      u.searchParams.set("start_date", "2005-01-01");
      u.searchParams.set("end_date", "2050-12-31");
      u.searchParams.set("models", LIVE_CMIP6_MODELS.join(","));
      u.searchParams.set("daily", "temperature_2m_max,precipitation_sum");
      const raw = await getJson(u.toString());
      const arr = Array.isArray(raw) ? raw : [raw];
      chunk.forEach((fac, idx) => {
        const daily = (arr[idx] as { daily?: Record<string, (number | null)[] | string[]> })?.daily;
        if (!daily?.time) return;
        const dates = daily.time as string[];
        const out: DeltaBucket = {
          "2030": { d40: [], d45: [], drx: [], d64: [] },
          "2040": { d40: [], d45: [], drx: [], d64: [] },
          "2050": { d40: [], d45: [], drx: [], d64: [] },
        };
        const wins: Record<"2030" | "2040" | "2050", [number, number]> = { "2030": [2021, 2040], "2040": [2031, 2050], "2050": [2041, 2050] };
        for (const m of LIVE_CMIP6_MODELS) {
          const tA = daily[`temperature_2m_max_${m}`] as (number | null)[] | undefined;
          const rA = daily[`precipitation_sum_${m}`] as (number | null)[] | undefined;
          if (!tA || !rA) continue;
          const b = calcWindowStats(dates, tA, rA, 2005, 2024);
          if (!b) continue;
          for (const w of ["2030", "2040", "2050"] as const) {
            const f = calcWindowStats(dates, tA, rA, wins[w][0], wins[w][1]);
            if (!f) continue;
            out[w].d40.push(Number((f.days_40 - b.days_40).toFixed(2)));
            out[w].d45.push(Number((f.days_45 - b.days_45).toFixed(2)));
            out[w].drx.push(Number((f.rx1day - b.rx1day).toFixed(2)));
            out[w].d64.push(Number((f.days_rain_64_5 - b.days_rain_64_5).toFixed(3)));
          }
        }
        if (out["2040"].d40.length > 0) {
          cmipByPid.set(fac.plant_id, out);
          cmipLiveCount++;
        }
      });
    } catch (e) {
      warnings.push(`CMIP6 chunk ${chunk.map((c) => c.plant_id).join(",")} rate-limited: ${String(e)}`);
    }
  }

  const riverFacs = facilities.filter((f) => /river|canal/i.test(f.water_source));
  const floodByPid = new Map<string, { q25: number; meanPeak: number }>();
  if (riverFacs.length > 0) {
    try {
      const u = new URL("https://flood-api.open-meteo.com/v1/flood");
      u.searchParams.set("latitude", riverFacs.map((f) => f.lat).join(","));
      u.searchParams.set("longitude", riverFacs.map((f) => f.lon).join(","));
      u.searchParams.set("start_date", "1984-01-01");
      u.searchParams.set("end_date", "2024-12-31");
      u.searchParams.set("daily", "river_discharge");
      const raw = await getJson(u.toString());
      const arr = Array.isArray(raw) ? raw : [raw];
      riverFacs.forEach((fac, idx) => {
        const d = (arr[idx] as { daily?: { time: string[]; river_discharge: (number | null)[] } })?.daily;
        if (!d?.time) return;
        const byYr = new Map<number, number>();
        for (let k = 0; k < d.time.length; k++) {
          const v = d.river_discharge[k];
          if (v == null) continue;
          const yr = Number(d.time[k].slice(0, 4));
          byYr.set(yr, Math.max(byYr.get(yr) ?? 0, v));
        }
        const peaks = Array.from(byYr.values()).sort((a, b) => a - b);
        if (peaks.length) {
          floodByPid.set(fac.plant_id, {
            q25: Number(peaks[Math.min(peaks.length - 1, Math.floor(0.96 * peaks.length))].toFixed(1)),
            meanPeak: Number((peaks.reduce((a, b) => a + b, 0) / peaks.length).toFixed(1)),
          });
        }
      });
    } catch (e) {
      warnings.push(`GloFAS pull partial: ${String(e)}`);
    }
  }

  const { results, provenance } = assembleLiveRun({
    runId,
    nowIso,
    companyName,
    facilities,
    flows: validated.flows,
    obsByPid,
    cmipByPid,
    floodByPid,
  });

  return {
    valid: true as const,
    status: 200,
    run_id: runId,
    results,
    provenance,
    liveSummary: {
      plantsProcessed: results.plants.length,
      flowsValidated: validated.flows.length,
      era5LiveOk: obsByPid.size === facilities.length,
      cmipLiveCount,
      floodLiveCount: floodByPid.size,
      warnings,
    },
  };
}

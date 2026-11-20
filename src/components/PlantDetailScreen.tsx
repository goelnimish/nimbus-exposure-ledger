"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Droplets, GitBranch } from "lucide-react";
import type {
  EvaluatedPlant,
  HazardKey,
  HorizonKey,
  ScenarioKey,
  ThresholdConfig,
} from "@/lib/types";
import {
  HAZARD_META,
  HORIZON_META,
  ledgerData,
  RATING_LABELS,
  SCENARIO_META,
} from "@/lib/engine";
import { ProvenanceChip, RatingBadge } from "./Badges";
import type { AuditTracePayload } from "./AuditTraceModal";

interface PlantDetailScreenProps {
  plantId: string;
  scenario: ScenarioKey;
  horizon: HorizonKey;
  thresholds: ThresholdConfig;
  evaluated: EvaluatedPlant[];
  onSelectPlant: (plantId: string) => void;
  onNavigate: (screen: "plants" | "chain" | "method") => void;
  onInspectTrace?: (trace: AuditTracePayload) => void;
}

export function PlantDetailScreen({
  plantId,
  scenario,
  horizon,
  evaluated,
  onSelectPlant,
  onNavigate,
  onInspectTrace,
}: PlantDetailScreenProps) {
  const ep = evaluated.find((e) => e.plant.id === plantId) ?? evaluated[0];
  const p = ep.plant;

  const incomingFlows = ledgerData.flows.filter((f) => f.to === p.id);
  const outgoingFlows = ledgerData.flows.filter((f) => f.from === p.id);

  // Build Heat trajectory across all 3 scenarios
  const heatTrendData = (["today", "2030", "2040", "2050"] as HorizonKey[]).map((h) => {
    if (h === "today") {
      const v = p.hazards.heat.today?.value ?? 0;
      return { horizon: "Today", "Low (SSP1-2.6)": v, "Moderate (SSP2-4.5)": v, "High (SSP5-8.5)": v };
    }
    return {
      horizon: h,
      "Low (SSP1-2.6)": p.hazards.heat.scenarios?.ssp126[h].median ?? 0,
      "Moderate (SSP2-4.5)": p.hazards.heat.scenarios?.ssp245[h].median ?? 0,
      "High (SSP5-8.5)": p.hazards.heat.scenarios?.ssp585[h].median ?? 0,
    };
  });

  const rainTrendData = (["today", "2030", "2040", "2050"] as HorizonKey[]).map((h) => {
    if (h === "today") {
      const v = p.hazards.rain.today?.value ?? 0;
      return { horizon: "Today", "Low (SSP1-2.6)": v, "Moderate (SSP2-4.5)": v, "High (SSP5-8.5)": v };
    }
    return {
      horizon: h,
      "Low (SSP1-2.6)": p.hazards.rain.scenarios?.ssp126[h].median ?? 0,
      "Moderate (SSP2-4.5)": p.hazards.rain.scenarios?.ssp245[h].median ?? 0,
      "High (SSP5-8.5)": p.hazards.rain.scenarios?.ssp585[h].median ?? 0,
    };
  });

  const hazardKeys: HazardKey[] = ["heat", "rain", "water", "river", "coastal"];

  return (
    <div className="app-screen plant-detail-screen space-y-6">
      {/* Plant switcher bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate("plants")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to all 9 plants
        </button>

        <div className="flex flex-wrap items-center gap-1">
          {ledgerData.plants.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => onSelectPlant(pl.id)}
              className={`rounded-md px-2 py-1 text-xs font-mono font-semibold transition ${
                pl.id === p.id
                  ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {pl.id}
            </button>
          ))}
        </div>
      </div>

      {/* Plant Header Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {p.id}
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h1>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {p.type}
              </span>
              {p.coastal && (
                <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                  Coastal Site
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {p.town}, {p.state} ({p.lat.toFixed(4)}°N, {p.lon.toFixed(4)}°E)
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5" /> Intake: {p.water_source} ({p.water_basin})
              </span>
            </div>
            {p.notes && (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <strong>Operational note:</strong> {p.notes}
              </p>
            )}
            {(() => {
              const cues: string[] = [];
              if (p.notes.toLowerCase().includes("captive coal power")) {
                cues.push(
                  "Thermal-cooling water risk: 40 MW captive coal power plant relies on groundwater in an Extremely High stress basin (same mechanism flagged in Indian cement TCFD/BRSR disclosures)."
                );
              }
              if (p.notes.toLowerCase().includes("waste-heat recovery")) {
                cues.push(
                  "WHR cooling advantage: 30 MW waste-heat recovery lowers cooling-water demand versus coal CPP, though high ambient heat (>50 days ≥40°C) can derate cooling efficiency."
                );
              }
              if (p.notes.includes("1998")) {
                cues.push(
                  "Asset useful-life cue (1998 kiln): Likely approaches major refurbishment or retirement window before 2040 — weigh capex horizon before funding long-lived site adaptation."
                );
              }
              if (p.notes.includes("2022")) {
                cues.push(
                  "Asset useful-life cue (2022 kiln): Newest kiln will remain mid-life through 2040 while supplying 42.5% of its clinker to P08 & P09 (25.2% of group revenue)."
                );
              }
              if (p.id === "P07") {
                cues.push(
                  "Desalination & rail corridor: Seawater desalination decouples freshwater basin stress, shifting operational focus to coastal storm surge and the P01→P07 rail link."
                );
              }
              if (cues.length === 0) return null;
              return (
                <div className="mt-2.5 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
                  <strong className="font-semibold">Cement Operational Mechanism &amp; Asset Life:</strong>{" "}
                  {cues.join(" ")}
                </div>
              );
            })()}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-medium text-slate-500">
              Peak Rating ({HORIZON_META[horizon].label}, {SCENARIO_META[scenario].short})
            </span>
            <RatingBadge rating={ep.maxRating} />
          </div>
        </div>

        {/* Financial & Operational Denominators */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-800">
          {[
            ["Revenue (FY26)", `₹${p.denominators.revenue_inr_cr.toLocaleString("en-IN")} cr`],
            ["Gross Block", `₹${p.denominators.gross_block_inr_cr.toLocaleString("en-IN")} cr`],
            ["Output / Capacity", `${p.denominators.output_mt} / ${p.denominators.capacity_mtpa} Mt`],
            ["Workforce", `${p.denominators.people.toLocaleString("en-IN")} people`],
            ["Clinker Shipped", `${p.denominators.clinker_shipped_mt} Mt`],
            ["Scope 1 CO₂ (incl. clinker)", `${p.denominators.scope1_co2_kt.toLocaleString("en-IN")} kt`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{k}</span>
                <ProvenanceChip label="Real" />
              </div>
              <div className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All 5 Hazards in Real Physical Units */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Physical Hazard Profile — Real Units & Model Ranges ({HORIZON_META[horizon].label}, {SCENARIO_META[scenario].short})
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("method")}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-400"
          >
            Trace calculation in Method & Audit <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {hazardKeys.map((hk) => {
            const evH = ep.hazards[hk];
            const rawH = p.hazards[hk];
            const meta = HAZARD_META[hk];

            if (!evH.applicable) {
              return (
                <div
                  key={hk}
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {meta.name}
                    </h3>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Not Applicable
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{evH.reason}</p>
                </div>
              );
            }

            return (
              <div
                key={hk}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {meta.name}
                    </h3>
                    <ProvenanceChip
                      label={evH.label}
                      title="Click to trace this facility hazard metric"
                      onClick={() =>
                        onInspectTrace?.({
                          title: `${p.id} ${p.town} — ${meta.name}`,
                          valueDisplay: `${evH.value} ${evH.unit} (${RATING_LABELS[evH.rating]})`,
                          label: evH.label,
                          formula:
                            hk === "coastal"
                              ? "Tracks/decade = Unique IBTrACS storms (1980–2024) within 200 km / 4.5 decades"
                              : hk === "water"
                              ? "BWS(2040) = (Aqueduct_2030 + Aqueduct_2050) / 2 (qualified by plant water_source)"
                              : "Future = Observed_ERA5(2005–2024) + Median[Model_Future − Model_Base] × Scenario_Ratio",
                          inputs: [
                            { key: "Coordinates", value: `${p.lat.toFixed(4)}°N, ${p.lon.toFixed(4)}°E` },
                            { key: "Today Observed / Base", value: `${rawH.today?.value ?? "N/A"} ${evH.unit}` },
                            { key: "Ensemble Min–Max", value: `${evH.min}–${evH.max} ${evH.unit}` },
                            { key: "Rating Range", value: `${RATING_LABELS[evH.ratingRange[0]]} – ${RATING_LABELS[evH.ratingRange[1]]}` },
                            { key: "Upstream Chain Inherited", value: evH.upstreamHigh ? `Yes (from ${evH.upstreamSourceIds.join(", ")})` : "No" },
                          ],
                          sourceName: meta.source,
                          sourceVersion: p.cmip6_source_note,
                          sourceUrl:
                            hk === "coastal"
                              ? "https://www.ncei.noaa.gov/products/international-best-track-archive"
                              : hk === "water"
                              ? "https://www.wri.org/aqueduct"
                              : hk === "river"
                              ? "https://open-meteo.com/en/docs/flood-api"
                              : "https://open-meteo.com/en/docs/climate-api",
                          assumptionId: hk === "water" ? "A5, A9" : hk === "coastal" ? "A10" : "A1, A2, A11",
                        })
                      }
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                        {evH.value}
                      </span>
                      <span className="ml-1 text-xs text-slate-500">{evH.unit}</span>
                    </div>
                    <RatingBadge
                      rating={evH.rating}
                      decoupled={evH.decoupledFreshwater}
                      inherited={!evH.ownHigh && evH.upstreamHigh}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {meta.metricLabel} · Today: <strong className="font-mono">{rawH.today?.value} {evH.unit}</strong>
                  </p>

                  {/* Extra real physical context per hazard */}
                  {hk === "heat" && (
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      IMD heatwave days (≥45°C):{" "}
                      <strong className="font-mono">
                        {horizon === "today"
                          ? rawH.today?.days_45
                          : rawH.scenarios?.[scenario][horizon].days_45_median}{" "}
                        d/yr
                      </strong>
                    </p>
                  )}
                  {hk === "rain" && (
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      IMD heavy rain days (≥64.5 mm):{" "}
                      <strong className="font-mono">
                        {horizon === "today"
                          ? rawH.today?.days_64_5
                          : rawH.scenarios?.[scenario][horizon].days_64_5_median}{" "}
                        d/yr
                      </strong>
                    </p>
                  )}
                  {hk === "water" && (
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      {p.water_note}
                    </p>
                  )}
                  {hk === "river" && (
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      GloFAS 1-in-25-yr discharge: <strong className="font-mono">{rawH.today?.q25_m3s} m³/s</strong> baseline
                      {horizon !== "today" && (
                        <> → <strong className="font-mono">{rawH.scenarios?.[scenario][horizon].q25_projected_m3s} m³/s</strong></>
                      )}
                    </p>
                  )}
                  {hk === "coastal" && (
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      1980–2024 observed: <strong className="font-mono">{rawH.today?.total_1980_2024}</strong> cyclones ({rawH.today?.severe_1980_2024} severe) within 200 km. {rawH.future_note}
                    </p>
                  )}
                </div>

                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Ensemble min–max:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {evH.min}–{evH.max} {evH.unit} ({RATING_LABELS[evH.ratingRange[0]]}–{RATING_LABELS[evH.ratingRange[1]]})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="truncate max-w-[180px]" title={meta.source}>
                      {meta.source}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trajectory Charts + Upstream/Downstream Dependencies */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Extreme Heat Trajectory (Days/yr ≥ 40°C) across SSP Scenarios
            </h3>
            <ProvenanceChip label="Modelled" />
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={heatTrendData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="Low (SSP1-2.6)" stroke="#0284C7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Moderate (SSP2-4.5)" stroke="#D97706" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="High (SSP5-8.5)" stroke="#9A3412" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{p.cmip6_source_note}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Extreme Rain Trajectory (Rx1day, mm/day) across SSP Scenarios
            </h3>
            <ProvenanceChip label="Modelled" />
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rainTrendData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="Low (SSP1-2.6)" stroke="#0284C7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Moderate (SSP2-4.5)" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="High (SSP5-8.5)" stroke="#1E3A8A" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Supply Chain Dependencies */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Clinker Supply-Chain Dependencies
            </h3>
            <ProvenanceChip label="Real" />
          </div>
          <button
            type="button"
            onClick={() => onNavigate("chain")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-400"
          >
            Open Clinker Chain & Outage What-If <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {incomingFlows.length === 0 && outgoingFlows.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Standalone integrated plant — produces and grinds its own clinker on-site with no inter-plant clinker transfers.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {outgoingFlows.map((f) => {
              const dst = ledgerData.plants.find((x) => x.id === f.to)!;
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/20"
                >
                  <div>
                    <span className="font-semibold text-amber-950 dark:text-amber-100">
                      Supplies Downstream → {dst.id} {dst.town}
                    </span>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                      {f.mt} Mt/yr clinker ({f.share_of_kiln_clinker_pct}% of {p.id} clinker) via {f.mode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPlant(dst.id)}
                    className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-200"
                  >
                    Inspect {dst.id}
                  </button>
                </div>
              );
            })}
            {incomingFlows.map((f) => {
              const src = ledgerData.plants.find((x) => x.id === f.from)!;
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/20"
                >
                  <div>
                    <span className="font-semibold text-amber-950 dark:text-amber-100">
                      Depends Upstream ← {src.id} {src.town}
                    </span>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                      Receives {f.mt} Mt/yr clinker (100% of clinker feedstock) via {f.mode}. Inherits {src.id}&apos;s High+ hazard ratings under the Union Rule.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPlant(src.id)}
                    className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-200"
                  >
                    Inspect {src.id}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

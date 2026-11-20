"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  Flame,
  CloudRain,
  Droplets,
  Waves,
  Wind,
  GitBranch,
  SlidersHorizontal,
} from "lucide-react";
import type {
  DenominatorKey,
  EvaluatedPlant,
  HazardKey,
  HorizonKey,
  LensKey,
  ScenarioKey,
  ThresholdConfig,
} from "@/lib/types";
import {
  buildDeterministicHeadline,
  computeHazardSummary,
  computePortfolioUnionExposure,
  DENOMINATOR_META,
  evaluatePortfolio,
  HAZARD_META,
  HORIZON_META,
  SCENARIO_META,
} from "@/lib/engine";
import { ProvenanceChip } from "./Badges";
import { IndiaPlantMap } from "./IndiaPlantMap";
import type { AuditTracePayload } from "./AuditTraceModal";

interface OverviewScreenProps {
  scenario: ScenarioKey;
  horizon: HorizonKey;
  denominator: DenominatorKey;
  lens: LensKey;
  thresholds: ThresholdConfig;
  evaluated: EvaluatedPlant[];
  onSelectPlant: (plantId: string) => void;
  onNavigate: (screen: "plants" | "chain" | "method" | "brief") => void;
  onOpenChallenge: () => void;
  onInspectTrace?: (trace: AuditTracePayload) => void;
}

const HAZARD_ICONS: Record<HazardKey, React.ReactNode> = {
  heat: <Flame className="h-4 w-4 text-amber-700 dark:text-amber-400" />,
  rain: <CloudRain className="h-4 w-4 text-sky-700 dark:text-sky-400" />,
  water: <Droplets className="h-4 w-4 text-teal-700 dark:text-teal-400" />,
  river: <Waves className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />,
  coastal: <Wind className="h-4 w-4 text-slate-700 dark:text-slate-300" />,
};

export function OverviewScreen({
  scenario,
  horizon,
  denominator,
  lens,
  thresholds,
  evaluated,
  onSelectPlant,
  onNavigate,
  onOpenChallenge,
  onInspectTrace,
}: OverviewScreenProps) {
  const [mapHazard, setMapHazard] = useState<HazardKey | "any">("any");

  const headline = buildDeterministicHeadline(scenario, horizon, denominator, thresholds);
  const todayEval = evaluatePortfolio(scenario, "today", thresholds);
  const dMeta = DENOMINATOR_META[denominator];

  const hazardKeys: HazardKey[] = ["heat", "rain", "water", "river", "coastal"];
  const hazardCards = hazardKeys.map((hk) => ({
    key: hk,
    current: computeHazardSummary(evaluated, hk, denominator),
    today: computeHazardSummary(todayEval, hk, denominator),
  }));

  // Trajectory across horizons for Recharts
  const horizons: HorizonKey[] = ["today", "2030", "2040", "2050"];
  const trajectoryData = horizons.map((h) => {
    const ev = evaluatePortfolio(scenario, h, thresholds);
    const heat = computeHazardSummary(ev, "heat", denominator);
    const rain = computeHazardSummary(ev, "rain", denominator);
    const water = computeHazardSummary(ev, "water", denominator);
    const union = computePortfolioUnionExposure(ev, denominator);
    return {
      horizon: HORIZON_META[h].label,
      "Any Hazard (Network)": union.networkSharePct,
      Heat: heat.networkSharePct,
      "Extreme Rain": rain.networkSharePct,
      "Water Stress": water.networkSharePct,
    };
  });

  // Investor Lens: Disclosure-ready metrics across all 3 scenarios for chosen horizon
  const investorRows = (["ssp126", "ssp245", "ssp585"] as ScenarioKey[]).map((sc) => {
    const ev = evaluatePortfolio(sc, horizon, thresholds);
    const rev = computePortfolioUnionExposure(ev, "revenue_inr_cr");
    const gb = computePortfolioUnionExposure(ev, "gross_block_inr_cr");
    const out = computePortfolioUnionExposure(ev, "output_mt");
    const ppl = computePortfolioUnionExposure(ev, "people");
    return {
      scenario: SCENARIO_META[sc].short,
      revPct: rev.networkSharePct,
      gbPct: gb.networkSharePct,
      outPct: out.networkSharePct,
      pplPct: ppl.networkSharePct,
    };
  });

  return (
    <div className="app-screen overview-screen space-y-6">
      {/* 1. Answer-First Deterministic Headline */}
      <section className="overview-answer-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white dark:bg-slate-100 dark:text-slate-900">
              {lens === "board"
                ? "Board Headline"
                : lens === "auditor"
                ? "Auditor Traceable Summary"
                : "Investor Disclosure Summary"}
            </span>
            <ProvenanceChip
              label={horizon === "today" ? "Real" : "Modelled"}
              title="Click to inspect headline calculation trace"
              onClick={() =>
                onInspectTrace?.({
                  title: `Portfolio Network-Adjusted Exposure (${HORIZON_META[horizon].label})`,
                  valueDisplay: `${headline.currentUnion.networkSharePct}% (${dMeta.format(headline.currentUnion.networkAmount)})`,
                  label: horizon === "today" ? "Real" : "Modelled",
                  formula: "UnionShare = Σ Denominator(p) for all p where OwnHigh(p) OR UpstreamKilnHigh(p) / GroupTotal",
                  inputs: [
                    { key: "Scenario / Horizon", value: `${SCENARIO_META[scenario].short} / ${HORIZON_META[horizon].label}` },
                    { key: "Own-Site High Plants", value: `${headline.currentUnion.ownIds.join(", ") || "None"} (${headline.currentUnion.ownSharePct}%)` },
                    { key: "Network Union Plants", value: `${headline.currentUnion.networkIds.join(", ") || "None"} (${headline.currentUnion.networkSharePct}%)` },
                    { key: "Group Total", value: dMeta.format(headline.currentUnion.totalDenom) },
                    { key: "Double-Count Guard", value: "Union rule: each plant counted once" },
                  ],
                  sourceName: "Open-Meteo ERA5 + CMIP6 HighResMIP + GloFAS v4 + WRI Aqueduct 4.0 + NOAA IBTrACS",
                  sourceVersion: "Method v1.0 · 9/9 direct API baselines & CMIP6 projections",
                  sourceUrl: "https://open-meteo.com/en/docs/climate-api",
                  assumptionId: "A3, A4, A6, A11",
                })
              }
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Window: {HORIZON_META[horizon].window}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenChallenge}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Stress-test thresholds
            </button>
            <button
              type="button"
              onClick={() => onNavigate("brief")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              1-Page Board Brief
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h1 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl dark:text-slate-50">
          {headline.text}
        </h1>

        {/* Key KPI strip */}
        <div className="overview-kpi-strip mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-800">
          <div className="overview-kpi rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Network-Adjusted High Exposure
              </span>
              <ProvenanceChip label={horizon === "today" ? "Real" : "Modelled"} />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {headline.currentUnion.networkSharePct}%
            </div>
            <div className="text-xs text-slate-600 tabular-nums dark:text-slate-400">
              {dMeta.format(headline.currentUnion.networkAmount)} of {dMeta.format(headline.currentUnion.totalDenom)}
            </div>
          </div>

          <div className="overview-kpi rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Own-Site Only (Pre-Network)
              </span>
              <ProvenanceChip label={horizon === "today" ? "Real" : "Modelled"} />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {headline.currentUnion.ownSharePct}%
            </div>
            <div className="text-xs text-slate-600 tabular-nums dark:text-slate-400">
              {headline.currentUnion.ownIds.length} of 9 sites directly rated High+
            </div>
          </div>

          <div className="overview-kpi rounded-lg bg-amber-50/70 p-3 dark:bg-amber-950/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
                Two Clinker Chains (P01, P06)
              </span>
              <ProvenanceChip label="Real" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-amber-950 dark:text-amber-100">
              {headline.chains.combined.sharePct}%
            </div>
            <button
              type="button"
              onClick={() => onNavigate("chain")}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-300"
            >
              <GitBranch className="h-3 w-3" />
              Model kiln outage what-if
            </button>
          </div>

          <div className="overview-kpi rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Today → {HORIZON_META[horizon].label} Shift
              </span>
              <ProvenanceChip label="Modelled" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {headline.todayUnion.networkSharePct}% → {headline.currentUnion.networkSharePct}%
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Union rule: each plant counted once
            </div>
          </div>
        </div>

        {/* Board Priority Triage Strip (XDI-inspired risk concentration lens) */}
        {(() => {
          const tier1 = evaluated.filter((e) => e.highHazardKeys.length >= 2);
          const tier2 = evaluated.filter((e) => e.highHazardKeys.length === 1);
          const tier3 = evaluated.filter((e) => e.highHazardKeys.length === 0);
          const t1Amt = tier1.reduce((s, e) => s + e.plant.denominators[denominator], 0);
          const t1Pct = ((t1Amt / headline.currentUnion.totalDenom) * 100).toFixed(1);
          return (
            <div className="overview-triage mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Action Triage (Where to focus first):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-[#9A3412] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Tier 1 · Multi-Hazard ({t1Pct}%)
                </span>
                {tier1.map((e) => (
                  <button
                    key={e.plant.id}
                    type="button"
                    onClick={() => onSelectPlant(e.plant.id)}
                    className="rounded border border-amber-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-900 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                    title={`${e.plant.name}: ${e.highHazardKeys.join(", ")}`}
                  >
                    {e.plant.id} {e.plant.town}
                  </button>
                ))}
              </div>
              {tier2.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                    Tier 2 · Single Hazard
                  </span>
                  {tier2.map((e) => (
                    <button
                      key={e.plant.id}
                      type="button"
                      onClick={() => onSelectPlant(e.plant.id)}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {e.plant.id}
                    </button>
                  ))}
                </div>
              )}
              {tier3.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900 dark:bg-sky-900/50 dark:text-sky-200">
                    Tier 3 · Chain / Moderate
                  </span>
                  {tier3.map((e) => (
                    <button
                      key={e.plant.id}
                      type="button"
                      onClick={() => onSelectPlant(e.plant.id)}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    >
                      {e.plant.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* 2. Per-Hazard Exposure Tiles */}
      <section className="overview-hazard-section">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Exposure by Physical Hazard (% of {dMeta.short} in High or Very High, Network-Adjusted)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click a tile to highlight that hazard on the India map
          </span>
        </div>

        <div className="overview-hazards grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {hazardCards.map(({ key, current, today }) => {
            const isSelected = mapHazard === key;
            const delta = Number((current.networkSharePct - today.networkSharePct).toFixed(1));
            const chipLabel =
              key === "coastal"
                ? "Real"
                : horizon === "today"
                ? key === "water"
                  ? "Modelled"
                  : "Real"
                : key === "water" && horizon === "2040"
                ? "Assumption"
                : "Modelled";

            return (
              <button
                key={key}
                type="button"
                onClick={() => setMapHazard(isSelected ? "any" : key)}
                className={`hazard-tile flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/40 ring-1 ring-amber-500 dark:bg-amber-950/20"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {HAZARD_ICONS[key]}
                      {HAZARD_META[key].short}
                    </span>
                    <ProvenanceChip
                      label={chipLabel}
                      title="Click to trace this hazard share"
                      onClick={(e?: React.MouseEvent) => {
                        e?.stopPropagation?.();
                        onInspectTrace?.({
                          title: `${HAZARD_META[key].name} — Network-Adjusted Exposure`,
                          valueDisplay: `${current.networkSharePct}% (${dMeta.format(current.networkAmount)})`,
                          label: chipLabel,
                          formula: `Share(${key}) = Σ ${dMeta.short}(p) where Rating(p,${key}) ≥ 4 OR UpstreamKilnRating ≥ 4 / GroupTotal`,
                          inputs: [
                            { key: "Metric", value: HAZARD_META[key].metricLabel },
                            { key: "Own-Site High Plants", value: current.ownPlantIds.join(", ") || "None" },
                            { key: "Inherited via Clinker Chain", value: current.inheritedPlantIds.join(", ") || "None" },
                            { key: "Ensemble Min–Max Share", value: `${current.networkMinSharePct}% – ${current.networkMaxSharePct}%` },
                            { key: "Today Observed Share", value: `${today.networkSharePct}%` },
                          ],
                          sourceName: HAZARD_META[key].source,
                          sourceVersion: `${SCENARIO_META[scenario].short} · ${HORIZON_META[horizon].window}`,
                          sourceUrl:
                            key === "coastal"
                              ? "https://www.ncei.noaa.gov/products/international-best-track-archive"
                              : key === "water"
                              ? "https://www.wri.org/aqueduct"
                              : key === "river"
                              ? "https://open-meteo.com/en/docs/flood-api"
                              : "https://open-meteo.com/en/docs/climate-api",
                          assumptionId: key === "water" ? "A5, A9" : key === "coastal" ? "A10" : "A2, A3, A11",
                        });
                      }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {current.networkSharePct}%
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                      {horizon === "today"
                        ? "observed"
                        : delta > 0
                        ? `+${delta} pp`
                        : delta < 0
                        ? `${delta} pp`
                        : "unchanged"}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-600 tabular-nums dark:text-slate-400">
                    {dMeta.format(current.networkAmount)} · Today: {today.networkSharePct}%
                  </div>
                </div>

                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Model range:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {current.networkMinSharePct}%–{current.networkMaxSharePct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Own vs Chain:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {current.ownPlantIds.length} own
                      {current.inheritedPlantIds.length > 0
                        ? ` + ${current.inheritedPlantIds.length} chain`
                        : ""}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Map + Trajectory / Investor Lens Split */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <IndiaPlantMap
            evaluated={evaluated}
            denominator={denominator}
            selectedHazard={mapHazard}
            onSelectPlant={onSelectPlant}
          />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Horizon Trajectory Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Exposure Trajectory: Today to 2050 ({SCENARIO_META[scenario].short})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share of {dMeta.short} rated High or Very High (network-adjusted union rule)
                </p>
              </div>
              <ProvenanceChip label="Modelled" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trajectoryData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                  <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, ""]}
                    contentStyle={{
                      fontSize: "12px",
                      borderRadius: "8px",
                      borderColor: "#CBD5E1",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Any Hazard (Network)" fill="#0F172A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Heat" fill="#D97706" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Extreme Rain" fill="#0284C7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Water Stress" fill="#0D9488" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Investor Disclosure Matrix (highlighted in Investor Lens, visible as quick reference) */}
          {lens === "investor" && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                  Investor Disclosure Matrix — % in High Exposure ({HORIZON_META[horizon].label})
                </h3>
                <ProvenanceChip label="Modelled" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-indigo-200 text-indigo-900 dark:border-indigo-800 dark:text-indigo-200">
                      <th className="py-1.5 pr-3 font-semibold">Scenario</th>
                      <th className="py-1.5 px-2 text-right font-semibold">Revenue</th>
                      <th className="py-1.5 px-2 text-right font-semibold">Gross Block</th>
                      <th className="py-1.5 px-2 text-right font-semibold">Output</th>
                      <th className="py-1.5 pl-2 text-right font-semibold">Workforce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100 tabular-nums dark:divide-indigo-900/50">
                    {investorRows.map((row) => (
                      <tr key={row.scenario}>
                        <td className="py-1.5 pr-3 font-medium">{row.scenario}</td>
                        <td className="py-1.5 px-2 text-right font-semibold">{row.revPct}%</td>
                        <td className="py-1.5 px-2 text-right">{row.gbPct}%</td>
                        <td className="py-1.5 px-2 text-right">{row.outPct}%</td>
                        <td className="py-1.5 pl-2 text-right">{row.pplPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 border-t border-indigo-200/70 pt-2 text-[11px] text-indigo-900/90 dark:border-indigo-800/60 dark:text-indigo-200/80">
                <strong>Disclosure Alignment:</strong> Reporting boundary = Standalone (6 Integrated Kilns + 3 Grinding Units, FY 2025-26). Maps directly to <strong>SEBI BRSR Section A (Q24 Material Issues) &amp; Principle 6</strong>, <strong>TCFD Metrics &amp; Targets</strong>, and <strong>IFRS S2 Para 29(b)</strong> (% of assets/revenue vulnerable to physical risk).
              </p>
            </div>
          )}

          {/* Honest Scope Box — "What this does not cover" */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-400" />
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  What this v1 ledger deliberately does not cover
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Transition risk (CCTS / carbon pricing):</strong> Excluded in v1. Scope 1 in the facility file includes clinker shipped out (creating a 0.95 vs 0.02 t CO₂/t cement allocation trap between P01 and P07); transition risk belongs in v2 with clinker-adjusted accounting.
                  </li>
                  <li>
                    <strong>Financial loss or EBITDA damage modelling:</strong> Exposure shows business value in harm&apos;s way, not expected damage. Loss curves require site-level engineering vulnerability and business-interruption insurance data.
                  </li>
                  <li>
                    <strong>Site-level adaptation credits & future cyclone frequency:</strong> Ratings reflect unmitigated hazard exposure (P07 desalination is qualified qualitatively), and NOAA IBTrACS cyclone counts are historical (1980–2024) only.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

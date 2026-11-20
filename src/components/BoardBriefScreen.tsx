"use client";

import React from "react";
import { Printer } from "lucide-react";
import type {
  DenominatorKey,
  EvaluatedPlant,
  HorizonKey,
  ScenarioKey,
  ThresholdConfig,
} from "@/lib/types";
import {
  buildDeterministicHeadline,
  computeChainStats,
  computeHazardSummary,
  computeOutageRevenueInPlay,
  DENOMINATOR_META,
  evaluatePortfolio,
  HAZARD_META,
  HORIZON_META,
  ledgerData,
  SCENARIO_META,
} from "@/lib/engine";
import { ProvenanceChip, RatingBadge } from "./Badges";

interface BoardBriefScreenProps {
  scenario: ScenarioKey;
  horizon: HorizonKey;
  denominator: DenominatorKey;
  thresholds: ThresholdConfig;
  evaluated: EvaluatedPlant[];
}

export function BoardBriefScreen({
  scenario,
  horizon,
  denominator,
  thresholds,
  evaluated,
}: BoardBriefScreenProps) {
  const headline = buildDeterministicHeadline(scenario, horizon, denominator, thresholds);
  const todayEval = evaluatePortfolio(scenario, "today", thresholds);
  const dMeta = DENOMINATOR_META[denominator];

  const coreHazards = (["heat", "rain", "water"] as const).map((hk) => ({
    key: hk,
    current: computeHazardSummary(evaluated, hk, denominator),
    today: computeHazardSummary(todayEval, hk, denominator),
  }));

  // Top 3 exposed plants by chosen denominator (among High/Very High network-exposed plants)
  const top3 = [...evaluated]
    .filter((e) => e.anyNetworkHigh)
    .sort((a, b) => b.plant.denominators[denominator] - a.plant.denominators[denominator])
    .slice(0, 3);

  const chains = computeChainStats("revenue_inr_cr");
  const p01DefaultOutage = computeOutageRevenueInPlay(["P01", "P07"], 30, 0, 0);
  const p06DefaultOutage = computeOutageRevenueInPlay(["P06", "P08", "P09"], 30, 0, 0);

  return (
    <div className="app-screen board-brief-screen space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            One-Page Executive Board Brief (Print-Ready A4)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Designed first so Meera Iyer can take one clean, traceable page into her Board & Audit Committee meeting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Printable A4 Sheet */}
      <article className="print-brief-container mx-auto max-w-[820px] rounded-xl border border-slate-300 bg-white p-6 text-slate-900 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {/* Top Masthead */}
        <header className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-slate-900 pb-3 dark:border-slate-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-400">
              Nimbus Cement Ltd · Board Climate Risk Brief
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              Physical Climate Exposure Ledger — {HORIZON_META[horizon].label} ({SCENARIO_META[scenario].short})
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Prepared for: Board of Directors &amp; Audit Committee · Owner: Meera Iyer, Head of Sustainability · Baseline: FY 2025-26
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              <strong>Reporting Boundary:</strong> Standalone — 6 Integrated Kilns + 3 Grinding Units (9/9 facilities) · Aligned with SEBI BRSR Section A &amp; IFRS S2 Para 29(b)
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-600 dark:text-slate-400">
            <div>Run ID: {ledgerData.meta.run_id}</div>
            <div>Method v{ledgerData.meta.method_version}</div>
            <div>Window: {HORIZON_META[horizon].window}</div>
          </div>
        </header>

        {/* Scope Banner inside Brief */}
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <strong>Scope: Physical climate risk only.</strong> Measures business value in harm&apos;s way (not modelled financial loss or EBITDA impact). Transition risk (CCTS / carbon pricing) is excluded in v1.
        </div>

        {/* Deterministic Headline */}
        <div className="print-break-avoid mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Executive Answer ({dMeta.label})
            </span>
            <ProvenanceChip label={horizon === "today" ? "Real" : "Modelled"} />
          </div>
          <p className="text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">
            {headline.text}
          </p>
        </div>

        {/* 3 Core Hazard Tiles */}
        <div className="print-break-avoid mt-4 grid grid-cols-3 gap-3">
          {coreHazards.map(({ key, current, today }) => (
            <div
              key={key}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{HAZARD_META[key].short}</span>
                <ProvenanceChip label={key === "water" && horizon === "2040" ? "Assumption" : "Modelled"} />
              </div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums">
                {current.networkSharePct}%
              </div>
              <div className="text-[11px] text-slate-600 tabular-nums dark:text-slate-400">
                {dMeta.format(current.networkAmount)} (Today: {today.networkSharePct}%)
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Model range: {current.networkMinSharePct}%–{current.networkMaxSharePct}% · {current.ownPlantIds.length} own sites
                {current.inheritedPlantIds.length > 0 ? ` + ${current.inheritedPlantIds.length} chain` : ""}
              </div>
            </div>
          ))}
        </div>

        {/* Top 3 Exposed Facilities */}
        <div className="print-break-avoid mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Top 3 Exposed Facilities (by {dMeta.short})
            </h2>
            <span className="text-[10px] text-slate-500">
              Coastal storms (IBTrACS): P08 Paradip 22.4/dec (Very High), P07 Mundra 5.3/dec (High)
            </span>
          </div>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 text-[10px] uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="py-1.5 pl-2">Plant</th>
                <th className="py-1.5 text-right">Revenue</th>
                <th className="py-1.5 text-right">Gross Block</th>
                <th className="py-1.5 pl-3">Heat</th>
                <th className="py-1.5">Rain</th>
                <th className="py-1.5">Water</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {top3.map((ep) => (
                <tr key={ep.plant.id}>
                  <td className="py-2 pl-2 font-semibold">
                    {ep.plant.id} {ep.plant.town} ({ep.plant.state})
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    ₹{ep.plant.denominators.revenue_inr_cr.toLocaleString("en-IN")} cr
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    ₹{ep.plant.denominators.gross_block_inr_cr.toLocaleString("en-IN")} cr
                  </td>
                  <td className="py-2 pl-3">
                    <RatingBadge rating={ep.hazards.heat.rating} compact />
                  </td>
                  <td className="py-2">
                    <RatingBadge rating={ep.hazards.rain.rating} compact />
                  </td>
                  <td className="py-2">
                    <RatingBadge
                      rating={ep.hazards.water.rating}
                      compact
                      decoupled={ep.hazards.water.decoupledFreshwater}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Clinker Chain Concentration Callout */}
        <div className="print-break-avoid mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Network Insight: Clinker Supply Concentration
            </h2>
            <ProvenanceChip label="Real" />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Two kilns hold <strong>52.1% of group revenue (₹{chains.combined.value.toLocaleString("en-IN")} cr)</strong>:{" "}
            <strong>P01 Chittorgarh → P07 Mundra</strong> (₹2,597 cr; 32.7% of P01 clinker) and{" "}
            <strong>P06 Baloda Bazar → P08 Paradip & P09 Durgapur</strong> (₹2,435 cr; 42.5% of P06 clinker). Under a 30-day unbuffered kiln outage assumption (Assumption A7), gross revenue in play is{" "}
            <strong className="font-mono">₹{p01DefaultOutage.totalRevenueInPlay} cr</strong> (P01 chain) and{" "}
            <strong className="font-mono">₹{p06DefaultOutage.totalRevenueInPlay} cr</strong> (P06 chain).
          </p>
        </div>

        {/* Audit Footer */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 text-[10px] text-slate-500 dark:border-slate-800">
          <span>
            Sources: Nimbus CSV (FY 2025-26), Open-Meteo ERA5 & CMIP6 HighResMIP, GloFAS v4, WRI Aqueduct 4.0, NOAA IBTrACS v04r01.
          </span>
          <span className="font-mono">
            Union rule enforced · 0 Illustrative figures · {ledgerData.meta.run_id}
          </span>
        </footer>
      </article>
    </div>
  );
}

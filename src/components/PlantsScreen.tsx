"use client";

import React, { useState } from "react";
import { ArrowUpDown, ChevronRight, Info } from "lucide-react";
import type {
  DenominatorKey,
  EvaluatedPlant,
  HorizonKey,
  ScenarioKey,
  ThresholdConfig,
} from "@/lib/types";
import { DENOMINATOR_META, evaluatePortfolio, HORIZON_META } from "@/lib/engine";
import { ProvenanceChip, RatingBadge } from "./Badges";

interface PlantsScreenProps {
  scenario: ScenarioKey;
  horizon: HorizonKey;
  denominator: DenominatorKey;
  thresholds: ThresholdConfig;
  evaluated: EvaluatedPlant[];
  onSelectPlant: (plantId: string) => void;
}

type SortKey = "revenue" | "gross_block" | "output" | "people" | "max_rating";

export function PlantsScreen({
  scenario,
  horizon,
  denominator,
  thresholds,
  evaluated,
  onSelectPlant,
}: PlantsScreenProps) {
  const defaultSort: SortKey =
    denominator === "gross_block_inr_cr"
      ? "gross_block"
      : denominator === "output_mt"
      ? "output"
      : denominator === "people"
      ? "people"
      : "revenue";

  const [sortBy, setSortBy] = useState<SortKey>(defaultSort);
  const todayEval = evaluatePortfolio(scenario, "today", thresholds);
  const todayById = new Map(todayEval.map((e) => [e.plant.id, e]));

  const sorted = [...evaluated].sort((a, b) => {
    switch (sortBy) {
      case "revenue":
        return b.plant.denominators.revenue_inr_cr - a.plant.denominators.revenue_inr_cr;
      case "gross_block":
        return b.plant.denominators.gross_block_inr_cr - a.plant.denominators.gross_block_inr_cr;
      case "output":
        return b.plant.denominators.output_mt - a.plant.denominators.output_mt;
      case "people":
        return b.plant.denominators.people - a.plant.denominators.people;
      case "max_rating":
        return b.maxRating - a.maxRating || b.plant.denominators.revenue_inr_cr - a.plant.denominators.revenue_inr_cr;
    }
  });

  return (
    <div className="app-screen plants-screen space-y-4">
      {/* Denominator Ranking Flip Callout (Blueprint Screen 2 requirement) */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/25">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-300" />
          <div className="text-xs text-amber-950 dark:text-amber-100">
            <strong className="font-semibold">Why the ranking flips between Revenue and Gross Block:</strong>{" "}
            Nimbus&apos;s three grinding units (P07 Mundra, P08 Paradip, P09 Durgapur) generate{" "}
            <strong className="tabular-nums">20.8% of revenue</strong> (₹1.12–1.33 revenue per ₹1 of gross block) but represent only{" "}
            <strong className="tabular-nums">10.4% of gross block</strong> (vs ₹0.54–0.58 for integrated kilns). Ranking strictly by asset value understates the coastal grinding units by half.
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-amber-900 dark:text-amber-200">Sort by:</span>
          {(
            [
              ["revenue", "Revenue"],
              ["gross_block", "Gross Block"],
              ["output", "Output"],
              ["people", "People"],
              ["max_rating", "Peak Rating"],
            ] as [SortKey, string][]
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortBy(k)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                sortBy === k
                  ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                  : "bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Main 9-Plant Comparison Table */}
      <div className="plant-comparison overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              All 9 Facilities — Today vs {HORIZON_META[horizon].label} Hazard Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active denominator: {DENOMINATOR_META[denominator].label} · Click any row for full plant dossier
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProvenanceChip label="Real" title="Plant financials & ERA5/IBTrACS baselines" />
            <ProvenanceChip label="Modelled" title="CMIP6 & Aqueduct future ratings" />
          </div>
        </div>

        <div className="plant-table-scroll overflow-x-auto">
          <table className="plant-comparison-table w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="sticky left-0 z-10 bg-slate-50 py-2.5 pl-4 pr-2 dark:bg-slate-800">Plant</th>
                <th className="px-2 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1">
                    Revenue <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </span>
                </th>
                <th className="px-2 py-2.5 text-right">Gross Block</th>
                <th className="px-2 py-2.5 text-right">Output / People</th>
                <th className="px-2 py-2.5">Extreme Heat</th>
                <th className="px-2 py-2.5">Extreme Rain</th>
                <th className="px-2 py-2.5">Water Stress</th>
                <th className="px-2 py-2.5">River / Coastal</th>
                <th className="py-2.5 pl-2 pr-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.map((ep) => {
                const p = ep.plant;
                const td = todayById.get(p.id)!;
                const revPerGb = (
                  p.denominators.revenue_inr_cr / p.denominators.gross_block_inr_cr
                ).toFixed(2);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlant(p.id)}
                    className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="sticky left-0 z-10 bg-white py-3 pl-4 pr-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {p.id}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {p.town}
                            <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                              ({p.state})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{p.type}</span>
                            <span>·</span>
                            <span>Rev/GB {revPerGb}x</span>
                            {ep.rankFlip !== 0 && (
                              <span
                                className={`rounded px-1 text-[10px] font-medium ${
                                  ep.rankFlip > 0
                                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                                title={`Rank #${ep.revenueRank} by Revenue vs #${ep.grossBlockRank} by Gross Block`}
                              >
                                Rev #{ep.revenueRank} / GB #{ep.grossBlockRank}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      ₹{p.denominators.revenue_inr_cr.toLocaleString("en-IN")} cr
                    </td>

                    <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      ₹{p.denominators.gross_block_inr_cr.toLocaleString("en-IN")} cr
                    </td>

                    <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      <div>{p.denominators.output_mt.toFixed(2)} Mt</div>
                      <div className="text-[10px] text-slate-400">{p.denominators.people} ppl</div>
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <RatingBadge
                          rating={ep.hazards.heat.rating}
                          compact
                          inherited={!ep.hazards.heat.ownHigh && ep.hazards.heat.upstreamHigh}
                        />
                        <span className="font-mono text-[10px] text-slate-500">
                          {td.hazards.heat.value} → {ep.hazards.heat.value} d
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <RatingBadge
                          rating={ep.hazards.rain.rating}
                          compact
                          inherited={!ep.hazards.rain.ownHigh && ep.hazards.rain.upstreamHigh}
                        />
                        <span className="font-mono text-[10px] text-slate-500">
                          {td.hazards.rain.value} → {ep.hazards.rain.value} mm
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <RatingBadge
                          rating={ep.hazards.water.rating}
                          compact
                          decoupled={ep.hazards.water.decoupledFreshwater}
                          inherited={!ep.hazards.water.ownHigh && ep.hazards.water.upstreamHigh}
                        />
                        <span className="font-mono text-[10px] text-slate-500">
                          {p.water_source} ({ep.hazards.water.value})
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        {ep.hazards.coastal.applicable ? (
                          <>
                            <RatingBadge rating={ep.hazards.coastal.rating} compact />
                            <span className="font-mono text-[10px] text-slate-500">
                              Cyclone: {ep.hazards.coastal.value}/dec
                            </span>
                          </>
                        ) : ep.hazards.river.applicable ? (
                          <>
                            <RatingBadge rating={ep.hazards.river.rating} compact />
                            <span className="font-mono text-[10px] text-slate-500">
                              River Q25 ×{ep.hazards.river.value}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">Inland / non-river</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 pl-2 pr-4 text-right">
                      <span className="inline-flex items-center gap-0.5 font-medium text-amber-800 dark:text-amber-400">
                        Inspect <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

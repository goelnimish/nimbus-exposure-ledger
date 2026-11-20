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
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import type { EvaluatedPlant, HorizonKey, ScenarioKey } from "@/lib/types";
import {
  computeChainStats,
  computeOutageRevenueInPlay,
  HORIZON_META,
  SCENARIO_META,
} from "@/lib/engine";
import { ProvenanceChip, RatingBadge } from "./Badges";
import type { AuditTracePayload } from "./AuditTraceModal";

interface ClinkerChainScreenProps {
  scenario: ScenarioKey;
  horizon: HorizonKey;
  evaluated: EvaluatedPlant[];
  onSelectPlant: (plantId: string) => void;
  onInspectTrace?: (trace: AuditTracePayload) => void;
}

export function ClinkerChainScreen({
  scenario,
  horizon,
  evaluated,
  onSelectPlant,
  onInspectTrace,
}: ClinkerChainScreenProps) {
  // Decoupled user-set what-if parameters (Assumption A7: D=30, B=0, R=0%)
  const [outageDays, setOutageDays] = useState<number>(30);
  const [bufferDays, setBufferDays] = useState<number>(0);
  const [replacementPct, setReplacementPct] = useState<number>(0);
  const [clampMsg, setClampMsg] = useState<string | null>(null);

  const byId = new Map(evaluated.map((e) => [e.plant.id, e]));
  const chains = computeChainStats("revenue_inr_cr");
  const p01Outage = computeOutageRevenueInPlay(["P01", "P07"], outageDays, bufferDays, replacementPct);
  const p06Outage = computeOutageRevenueInPlay(["P06", "P08", "P09"], outageDays, bufferDays, replacementPct);

  const handleClampedInput = (
    raw: number,
    min: number,
    max: number,
    setter: (v: number) => void,
    label: string
  ) => {
    if (Number.isNaN(raw)) {
      setter(min);
      return;
    }
    if (raw < min || raw > max) {
      const clamped = Math.max(min, Math.min(max, raw));
      setter(clamped);
      setClampMsg(`${label} clamped to valid range (${min}–${max}).`);
    } else {
      setter(raw);
      setClampMsg(null);
    }
  };

  const resetDefaults = () => {
    setOutageDays(30);
    setBufferDays(0);
    setReplacementPct(0);
    setClampMsg(null);
  };

  const chartData = [
    {
      chain: "P01 Chain (Chittorgarh → Mundra)",
      "Kiln Site": p01Outage.breakdown.find((b) => b.plantId === "P01")?.revenueInPlay ?? 0,
      "Downstream Grinding Units":
        p01Outage.breakdown.find((b) => b.plantId === "P07")?.revenueInPlay ?? 0,
    },
    {
      chain: "P06 Chain (Baloda Bazar → Paradip & Durgapur)",
      "Kiln Site": p06Outage.breakdown.find((b) => b.plantId === "P06")?.revenueInPlay ?? 0,
      "Downstream Grinding Units": Number(
        (
          (p06Outage.breakdown.find((b) => b.plantId === "P08")?.revenueInPlay ?? 0) +
          (p06Outage.breakdown.find((b) => b.plantId === "P09")?.revenueInPlay ?? 0)
        ).toFixed(1)
      ),
    },
  ];

  const renderNode = (pid: string, role: string, flowLabel?: string) => {
    const ep = byId.get(pid);
    if (!ep) return null;
    const p = ep.plant;
    return (
      <button
        type="button"
        onClick={() => onSelectPlant(pid)}
        className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{p.id}</span>
            <span className="ml-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {p.town}
            </span>
          </div>
          <RatingBadge rating={ep.maxRating} compact />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{role}</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            ₹{p.denominators.revenue_inr_cr.toLocaleString("en-IN")} cr
          </span>
        </div>
        {flowLabel && (
          <div className="mt-1.5 rounded bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {flowLabel}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-[10px] text-slate-500">Heat:</span>
          <RatingBadge rating={ep.hazards.heat.rating} compact />
          <span className="ml-1 text-[10px] text-slate-500">Rain:</span>
          <RatingBadge rating={ep.hazards.rain.rating} compact />
          <span className="ml-1 text-[10px] text-slate-500">Water:</span>
          <RatingBadge
            rating={ep.hazards.water.rating}
            compact
            decoupled={ep.hazards.water.decoupledFreshwater}
          />
        </div>
      </button>
    );
  };

  return (
    <div className="app-screen clinker-screen space-y-6">
      {/* Header Insight Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Clinker Supply Chains — The Network Concentration Risk
              </h1>
              <ProvenanceChip label="Real" />
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Two kilns (<strong>P01 Chittorgarh</strong> and <strong>P06 Baloda Bazar</strong>) supply 100% of clinker for all three grinding units. Together, these two chains hold{" "}
              <strong className="tabular-nums text-slate-900 dark:text-white">
                ₹{chains.combined.value.toLocaleString("en-IN")} cr ({chains.combined.sharePct}% of group revenue)
              </strong>
              , 52.9% of cement output, and 46.3% of gross block. Ratings below reflect{" "}
              <strong>{HORIZON_META[horizon].label} ({SCENARIO_META[scenario].short})</strong>.
            </p>
          </div>
        </div>

        {/* Two Chain Flow Diagrams */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chain 1: P01 -> P07 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chain 1: Western Rail Corridor (P01 → P07)
                </h2>
                <p className="text-[11px] text-slate-500">
                  ₹{chains.p01Chain.value.toLocaleString("en-IN")} cr ({chains.p01Chain.sharePct}% of revenue) · 1.12 Mt clinker shipped (32.7% of P01 kiln)
                </p>
              </div>
              <ProvenanceChip label="Real" />
            </div>

            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-11">
              <div className="sm:col-span-5">
                {renderNode("P01", "Integrated Kiln (Supplier)", "Ships 1.12 Mt by rail")}
              </div>
              <div className="flex flex-col items-center justify-center sm:col-span-1">
                <ArrowRight className="h-5 w-5 rotate-90 text-amber-700 sm:rotate-0 dark:text-amber-400" />
              </div>
              <div className="sm:col-span-5">
                {renderNode("P07", "Coastal Grinding Unit", "Receives 1.12 Mt (100% feed)")}
              </div>
            </div>
          </div>

          {/* Chain 2: P06 -> P08 & P09 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chain 2: Eastern Hub (P06 → P08 & P09)
                </h2>
                <p className="text-[11px] text-slate-500">
                  ₹{chains.p06Chain.value.toLocaleString("en-IN")} cr ({chains.p06Chain.sharePct}% of revenue) · 1.28 Mt clinker shipped (42.5% of P06 kiln)
                </p>
              </div>
              <ProvenanceChip label="Real" />
            </div>

            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-11">
              <div className="sm:col-span-5">
                {renderNode("P06", "Integrated Kiln (Supplier)", "Ships 1.28 Mt total")}
              </div>
              <div className="flex flex-col items-center justify-center sm:col-span-1">
                <ArrowRight className="h-5 w-5 rotate-90 text-amber-700 sm:rotate-0 dark:text-amber-400" />
              </div>
              <div className="space-y-2.5 sm:col-span-5">
                {renderNode("P08", "Coastal Grinding Unit", "Receives 0.68 Mt from P06")}
                {renderNode("P09", "River Grinding Unit", "Receives 0.60 Mt from P06")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decoupled Outage What-If Simulator */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Kiln Outage What-If Simulator (Decoupled Scenario Test)
              </h2>
              <ProvenanceChip label="Assumption" title="User-controlled what-if inputs; never auto-filled from hazard ratings" />
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Hazard ratings show <em>where</em> risk sits; this simulator lets the board test <em>what if</em> a kiln or rail corridor stops for D days. Never auto-filled from hazard ratings. Formula:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-slate-800">
                Revenue in play = (Revenue_i / 365) × max(0, D − B) × (1 − R)
              </code>
            </p>
          </div>
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset defaults (30d / 0d / 0%)
          </button>
        </div>

        {clampMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {clampMsg}
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <label htmlFor="outage-days" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Kiln Outage Duration (D)
              </label>
              <ProvenanceChip label="Assumption" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="outage-days"
                type="range"
                min={0}
                max={120}
                step={1}
                value={outageDays}
                onChange={(e) => handleClampedInput(Number(e.target.value), 0, 180, setOutageDays, "Outage days")}
                className="w-full accent-amber-600"
              />
              <input
                type="number"
                min={0}
                max={180}
                value={outageDays}
                onChange={(e) => handleClampedInput(Number(e.target.value), 0, 180, setOutageDays, "Outage days")}
                className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Days kiln or dispatch line is offline (default: 30d)</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <label htmlFor="buffer-days" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Clinker Stock Buffer (B)
              </label>
              <ProvenanceChip label="Assumption" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="buffer-days"
                type="range"
                min={0}
                max={60}
                step={1}
                value={bufferDays}
                onChange={(e) => handleClampedInput(Number(e.target.value), 0, 90, setBufferDays, "Stock buffer days")}
                className="w-full accent-amber-600"
              />
              <input
                type="number"
                min={0}
                max={90}
                value={bufferDays}
                onChange={(e) => handleClampedInput(Number(e.target.value), 0, 90, setBufferDays, "Stock buffer days")}
                className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Days covered by on-site clinker inventory (default: 0d)</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <label htmlFor="repl-pct" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Bought-In Clinker Share (R)
              </label>
              <ProvenanceChip label="Assumption" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="repl-pct"
                type="range"
                min={0}
                max={100}
                step={5}
                value={replacementPct}
                onChange={(e) => handleClampedInput(Number(e.target.value), 0, 100, setReplacementPct, "Replacement share")}
                className="w-full accent-amber-600"
              />
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={replacementPct}
                  onChange={(e) => handleClampedInput(Number(e.target.value), 0, 100, setReplacementPct, "Replacement share")}
                  className="w-14 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
                />
                <span className="text-xs font-mono">%</span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Share replaced by third-party clinker (default: 0%)</p>
          </div>
        </div>

        {/* Results + Chart */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                  P01 Chain Revenue in Play
                </span>
                <ProvenanceChip
                  label="Assumption"
                  title="Click to trace P01 chain outage formula"
                  onClick={() =>
                    onInspectTrace?.({
                      title: "P01 Chain (Chittorgarh → Mundra) Outage What-If",
                      valueDisplay: `₹${p01Outage.totalRevenueInPlay.toLocaleString("en-IN")} cr`,
                      label: "Assumption",
                      formula: "RevenueInPlay = Σ (AnnualRevenue_i / 365) × max(0, D − B) × (1 − R)",
                      inputs: [
                        { key: "Chain Annual Revenue", value: `₹${p01Outage.annualChainRevenue.toLocaleString("en-IN")} cr` },
                        { key: "Outage / Buffer (D / B)", value: `${outageDays}d / ${bufferDays}d (net ${p01Outage.effectiveDays}d)` },
                        { key: "Bought-In Clinker (R)", value: `${replacementPct}%` },
                      ],
                      sourceName: "Facility CSV + User-Set What-If Parameters",
                      sourceVersion: "Decoupled from hazard ratings (never auto-filled)",
                      assumptionId: "A6, A7, A8",
                    })
                  }
                />
              </div>
              <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-950 dark:text-amber-100">
                ₹{p01Outage.totalRevenueInPlay.toLocaleString("en-IN")} cr
              </div>
              <div className="mt-2 space-y-1 border-t border-amber-200/70 pt-2 text-[11px] text-amber-900 dark:border-amber-900/50 dark:text-amber-200/80">
                {p01Outage.breakdown.map((b) => (
                  <div key={b.plantId} className="flex justify-between font-mono">
                    <span>{b.plantId} ({b.type === "Integrated" ? "Kiln" : "Grinding"})</span>
                    <strong>₹{b.revenueInPlay} cr</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                  P06 Chain Revenue in Play
                </span>
                <ProvenanceChip
                  label="Assumption"
                  title="Click to trace P06 chain outage formula"
                  onClick={() =>
                    onInspectTrace?.({
                      title: "P06 Chain (Baloda Bazar → Paradip & Durgapur) Outage What-If",
                      valueDisplay: `₹${p06Outage.totalRevenueInPlay.toLocaleString("en-IN")} cr`,
                      label: "Assumption",
                      formula: "RevenueInPlay = Σ (AnnualRevenue_i / 365) × max(0, D − B) × (1 − R)",
                      inputs: [
                        { key: "Chain Annual Revenue", value: `₹${p06Outage.annualChainRevenue.toLocaleString("en-IN")} cr` },
                        { key: "Outage / Buffer (D / B)", value: `${outageDays}d / ${bufferDays}d (net ${p06Outage.effectiveDays}d)` },
                        { key: "Bought-In Clinker (R)", value: `${replacementPct}%` },
                      ],
                      sourceName: "Facility CSV + User-Set What-If Parameters",
                      sourceVersion: "Decoupled from hazard ratings (never auto-filled)",
                      assumptionId: "A6, A7, A8",
                    })
                  }
                />
              </div>
              <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-950 dark:text-amber-100">
                ₹{p06Outage.totalRevenueInPlay.toLocaleString("en-IN")} cr
              </div>
              <div className="mt-2 space-y-1 border-t border-amber-200/70 pt-2 text-[11px] text-amber-900 dark:border-amber-900/50 dark:text-amber-200/80">
                {p06Outage.breakdown.map((b) => (
                  <div key={b.plantId} className="flex justify-between font-mono">
                    <span>{b.plantId} ({b.type === "Integrated" ? "Kiln" : "Grinding"})</span>
                    <strong>₹{b.revenueInPlay} cr</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 lg:col-span-7 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Kiln vs Downstream Grinding Unit Revenue in Play (₹ cr, effective {p01Outage.effectiveDays} net days)
              </span>
              <ProvenanceChip label="Assumption" />
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                  <XAxis type="number" unit=" cr" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="chain" width={160} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => [`₹${val} cr`, ""]} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Kiln Site" stackId="a" fill="#0F172A" />
                  <Bar dataKey="Downstream Grinding Units" stackId="a" fill="#D97706" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import React, { useEffect } from "react";
import { X, RotateCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import type {
  DenominatorKey,
  HorizonKey,
  LedgerResults,
  ScenarioKey,
  ThresholdConfig,
} from "@/lib/types";
import {
  buildDeterministicHeadline,
  computeChallengeStability,
  defaultLedgerData,
  SCENARIO_META,
} from "@/lib/engine";
import { ProvenanceChip } from "./Badges";

interface ChallengeDrawerProps {
  open: boolean;
  onClose: () => void;
  scenario: ScenarioKey;
  onChangeScenario: (s: ScenarioKey) => void;
  horizon: HorizonKey;
  denominator: DenominatorKey;
  thresholds: ThresholdConfig;
  onChangeThresholds: (t: ThresholdConfig) => void;
  data?: LedgerResults;
}

export function ChallengeDrawer({
  open,
  onClose,
  scenario,
  onChangeScenario,
  horizon,
  denominator,
  thresholds,
  onChangeThresholds,
  data = defaultLedgerData,
}: ChallengeDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const defaults = data.meta.default_thresholds;
  const stability = computeChallengeStability(horizon, denominator, thresholds, data);
  const liveHeadline = buildDeterministicHeadline(scenario, horizon, denominator, thresholds, data);

  const isModified = JSON.stringify(thresholds) !== JSON.stringify(defaults);

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Challenge Mode (Auditor Stress Test)
              </h2>
              <ProvenanceChip label="Assumption" />
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Test whether the headline survives threshold & scenario changes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Challenge Mode"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Stability Badge */}
          <div
            className={`rounded-xl border p-4 ${
              stability.passedCount >= 5
                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {stability.passedCount >= 5 ? (
                <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              )}
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Headline holds under {stability.passedCount} of {stability.totalCount} alternatives
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">
              Live exposed share:{" "}
              <strong className="font-mono text-sm">
                {liveHeadline.currentUnion.networkSharePct}%
              </strong>{" "}
              (Default SSP2-4.5 baseline: <span className="font-mono">{stability.baseShare}%</span>).
            </p>

            <div className="mt-3 space-y-1 border-t border-slate-200/70 pt-2.5 text-[11px] dark:border-slate-700/60">
              {stability.checks.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                  <span className="font-mono font-semibold">
                    {c.sharePct}%{" "}
                    <span className="text-[10px] font-normal text-slate-500">
                      ({c.diffPp >= 0 ? `+${c.diffPp}` : c.diffPp} pp)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Quick Switch */}
          <div>
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Climate Scenario
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(["ssp126", "ssp245", "ssp585"] as ScenarioKey[]).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => onChangeScenario(sc)}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                    scenario === sc
                      ? "border-slate-900 bg-slate-900 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {SCENARIO_META[sc].short.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Heat &ldquo;High&rdquo; Threshold (days ≥ 40°C)
                </span>
                <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                  ≥ {thresholds.heat_high} d/yr
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={55}
                step={1}
                value={thresholds.heat_high}
                onChange={(e) =>
                  onChangeThresholds({ ...thresholds, heat_high: Number(e.target.value) })
                }
                className="mt-1.5 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Stricter (15d)</span>
                <span>Default: {defaults.heat_high}d</span>
                <span>Looser (55d)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Extreme Rain &ldquo;High&rdquo; Threshold (Rx1day)
                </span>
                <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                  ≥ {thresholds.rain_high} mm
                </span>
              </div>
              <input
                type="range"
                min={65}
                max={Math.floor(defaults.rain_very_high - 1)}
                step={1}
                value={Math.min(thresholds.rain_high, Math.floor(defaults.rain_very_high - 1))}
                onChange={(e) =>
                  onChangeThresholds({
                    ...thresholds,
                    rain_high: Math.min(Number(e.target.value), Math.floor(defaults.rain_very_high - 1)),
                  })
                }
                className="mt-1.5 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Stricter (65 mm)</span>
                <span>Default: {defaults.rain_high} mm</span>
                <span>Max &lt; VH ({Math.floor(defaults.rain_very_high - 1)} mm)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Water Stress &ldquo;High&rdquo; Threshold (Aqueduct 0–5)
                </span>
                <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                  ≥ {thresholds.water_high.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={2.0}
                max={Number((defaults.water_very_high - 0.1).toFixed(1))}
                step={0.1}
                value={Math.min(thresholds.water_high, Number((defaults.water_very_high - 0.1).toFixed(1)))}
                onChange={(e) =>
                  onChangeThresholds({
                    ...thresholds,
                    water_high: Math.min(Number(e.target.value), Number((defaults.water_very_high - 0.1).toFixed(1))),
                  })
                }
                className="mt-1.5 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Stricter (2.0)</span>
                <span>Default: {defaults.water_high.toFixed(1)}</span>
                <span>Max &lt; VH ({(defaults.water_very_high - 0.1).toFixed(1)})</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Coastal Storm &ldquo;High&rdquo; Threshold (per decade)
                </span>
                <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                  ≥ {thresholds.coastal_high.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={2.0}
                max={defaults.coastal_very_high - 0.5}
                step={0.5}
                value={Math.min(thresholds.coastal_high, defaults.coastal_very_high - 0.5)}
                onChange={(e) =>
                  onChangeThresholds({
                    ...thresholds,
                    coastal_high: Math.min(Number(e.target.value), defaults.coastal_very_high - 0.5),
                  })
                }
                className="mt-1.5 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Stricter (2.0)</span>
                <span>Default: {defaults.coastal_high.toFixed(1)}</span>
                <span>Max &lt; VH ({(defaults.coastal_very_high - 0.5).toFixed(1)})</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <strong>Integrity Guardrail:</strong> Default v1.0 thresholds are locked in <code className="font-mono">results.json</code> and never back-solved. Adjusting sliders here lets auditors verify sensitivity in real time without altering the base record.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onChangeThresholds({ ...defaults })}
            disabled={!isModified}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

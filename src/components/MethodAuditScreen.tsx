"use client";

import React from "react";
import { Download, ExternalLink, CheckCircle2, FileSpreadsheet } from "lucide-react";
import type { HorizonKey, LedgerResults, ProvenanceData, ScenarioKey, ThresholdConfig } from "@/lib/types";
import {
  generateAuditCsv,
  HORIZON_META,
  ledgerData,
  provenanceData,
  SCENARIO_META,
} from "@/lib/engine";
import { ProvenanceChip } from "./Badges";

interface MethodAuditScreenProps {
  scenario: ScenarioKey;
  horizon: HorizonKey;
  thresholds: ThresholdConfig;
  data?: LedgerResults;
  provenance?: ProvenanceData;
}

export function MethodAuditScreen({
  scenario,
  horizon,
  thresholds,
  data = ledgerData,
  provenance = provenanceData,
}: MethodAuditScreenProps) {
  const handleDownloadCsv = () => {
    const csv = generateAuditCsv(scenario, horizon, thresholds, data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nimbus_exposure_ledger_${data.meta.run_id}_${scenario}_${horizon}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-screen method-screen space-y-6">
      {/* Audit Run Header + CSV Export */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Methodology, Provenance & Audit Trail
            </h1>
            <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              0 Illustrative Numbers
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Run ID: <strong className="font-mono">{data.meta.run_id}</strong> · Method v{data.meta.method_version} · Generated:{" "}
            <span className="font-mono">{data.meta.generated_at}</span> · Active view:{" "}
            {SCENARIO_META[scenario].short} / {HORIZON_META[horizon].label}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
        >
          <Download className="h-4 w-4" />
          Export Audit CSV ({SCENARIO_META[scenario].short}, {HORIZON_META[horizon].label})
        </button>
      </section>

      {/* 1. Data Sources & Provenance Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            1. Data Sources, Versions & Retrieval Dates
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="py-2.5 pl-4 pr-2">Source</th>
                <th className="px-2 py-2.5">Version & Grid</th>
                <th className="px-2 py-2.5">Used For</th>
                <th className="px-2 py-2.5">Label</th>
                <th className="py-2.5 pl-2 pr-4">Notes & Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {provenance.sources.map((src) => (
                <tr key={src.id} className="align-top">
                  <td className="py-3 pl-4 pr-2 font-semibold text-slate-900 dark:text-slate-100">
                    <div>{src.name}</div>
                    <div className="mt-0.5 font-mono text-[10px] font-normal text-slate-500">
                      Retrieved: {src.retrieved_at}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                    <div>{src.version}</div>
                    <div className="text-[11px] text-slate-400">{src.resolution}</div>
                  </td>
                  <td className="px-2 py-3 text-slate-700 dark:text-slate-300">{src.used_for}</td>
                  <td className="px-2 py-3">
                    <ProvenanceChip label={src.label} />
                  </td>
                  <td className="py-3 pl-2 pr-4 text-slate-600 dark:text-slate-400">
                    <p>{src.notes}</p>
                    {src.url.startsWith("http") && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
                      >
                        Documentation <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Calculation Trace & Rating Thresholds */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            2. Deterministic Calculation Trace
          </h2>
          <div className="mt-3 space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-semibold text-slate-900 dark:text-white">
                Delta-Change Climate Projection (Bias-Corrected)
              </div>
              <code className="mt-1 block font-mono text-[11px] text-slate-700 dark:text-slate-300">
                Future(m) = Observed_ERA5(2005–2024) + [Model_Future(m) − Model_Base(m)] × Scenario_Ratio
              </code>
              <p className="mt-1 text-[11px] text-slate-500">
                Reported as ensemble median across 4 high-resolution CMIP6 models with min–max range.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-semibold text-slate-900 dark:text-white">
                Union Rule (Zero Double Counting)
              </div>
              <code className="mt-1 block font-mono text-[11px] text-slate-700 dark:text-slate-300">
                NetworkHigh(p, h) = OwnHigh(p, h) OR ∃ upstream kiln k→p where OwnHigh(k, h)
              </code>
              <p className="mt-1 text-[11px] text-slate-500">
                Each facility is counted at most once per hazard and once in the headline &ldquo;at least one hazard&rdquo; union. Example: if P06 and P08 are both High, P06 chain revenue (₹2,435 cr) is counted once.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-semibold text-slate-900 dark:text-white">
                Data Trap Note: Why Transition Risk Waits for v2
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                In <code className="font-mono">nimbus_cement_plants.csv</code>, Scope 1 includes clinker shipped out (plus P01&apos;s 40 MW captive coal plant). Naive CO₂ intensity reads <strong>0.947 t/t</strong> at P01 and <strong>0.020 t/t</strong> at P07 against a group average of <strong>0.596 t/t</strong>. Proper CCTS modelling requires clinker-allocated accounting in v2.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              3. Active Rating Thresholds (High ≥ 4, Very High = 5)
            </h2>
            <ProvenanceChip label="Assumption" />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Calibrated once after initial data pull; never back-solved. Stress-test live in Challenge Mode.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-500 dark:border-slate-800">
                  <th className="py-1.5 font-semibold">Hazard</th>
                  <th className="py-1.5 font-semibold">Metric</th>
                  <th className="py-1.5 text-right font-semibold">High (4)</th>
                  <th className="py-1.5 text-right font-semibold">Very High (5)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800">
                <tr>
                  <td className="py-2 font-sans font-medium">Extreme Heat</td>
                  <td className="py-2 font-sans text-slate-500">Days/yr ≥ 40°C</td>
                  <td className="py-2 text-right">≥ {thresholds.heat_high} d</td>
                  <td className="py-2 text-right">≥ {thresholds.heat_very_high} d</td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-medium">Extreme Rain</td>
                  <td className="py-2 font-sans text-slate-500">Rx1day (mm)</td>
                  <td className="py-2 text-right">≥ {thresholds.rain_high} mm</td>
                  <td className="py-2 text-right">≥ {thresholds.rain_very_high} mm</td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-medium">Water Stress</td>
                  <td className="py-2 font-sans text-slate-500">Aqueduct 0–5</td>
                  <td className="py-2 text-right">≥ {thresholds.water_high.toFixed(1)}</td>
                  <td className="py-2 text-right">≥ {thresholds.water_very_high.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-medium">Riverine Flood</td>
                  <td className="py-2 font-sans text-slate-500">Q25 ratio</td>
                  <td className="py-2 text-right">≥ {thresholds.river_high.toFixed(2)}×</td>
                  <td className="py-2 text-right">≥ {thresholds.river_very_high.toFixed(2)}×</td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-medium">Coastal Storms</td>
                  <td className="py-2 font-sans text-slate-500">Tracks/decade</td>
                  <td className="py-2 text-right">≥ {thresholds.coastal_high.toFixed(1)}</td>
                  <td className="py-2 text-right">≥ {thresholds.coastal_very_high.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-500" />
            Fiscal year runs April–March (FY 2025-26); climate windows are calendar-year (2005–2024 baseline; 20-year centred future windows).
          </div>
        </div>
      </section>

      {/* 4. Assumptions Register */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            4. Assumptions Register (A1–A11)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="py-2.5 pl-4 pr-2">ID</th>
                <th className="px-2 py-2.5">Assumption</th>
                <th className="px-2 py-2.5">Parameter / Value</th>
                <th className="px-2 py-2.5">Owner</th>
                <th className="py-2.5 pl-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.assumptions.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-slate-900 dark:text-white">
                    {a.id}
                  </td>
                  <td className="px-2 py-2.5 text-slate-700 dark:text-slate-300">{a.text}</td>
                  <td className="px-2 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {a.value}
                  </td>
                  <td className="px-2 py-2.5 text-slate-600 dark:text-slate-400">{a.owner}</td>
                  <td className="py-2.5 pl-2 pr-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

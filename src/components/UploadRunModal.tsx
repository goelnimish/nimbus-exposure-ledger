"use client";

import React, { useEffect, useState } from "react";
import { X, Upload, RefreshCw, AlertCircle, CheckCircle2, Download, Database } from "lucide-react";
import type { LedgerResults, ProvenanceData } from "@/lib/types";
import type { ValidationError } from "@/lib/csvValidator";
import { defaultLedgerData } from "@/lib/engine";

interface RunSnapshot {
  runId: string;
  label: string;
  results: LedgerResults;
  provenance: ProvenanceData;
  isLive: boolean;
}

interface UploadRunModalProps {
  open: boolean;
  onClose: () => void;
  runs: RunSnapshot[];
  activeRunId: string;
  onSelectRun: (runId: string) => void;
  onAddLiveRun: (snapshot: RunSnapshot) => void;
}

export function UploadRunModal({
  open,
  onClose,
  runs,
  activeRunId,
  onSelectRun,
  onAddLiveRun,
}: UploadRunModalProps) {
  const [companyName, setCompanyName] = useState("Nimbus Cement Ltd");
  const [facilitiesCsv, setFacilitiesCsv] = useState("");
  const [flowsCsv, setFlowsCsv] = useState("");
  const [facFileName, setFacFileName] = useState<string | null>(null);
  const [flowFileName, setFlowFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFileRead = (
    file: File | undefined,
    setText: (v: string) => void,
    setName: (n: string | null) => void
  ) => {
    if (!file) return;
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const downloadSampleFacilities = () => {
    const header =
      "plant_id,plant_name,town,state,latitude,longitude,plant_type,cement_capacity_mtpa,cement_output_fy2025_26_mt,clinker_produced_fy2025_26_mt,clinker_shipped_fy2025_26_mt,scope1_co2_fy2025_26_kt,water_source,coastal,asset_value_inr_cr,revenue_fy2025_26_inr_cr,employees,notes";
    const rows = defaultLedgerData.plants.map((p) =>
      [
        p.id,
        `"${p.name}"`,
        p.town,
        p.state,
        p.lat,
        p.lon,
        p.type,
        p.denominators.capacity_mtpa,
        p.denominators.output_mt,
        p.denominators.clinker_produced_mt,
        p.denominators.clinker_shipped_mt,
        p.denominators.scope1_co2_kt,
        `"${p.water_source}"`,
        p.coastal ? "Y" : "N",
        p.denominators.gross_block_inr_cr,
        p.denominators.revenue_inr_cr,
        p.denominators.people,
        `"${p.notes.replace(/"/g, '""')}"`,
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nimbus_cement_plants.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runLiveIngest = async (mode: "upload" | "refresh_default") => {
    setLoading(true);
    setErrors([]);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "refresh_default"
            ? { mode: "refresh_default", companyName: "Nimbus Cement Ltd" }
            : { facilitiesCsv, flowsCsv: flowsCsv || undefined, companyName }
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setErrors(json.errors ?? [{ file: "facilities.csv", message: "Validation or live API pull failed." }]);
        return;
      }

      const snap: RunSnapshot = {
        runId: json.run_id,
        label:
          mode === "refresh_default"
            ? `Live Refresh (${json.liveSummary.plantsProcessed} plants)`
            : `${companyName} Upload (${json.liveSummary.plantsProcessed} plants)`,
        results: json.results,
        provenance: json.provenance,
        isLive: true,
      };
      onAddLiveRun(snap);
      const w = json.liveSummary.warnings?.length
        ? ` Note: ${json.liveSummary.warnings[0]}`
        : "";
      setStatusMsg(
        `Live Run ${json.run_id} completed! ERA5 live: ${json.liveSummary.era5LiveOk ? "9/9" : "partial"}, CMIP6 live: ${json.liveSummary.cmipLiveCount}/${json.liveSummary.plantsProcessed}, GloFAS live: ${json.liveSummary.floodLiveCount}.${w}`
      );
    } catch (err) {
      setErrors([{ file: "facilities.csv", message: `Network error calling /api/ingest: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Climate Ingestion &amp; Immutable Run Manager
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Upload any facility CSV + optional flows CSV, or trigger a live pull against free Open-Meteo ERA5, CMIP6 &amp; GloFAS APIs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live ingestion modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          {/* Quick Live Refresh on Default 9 Plants */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div>
              <div className="font-semibold text-emerald-950 dark:text-emerald-200">
                1-Click Live Open-Meteo Refresh (Nimbus 9 Plants)
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-900/80 dark:text-emerald-300/80">
                Calls free Open-Meteo Historical (ERA5), Climate (CMIP6), and Flood (GloFAS) APIs live from the server and creates a new immutable Run ID.
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => runLiveIngest("refresh_default")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Pulling Live APIs..." : "Run Live Refresh"}
            </button>
          </div>

          {/* Custom CSV Upload */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-slate-900 dark:text-white">
                Upload Custom Portfolio CSV
              </div>
              <button
                type="button"
                onClick={downloadSampleFacilities}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
              >
                <Download className="h-3 w-3" /> Download sample facilities CSV
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Company / Portfolio Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800/40">
                <Upload className="h-5 w-5 text-slate-500" />
                <span className="mt-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  {facFileName ?? "Select facilities.csv (required)"}
                </span>
                <span className="mt-0.5 text-[10px] text-slate-500">
                  18 schema columns · validated atomically
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFileRead(e.target.files?.[0], setFacilitiesCsv, setFacFileName)}
                />
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800/40">
                <Upload className="h-5 w-5 text-slate-500" />
                <span className="mt-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  {flowFileName ?? "Select flows.csv (optional)"}
                </span>
                <span className="mt-0.5 text-[10px] text-slate-500">
                  flow_id, from_plant_id, to_plant_id, commodity, quantity_mt, mode
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFileRead(e.target.files?.[0], setFlowsCsv, setFlowFileName)}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={loading || !facilitiesCsv.trim()}
              onClick={() => runLiveIngest("upload")}
              className="w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950"
            >
              {loading ? "Validating & Pulling Live Climate APIs..." : "Validate CSV & Run Live Climate Ingestion"}
            </button>
          </div>

          {/* Validation Errors (ING-001..018) */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Validation / Ingestion Rejected ({errors.length} issue{errors.length > 1 ? "s" : ""})
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px]">
                {errors.slice(0, 10).map((err, i) => (
                  <li key={i}>
                    <span className="font-mono font-semibold">
                      {err.file}
                      {err.row ? ` row ${err.row}` : ""}
                      {err.field ? ` [${err.field}]` : ""}:
                    </span>{" "}
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {statusMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Immutable Run History Switcher (PIPE-002 / LIVE-013) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Database className="h-3.5 w-3.5" />
              Immutable Run Snapshots ({runs.length})
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {runs.map((r) => (
                <div
                  key={r.runId}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {r.runId}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          r.isLive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {r.isLive ? "Live API Run" : "Baseline Snapshot"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{r.label}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectRun(r.runId)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      activeRunId === r.runId
                        ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {activeRunId === r.runId ? "Active" : "Switch to Run"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

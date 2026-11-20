"use client";

import React, { useEffect } from "react";
import { X, ExternalLink, FileCheck2, ArrowRight } from "lucide-react";
import type { ProvenanceLabel } from "@/lib/types";
import { ledgerData } from "@/lib/engine";
import { ProvenanceChip } from "./Badges";

export interface AuditTracePayload {
  title: string;
  valueDisplay: string;
  label: ProvenanceLabel;
  formula: string;
  inputs: { key: string; value: string }[];
  sourceName: string;
  sourceVersion: string;
  sourceUrl?: string;
  assumptionId?: string;
}

interface AuditTraceModalProps {
  trace: AuditTracePayload | null;
  onClose: () => void;
  onOpenMethod: () => void;
}

export function AuditTraceModal({
  trace,
  onClose,
  onOpenMethod,
}: AuditTraceModalProps) {
  useEffect(() => {
    if (!trace) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trace, onClose]);

  if (!trace) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                2-Click Audit Trace
              </span>
              <ProvenanceChip label={trace.label} />
            </div>
            <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {trace.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit trace"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/60">
            <span className="font-medium text-slate-500 dark:text-slate-400">Reported Figure</span>
            <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
              {trace.valueDisplay}
            </span>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Deterministic Formula
            </div>
            <code className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {trace.formula}
            </code>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Verified Inputs & Parameters
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {trace.inputs.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-slate-600 dark:text-slate-400">{item.key}</span>
                  <span className="text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {trace.sourceName}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                Run {ledgerData.meta.run_id}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
              {trace.sourceVersion}
              {trace.assumptionId ? ` · Linked assumption: ${trace.assumptionId}` : ""}
            </p>
            {trace.sourceUrl && trace.sourceUrl.startsWith("http") && (
              <a
                href={trace.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
              >
                Inspect source documentation <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenMethod();
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-400"
          >
            Open Full Method & Audit Ledger <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

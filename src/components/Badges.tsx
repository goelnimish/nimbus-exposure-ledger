"use client";

import React from "react";
import { ShieldAlert, Info } from "lucide-react";
import type { ProvenanceLabel } from "@/lib/types";
import { RATING_LABELS } from "@/lib/engine";

/**
 * Color-blind-safe sequential rating badge (no alarm red; uses cool sky -> amber -> deep burnt sienna)
 * WCAG AA contrast verified in both light and dark modes.
 */
export function RatingBadge({
  rating,
  compact = false,
  decoupled = false,
  inherited = false,
}: {
  rating: number;
  compact?: boolean;
  decoupled?: boolean;
  inherited?: boolean;
}) {
  if (decoupled) {
    return (
      <span
        title="Basin is Extremely High water stress, but plant uses desalinated seawater (freshwater risk decoupled)."
        className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900 dark:border-teal-700 dark:bg-teal-950/60 dark:text-teal-200"
      >
        Desalinated
      </span>
    );
  }

  const styles: Record<number, string> = {
    1: "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800",
    2: "bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-900/50 dark:text-sky-100 dark:border-sky-700",
    3: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700",
    4: "bg-amber-400/90 text-slate-950 border-amber-600 dark:bg-amber-500/90 dark:text-slate-950 dark:border-amber-400",
    5: "bg-[#9A3412] text-white border-[#7C2D12] dark:bg-[#C2410C] dark:text-white dark:border-orange-500",
  };

  const label = RATING_LABELS[rating] ?? "N/A";
  const style = styles[rating] ?? "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-semibold whitespace-nowrap ${
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
      } ${style}`}
    >
      {label}
      {inherited && (
        <span
          className="ml-0.5 rounded bg-slate-900/15 px-1 text-[10px] font-medium dark:bg-white/20"
          title="Inherited from upstream kiln dependency"
        >
          Chain
        </span>
      )}
    </span>
  );
}

/**
 * Provenance chip — every number carries one of Real, Modelled, or Assumption (zero Illustrative).
 */
export function ProvenanceChip({
  label,
  title,
  onClick,
}: {
  label: ProvenanceLabel;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const styles: Record<ProvenanceLabel, string> = {
    Real: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    Modelled:
      "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
    Assumption:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title ?? `Data provenance: ${label}`}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        styles[label]
      } ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
    >
      {label}
    </Comp>
  );
}

/**
 * Persistent Scope Banner — resolves Senior-PM Red-Team Critique #1 (Physical risk only)
 */
export function ScopeBanner({
  runId,
  methodVersion,
  onOpenMethod,
}: {
  runId: string;
  methodVersion: string;
  onOpenMethod?: () => void;
}) {
  return (
    <div className="scope-banner flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
        <span>
          <strong className="font-semibold">Scope: Physical climate risk only.</strong>{" "}
          Measures business exposure (not modelled financial loss). Transition risk (CCTS / carbon pricing) is excluded in v1.
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] font-mono text-amber-900/80 dark:text-amber-200/80">
        <span>Run ID: {runId}</span>
        <span>Method v{methodVersion}</span>
        {onOpenMethod && (
          <button
            type="button"
            onClick={onOpenMethod}
            className="no-print inline-flex items-center gap-1 font-sans font-medium underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
          >
            <Info className="h-3 w-3" /> Trace method
          </button>
        )}
      </div>
    </div>
  );
}

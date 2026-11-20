"use client";

import React, { useState } from "react";
import type { DenominatorKey, EvaluatedPlant, HazardKey } from "@/lib/types";
import { DENOMINATOR_META, getDenominatorValue, ledgerData, RATING_LABELS } from "@/lib/engine";
import { RatingBadge } from "./Badges";

interface IndiaPlantMapProps {
  evaluated: EvaluatedPlant[];
  denominator: DenominatorKey;
  selectedHazard: HazardKey | "any";
  onSelectPlant: (plantId: string) => void;
}

// Simple equirectangular projection calibrated for India bounding box (lon 67..92, lat 7..36)
const LON_MIN = 67.0;
const LON_MAX = 92.5;
const LAT_MIN = 7.0;
const LAT_MAX = 36.0;
const W = 420;
const H = 460;

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - 40) + 20;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - 40) + 20;
  return [x, y];
}

// Simplified clean India mainland coastline & border polygon (lat/lon vertices)
const INDIA_OUTLINE_COORDS: [number, number][] = [
  [35.2, 74.8], [34.5, 77.8], [32.7, 79.1], [30.2, 80.2], [28.6, 81.0],
  [27.4, 83.8], [26.8, 88.0], [27.8, 88.8], [27.0, 91.6], [26.0, 90.0],
  [25.2, 89.8], [24.2, 88.8], [22.2, 89.0], [21.6, 87.5], [20.4, 86.9],
  [19.1, 84.8], [17.7, 83.3], [15.9, 80.9], [13.1, 80.3], [10.3, 79.8],
  [8.1, 77.5], [9.5, 76.3], [12.9, 74.8], [15.4, 73.8], [19.0, 72.8],
  [21.6, 72.6], [20.7, 70.9], [22.4, 69.0], [23.6, 68.4], [24.7, 70.9],
  [26.9, 70.2], [29.9, 73.9], [32.3, 74.9], [34.0, 73.9], [35.2, 74.8],
];

const RATING_FILL: Record<number, string> = {
  1: "#BAE6FD",
  2: "#38BDF8",
  3: "#FBBF24",
  4: "#D97706",
  5: "#9A3412",
};

export function IndiaPlantMap({
  evaluated,
  denominator,
  selectedHazard,
  onSelectPlant,
}: IndiaPlantMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const outlinePath =
    INDIA_OUTLINE_COORDS.map(([lat, lon], idx) => {
      const [x, y] = project(lat, lon);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z";

  const maxDenom = Math.max(
    ...evaluated.map((e) => getDenominatorValue(e.plant, denominator)),
    1
  );

  const byId = new Map(evaluated.map((e) => [e.plant.id, e]));
  const hovered = hoveredId ? byId.get(hoveredId) : null;

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Facility Footprint & Clinker Supply Network
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bubble size = {DENOMINATOR_META[denominator].short} · Dashed arcs = clinker flows · Click any plant to inspect
          </p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[420px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label="Map of Nimbus Cement's 9 Indian plants and clinker supply flows"
        >
          {/* Subtle graticule */}
          {[10, 15, 20, 25, 30].map((lat) => {
            const [, y] = project(lat, LON_MIN);
            return (
              <line
                key={`lat-${lat}`}
                x1={16}
                y1={y}
                x2={W - 16}
                y2={y}
                className="stroke-slate-100 dark:stroke-slate-800/80"
                strokeWidth={1}
              />
            );
          })}

          {/* India silhouette */}
          <path
            d={outlinePath}
            className="fill-slate-100/90 stroke-slate-300 dark:fill-slate-800/70 dark:stroke-slate-700"
            strokeWidth={1.25}
          />

          {/* Clinker supply flow arcs */}
          {ledgerData.flows.map((flow) => {
            const src = byId.get(flow.from);
            const dst = byId.get(flow.to);
            if (!src || !dst) return null;
            const [x1, y1] = project(src.plant.lat, src.plant.lon);
            const [x2, y2] = project(dst.plant.lat, dst.plant.lon);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 - 22;
            const srcExposed =
              selectedHazard === "any"
                ? src.anyOwnHigh
                : src.hazards[selectedHazard].ownHigh;
            return (
              <g key={flow.id}>
                <path
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={srcExposed ? "#B45309" : "#64748B"}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  opacity={0.85}
                />
                <text
                  x={mx}
                  y={my + 6}
                  textAnchor="middle"
                  className="fill-slate-600 text-[9px] font-mono font-semibold dark:fill-slate-300"
                >
                  {flow.mt} Mt
                </text>
              </g>
            );
          })}

          {/* Plant nodes */}
          {evaluated.map((ep) => {
            const [cx, cy] = project(ep.plant.lat, ep.plant.lon);
            const val = getDenominatorValue(ep.plant, denominator);
            const r = 7 + Math.sqrt(val / maxDenom) * 11;
            const rating =
              selectedHazard === "any"
                ? ep.maxRating
                : ep.hazards[selectedHazard].applicable
                ? ep.hazards[selectedHazard].decoupledFreshwater
                  ? 2
                  : ep.hazards[selectedHazard].rating
                : 0;
            const fill = rating > 0 ? RATING_FILL[rating] : "#CBD5E1";
            const isGrinding = ep.plant.type === "Grinding unit";
            const isHovered = hoveredId === ep.plant.id;

            return (
              <g
                key={ep.plant.id}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredId(ep.plant.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectPlant(ep.plant.id)}
              >
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 5}
                    fill="none"
                    stroke="#0F172A"
                    className="dark:stroke-white"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  stroke={isGrinding ? "#0F172A" : "#FFFFFF"}
                  strokeWidth={isGrinding ? 2 : 1.75}
                  strokeDasharray={isGrinding ? "3 2" : undefined}
                />
                <text
                  x={cx}
                  y={cy - r - 4}
                  textAnchor="middle"
                  className="fill-slate-800 text-[10px] font-semibold dark:fill-slate-100"
                >
                  {ep.plant.id} {ep.plant.town}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover card */}
        {hovered && (
          <div className="pointer-events-none absolute right-2 top-2 z-10 w-56 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {hovered.plant.id} · {hovered.plant.town}
              </span>
              <RatingBadge rating={hovered.maxRating} compact />
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {hovered.plant.type} · {hovered.plant.state}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500">Revenue</div>
                <div className="font-mono font-semibold">
                  ₹{hovered.plant.denominators.revenue_inr_cr.toLocaleString("en-IN")} cr
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Gross Block</div>
                <div className="font-mono font-semibold">
                  ₹{hovered.plant.denominators.gross_block_inr_cr.toLocaleString("en-IN")} cr
                </div>
              </div>
            </div>
            {hovered.inheritedHazardKeys.length > 0 && (
              <p className="mt-1.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                Inherits upstream kiln risk: {hovered.inheritedHazardKeys.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sequential color legend (no alarm red) */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((r) => (
            <span key={r} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-slate-400/50"
                style={{ backgroundColor: RATING_FILL[r] }}
              />
              {RATING_LABELS[r]}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-slate-200" />
            Integrated Kiln
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-slate-900 bg-slate-200 dark:border-slate-100" />
            Grinding Unit
          </span>
        </div>
      </div>
    </div>
  );
}

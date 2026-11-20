"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Factory,
  FileSearch,
  GitBranch,
  ClipboardCheck,
  FileText,
  SlidersHorizontal,
  Moon,
  Sun,
  UploadCloud,
} from "lucide-react";
import type {
  DenominatorKey,
  HorizonKey,
  LedgerResults,
  ProvenanceData,
  ScenarioKey,
  ScreenKey,
  ThresholdConfig,
} from "@/lib/types";
import {
  defaultLedgerData,
  defaultProvenanceData,
  DENOMINATOR_META,
  evaluatePortfolio,
  HORIZON_META,
  SCENARIO_META,
} from "@/lib/engine";
import { ScopeBanner } from "@/components/Badges";
import { OverviewScreen } from "@/components/OverviewScreen";
import { PlantsScreen } from "@/components/PlantsScreen";
import { PlantDetailScreen } from "@/components/PlantDetailScreen";
import { ClinkerChainScreen } from "@/components/ClinkerChainScreen";
import { MethodAuditScreen } from "@/components/MethodAuditScreen";
import { BoardBriefScreen } from "@/components/BoardBriefScreen";
import { ChallengeDrawer } from "@/components/ChallengeDrawer";
import { AuditTraceModal, type AuditTracePayload } from "@/components/AuditTraceModal";
import { UploadRunModal } from "@/components/UploadRunModal";

interface RunSnapshot {
  runId: string;
  label: string;
  results: LedgerResults;
  provenance: ProvenanceData;
  isLive: boolean;
}

const NAV_ITEMS: { key: ScreenKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { key: "plants", label: "Plants", icon: <Factory className="h-3.5 w-3.5" /> },
  { key: "detail", label: "Plant Detail", icon: <FileSearch className="h-3.5 w-3.5" /> },
  { key: "chain", label: "Clinker Chain", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { key: "method", label: "Method & Audit", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  { key: "brief", label: "Board Brief", icon: <FileText className="h-3.5 w-3.5" /> },
];

export default function NimbusExposureLedgerApp() {
  const [runs, setRuns] = useState<RunSnapshot[]>([
    {
      runId: defaultLedgerData.meta.run_id,
      label: `Nimbus Cement Ltd (${defaultLedgerData.plants.length} plants · Verified Baseline)`,
      results: defaultLedgerData,
      provenance: defaultProvenanceData,
      isLive: false,
    },
  ]);
  const [activeRunId, setActiveRunId] = useState<string>(defaultLedgerData.meta.run_id);

  const activeRun = useMemo(
    () => runs.find((r) => r.runId === activeRunId) ?? runs[0],
    [runs, activeRunId]
  );
  const activeData = activeRun.results;

  const [screen, setScreen] = useState<ScreenKey>("overview");
  const [scenario, setScenario] = useState<ScenarioKey>("ssp245");
  const [horizon, setHorizon] = useState<HorizonKey>("2040");
  const [denominator, setDenominator] = useState<DenominatorKey>("revenue_inr_cr");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("P01");
  const [thresholds, setThresholds] = useState<ThresholdConfig>({
    ...defaultLedgerData.meta.default_thresholds,
  });
  const [challengeOpen, setChallengeOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [auditTrace, setAuditTrace] = useState<AuditTracePayload | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  const evaluated = useMemo(
    () => evaluatePortfolio(scenario, horizon, thresholds, activeData),
    [scenario, horizon, thresholds, activeData]
  );

  const thresholdsModified =
    JSON.stringify(thresholds) !== JSON.stringify(activeData.meta.default_thresholds);

  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
    setScreen("detail");
  };

  const handleAddLiveRun = (snap: RunSnapshot) => {
    setRuns((prev) => [snap, ...prev]);
    setActiveRunId(snap.runId);
    if (snap.results.plants.length > 0) {
      setSelectedPlantId(snap.results.plants[0].id);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print">
        <ScopeBanner
          runId={activeData.meta.run_id}
          methodVersion={activeData.meta.method_version}
          onOpenMethod={() => setScreen("method")}
        />
      </div>

      <header className="app-header no-print sticky top-0 z-30 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3A5F] font-mono text-sm font-bold text-white dark:bg-teal-500 dark:text-slate-900">
                NL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    Nimbus Exposure Ledger
                  </span>
                  {activeRun.isLive && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      LIVE API RUN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeData.meta.company} · {activeData.meta.fiscal_year} · {activeData.plants.length} Plants
                </div>
              </div>
            </div>

            <nav
              aria-label="Primary Workspace Views"
              className="app-nav flex items-center gap-0.5"
            >
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScreen(item.key)}
                  className={`app-nav-link inline-flex items-center gap-1.5 font-semibold transition ${
                    screen === item.key ? "bg-white" : ""
                  }`}
                >
                  {item.icon}
                  <span>
                    {item.key === "plants" ? `Plants (${activeData.plants.length})` : item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-900/50"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Live Data / Upload CSV
              </button>

              <button
                type="button"
                onClick={() => setChallengeOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  thresholdsModified
                    ? "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Challenge Mode
                {thresholdsModified && (
                  <span className="h-2 w-2 rounded-full bg-amber-600" title="Custom thresholds active" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                aria-label="Toggle light or dark mode"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Scenario:</span>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                {(["ssp126", "ssp245", "ssp585"] as ScenarioKey[]).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setScenario(sc)}
                    title={SCENARIO_META[sc].description}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                      scenario === sc
                        ? "bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-900"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {SCENARIO_META[sc].short}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Horizon:</span>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                {(["today", "2030", "2040", "2050"] as HorizonKey[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                      horizon === h
                        ? "bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-900"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {HORIZON_META[h].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Denominator:</span>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                {(
                  [
                    "revenue_inr_cr",
                    "gross_block_inr_cr",
                    "output_mt",
                    "people",
                  ] as DenominatorKey[]
                ).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDenominator(d)}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                      denominator === d
                        ? "bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-900"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {DENOMINATOR_META[d].short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {screen === "overview" && (
          <OverviewScreen
            scenario={scenario}
            horizon={horizon}
            denominator={denominator}
            thresholds={thresholds}
            evaluated={evaluated}
            onSelectPlant={handleSelectPlant}
            onNavigate={(s) => setScreen(s)}
            onOpenChallenge={() => setChallengeOpen(true)}
            onInspectTrace={setAuditTrace}
          />
        )}

        {screen === "plants" && (
          <PlantsScreen
            scenario={scenario}
            horizon={horizon}
            denominator={denominator}
            thresholds={thresholds}
            evaluated={evaluated}
            onSelectPlant={handleSelectPlant}
          />
        )}

        {screen === "detail" && (
          <PlantDetailScreen
            plantId={selectedPlantId}
            scenario={scenario}
            horizon={horizon}
            thresholds={thresholds}
            evaluated={evaluated}
            onSelectPlant={setSelectedPlantId}
            onNavigate={(s) => setScreen(s)}
            onInspectTrace={setAuditTrace}
          />
        )}

        {screen === "chain" && (
          <ClinkerChainScreen
            scenario={scenario}
            horizon={horizon}
            evaluated={evaluated}
            onSelectPlant={handleSelectPlant}
            onInspectTrace={setAuditTrace}
          />
        )}

        {screen === "method" && (
          <MethodAuditScreen
            scenario={scenario}
            horizon={horizon}
            thresholds={thresholds}
            data={activeData}
            provenance={activeRun.provenance}
          />
        )}

        {screen === "brief" && (
          <BoardBriefScreen
            scenario={scenario}
            horizon={horizon}
            denominator={denominator}
            thresholds={thresholds}
            evaluated={evaluated}
          />
        )}
      </main>

      <footer className="app-footer no-print border-t px-4 py-3 text-center text-[11px]">
        Nimbus Exposure Ledger v1.0 · Dynamic Physical Climate Risk Engine (Live Open-Meteo ERA5, CMIP6 &amp; GloFAS APIs) · Click any provenance badge to trace its formula · No login required
      </footer>

      <ChallengeDrawer
        open={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        scenario={scenario}
        onChangeScenario={setScenario}
        horizon={horizon}
        denominator={denominator}
        thresholds={thresholds}
        onChangeThresholds={setThresholds}
        data={activeData}
      />

      <AuditTraceModal
        trace={auditTrace}
        onClose={() => setAuditTrace(null)}
        onOpenMethod={() => setScreen("method")}
      />

      <UploadRunModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        runs={runs}
        activeRunId={activeRunId}
        onSelectRun={(id) => {
          setActiveRunId(id);
          setUploadOpen(false);
        }}
        onAddLiveRun={handleAddLiveRun}
      />
    </div>
  );
}

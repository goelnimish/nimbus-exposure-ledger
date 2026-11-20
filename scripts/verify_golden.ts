import {
  computeChainStats,
  computeHazardSummary,
  computeOutageRevenueInPlay,
  evaluatePortfolio,
  getGroupTotals,
  ledgerData,
} from "../src/lib/engine";

function assertClose(actual: number, expected: number, tol: number, label: string) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`FAIL [${label}]: expected ${expected} (±${tol}), got ${actual}`);
  }
  console.log(`PASS [${label}]: ${actual} (expected ${expected})`);
}

const totals = getGroupTotals();
assertClose(totals.capacity_mtpa, 23.0, 0.01, "Group Capacity MTPA");
assertClose(totals.output_mt, 18.35, 0.01, "Group Output Mt");
assertClose(totals.gross_block_inr_cr, 15450, 0.01, "Group Gross Block cr");
assertClose(totals.revenue_inr_cr, 9658, 0.01, "Group Revenue cr");
assertClose(totals.people, 4550, 0.01, "Group Workforce");
assertClose(totals.scope1_co2_kt, 10932, 0.01, "Group Scope 1 kt");

// Grinding units share
const grinding = ledgerData.plants.filter((p) => p.type === "Grinding unit");
assertClose(
  (grinding.reduce((s, p) => s + p.denominators.output_mt, 0) / totals.output_mt) * 100,
  21.0,
  0.1,
  "Grinding Output Share %"
);
assertClose(
  (grinding.reduce((s, p) => s + p.denominators.revenue_inr_cr, 0) / totals.revenue_inr_cr) * 100,
  20.8,
  0.1,
  "Grinding Revenue Share %"
);
assertClose(
  (grinding.reduce((s, p) => s + p.denominators.gross_block_inr_cr, 0) / totals.gross_block_inr_cr) * 100,
  10.4,
  0.1,
  "Grinding Gross Block Share %"
);
assertClose(
  (grinding.reduce((s, p) => s + p.denominators.people, 0) / totals.people) * 100,
  12.3,
  0.1,
  "Grinding Workforce Share %"
);

// Chains
const revChains = computeChainStats("revenue_inr_cr");
const outChains = computeChainStats("output_mt");
const gbChains = computeChainStats("gross_block_inr_cr");

assertClose(revChains.p01Chain.value, 2597, 0.1, "P01 Chain Revenue cr");
assertClose(revChains.p01Chain.sharePct, 26.9, 0.1, "P01 Chain Revenue %");
assertClose(revChains.p06Chain.value, 2435, 0.1, "P06 Chain Revenue cr");
assertClose(revChains.p06Chain.sharePct, 25.2, 0.1, "P06 Chain Revenue %");
assertClose(revChains.combined.value, 5032, 0.1, "Both Chains Revenue cr");
assertClose(revChains.combined.sharePct, 52.1, 0.1, "Both Chains Revenue %");
assertClose(outChains.combined.sharePct, 52.9, 0.1, "Both Chains Output %");
assertClose(gbChains.combined.sharePct, 46.3, 0.1, "Both Chains Gross Block %");

// Outage 30 days, buffer 0, replacement 0
const p01Outage = computeOutageRevenueInPlay(["P01", "P07"], 30, 0, 0);
const p06Outage = computeOutageRevenueInPlay(["P06", "P08", "P09"], 30, 0, 0);
assertClose(p01Outage.totalRevenueInPlay, 213.5, 0.1, "P01 Chain 30d Outage cr");
assertClose(p06Outage.totalRevenueInPlay, 200.1, 0.1, "P06 Chain 30d Outage cr");

// Union rule check: P06 is High for rain in 2040 SSP245 and P08 is also High for rain -> no double counting!
const ev2040 = evaluatePortfolio("ssp245", "2040");
const rainSum = computeHazardSummary(ev2040, "rain", "revenue_inr_cr");
const uniqueSet = new Set(rainSum.networkPlantIds);
if (uniqueSet.size !== rainSum.networkPlantIds.length) {
  throw new Error("FAIL [Union rule]: duplicate plant IDs found in network exposure!");
}
console.log(`PASS [Union rule]: ${rainSum.networkPlantIds.length} unique plants (${rainSum.networkPlantIds.join(", ")}) -> ₹${rainSum.networkAmount} cr (${rainSum.networkSharePct}%)`);

// Zero Illustrative label check
const serialized = JSON.stringify(ledgerData);
if (serialized.includes('"Illustrative"')) {
  throw new Error("FAIL [Provenance]: Found Illustrative label in results.json!");
}
console.log("PASS [Zero Illustrative labels]: 0 found");
console.log("\nALL GOLDEN TESTS PASSED!");

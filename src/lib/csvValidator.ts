import type { ClinkerFlow } from "./types";

export interface ValidatedFacilityRow {
  plant_id: string;
  plant_name: string;
  town: string;
  state: string;
  lat: number;
  lon: number;
  plant_type: string;
  cement_capacity_mtpa: number;
  cement_output_fy2025_26_mt: number;
  clinker_produced_fy2025_26_mt: number;
  clinker_shipped_fy2025_26_mt: number;
  scope1_co2_fy2025_26_kt: number;
  water_source: string;
  coastal: boolean;
  asset_value_inr_cr: number;
  revenue_fy2025_26_inr_cr: number;
  employees: number;
  notes: string;
}

export interface ValidationError {
  file: "facilities.csv" | "flows.csv";
  row?: number;
  field?: string;
  message: string;
}

export const REQUIRED_FACILITY_HEADERS = [
  "plant_id",
  "plant_name",
  "town",
  "state",
  "latitude",
  "longitude",
  "plant_type",
  "cement_capacity_mtpa",
  "cement_output_fy2025_26_mt",
  "clinker_produced_fy2025_26_mt",
  "clinker_shipped_fy2025_26_mt",
  "scope1_co2_fy2025_26_kt",
  "water_source",
  "coastal",
  "asset_value_inr_cr",
  "revenue_fy2025_26_inr_cr",
  "employees",
  "notes",
] as const;

export const REQUIRED_FLOW_HEADERS = [
  "flow_id",
  "from_plant_id",
  "to_plant_id",
  "commodity",
  "quantity_mt",
  "mode",
] as const;

/**
 * RFC-4180 compliant CSV parser supporting UTF-8 BOM, CRLF/LF, quoted commas,
 * escaped double quotes, and trailing blank lines (ING-017).
 */
export function parseCsvText(raw: string): { headers: string[]; rows: Record<string, string>[]; error?: string } {
  const cleaned = raw.replace(/^\uFEFF/, "");
  if (!cleaned.trim()) {
    return { headers: [], rows: [], error: "CSV file is empty." };
  }

  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
      } else if (ch === "\r" && next === "\n") {
        row.push(field.trim());
        if (row.some((cell) => cell !== "")) records.push(row);
        row = [];
        field = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        row.push(field.trim());
        if (row.some((cell) => cell !== "")) records.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  if (inQuotes) {
    return { headers: [], rows: [], error: "Malformed CSV: unterminated quoted field." };
  }

  row.push(field.trim());
  if (row.some((cell) => cell !== "")) records.push(row);

  if (records.length < 2) {
    return { headers: [], rows: [], error: "CSV must contain a header row and at least one data row." };
  }

  const headers = records[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = rec[idx] ?? "";
    });
    rows.push(obj);
  }

  return { headers, rows };
}

function parseFiniteNumber(raw: string): number | null {
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function validateFacilitiesAndFlows(
  facilitiesCsv: string,
  flowsCsv?: string | null
): {
  valid: boolean;
  facilities: ValidatedFacilityRow[];
  flows: ClinkerFlow[];
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const parsedFac = parseCsvText(facilitiesCsv);

  if (parsedFac.error) {
    return {
      valid: false,
      facilities: [],
      flows: [],
      errors: [{ file: "facilities.csv", message: parsedFac.error }],
    };
  }

  // ING-002: Required headers
  for (const h of REQUIRED_FACILITY_HEADERS) {
    if (!parsedFac.headers.includes(h)) {
      errors.push({
        file: "facilities.csv",
        field: h,
        message: `Missing required column header "${h}".`,
      });
    }
  }
  if (errors.length > 0) {
    return { valid: false, facilities: [], flows: [], errors };
  }

  const facilities: ValidatedFacilityRow[] = [];
  const seenIds = new Map<string, number>();

  parsedFac.rows.forEach((r, idx) => {
    const rowNum = idx + 2; // 1-indexed including header
    const pid = (r.plant_id ?? "").trim();

    // ING-004: Missing plant_id
    if (!pid) {
      errors.push({ file: "facilities.csv", row: rowNum, field: "plant_id", message: "plant_id is required." });
    } else if (seenIds.has(pid)) {
      // ING-003: Duplicate plant_id
      errors.push({
        file: "facilities.csv",
        row: rowNum,
        field: "plant_id",
        message: `Duplicate plant_id "${pid}" (already defined on row ${seenIds.get(pid)}).`,
      });
    } else {
      seenIds.set(pid, rowNum);
    }

    const lat = parseFiniteNumber(r.latitude);
    const lon = parseFiniteNumber(r.longitude);
    if (lat === null || lat < -90 || lat > 90) {
      errors.push({ file: "facilities.csv", row: rowNum, field: "latitude", message: `Invalid latitude "${r.latitude}" (must be -90..90).` });
    }
    if (lon === null || lon < -180 || lon > 180) {
      errors.push({ file: "facilities.csv", row: rowNum, field: "longitude", message: `Invalid longitude "${r.longitude}" (must be -180..180).` });
    }

    const cap = parseFiniteNumber(r.cement_capacity_mtpa);
    const out = parseFiniteNumber(r.cement_output_fy2025_26_mt);
    const clinkProd = parseFiniteNumber(r.clinker_produced_fy2025_26_mt);
    const clinkShip = parseFiniteNumber(r.clinker_shipped_fy2025_26_mt);
    const scope1 = parseFiniteNumber(r.scope1_co2_fy2025_26_kt);
    const asset = parseFiniteNumber(r.asset_value_inr_cr);
    const rev = parseFiniteNumber(r.revenue_fy2025_26_inr_cr);
    const emp = parseFiniteNumber(r.employees);

    // ING-007: Non-negative vs strictly positive checks
    if (cap === null || cap < 0) errors.push({ file: "facilities.csv", row: rowNum, field: "cement_capacity_mtpa", message: "Must be ≥ 0." });
    if (out === null || out < 0) errors.push({ file: "facilities.csv", row: rowNum, field: "cement_output_fy2025_26_mt", message: "Must be ≥ 0." });
    if (clinkProd === null || clinkProd < 0) errors.push({ file: "facilities.csv", row: rowNum, field: "clinker_produced_fy2025_26_mt", message: "Must be ≥ 0." });
    if (clinkShip === null || clinkShip < 0) errors.push({ file: "facilities.csv", row: rowNum, field: "clinker_shipped_fy2025_26_mt", message: "Must be ≥ 0." });
    if (scope1 === null || scope1 < 0) errors.push({ file: "facilities.csv", row: rowNum, field: "scope1_co2_fy2025_26_kt", message: "Must be ≥ 0." });
    if (asset === null || asset <= 0) errors.push({ file: "facilities.csv", row: rowNum, field: "asset_value_inr_cr", message: "Must be > 0." });
    if (rev === null || rev <= 0) errors.push({ file: "facilities.csv", row: rowNum, field: "revenue_fy2025_26_inr_cr", message: "Must be > 0." });
    if (emp === null || emp <= 0) errors.push({ file: "facilities.csv", row: rowNum, field: "employees", message: "Must be > 0." });

    // ING-008: Strict Y/N coastal enum
    const coastalRaw = (r.coastal ?? "").trim();
    if (coastalRaw !== "Y" && coastalRaw !== "N") {
      errors.push({ file: "facilities.csv", row: rowNum, field: "coastal", message: `Invalid coastal flag "${coastalRaw}" (must be Y or N).` });
    }

    if (
      pid &&
      lat !== null &&
      lon !== null &&
      cap !== null &&
      out !== null &&
      clinkProd !== null &&
      clinkShip !== null &&
      scope1 !== null &&
      asset !== null &&
      rev !== null &&
      emp !== null &&
      (coastalRaw === "Y" || coastalRaw === "N")
    ) {
      facilities.push({
        plant_id: pid,
        plant_name: r.plant_name || pid,
        town: r.town || "",
        state: r.state || "",
        lat,
        lon,
        plant_type: r.plant_type || "Integrated",
        cement_capacity_mtpa: cap,
        cement_output_fy2025_26_mt: out,
        clinker_produced_fy2025_26_mt: clinkProd,
        clinker_shipped_fy2025_26_mt: clinkShip,
        scope1_co2_fy2025_26_kt: scope1,
        water_source: r.water_source || "Unknown",
        coastal: coastalRaw === "Y",
        asset_value_inr_cr: asset,
        revenue_fy2025_26_inr_cr: rev,
        employees: Math.round(emp),
        notes: r.notes || "",
      });
    }
  });

  // Parse optional flows.csv (or infer standard Nimbus flows if matching P01/P06/P07/P08/P09)
  const flows: ClinkerFlow[] = [];
  if (flowsCsv && flowsCsv.trim()) {
    const parsedFlow = parseCsvText(flowsCsv);
    if (parsedFlow.error) {
      errors.push({ file: "flows.csv", message: parsedFlow.error });
    } else {
      for (const h of REQUIRED_FLOW_HEADERS) {
        if (!parsedFlow.headers.includes(h)) {
          errors.push({ file: "flows.csv", field: h, message: `Missing required flow column "${h}".` });
        }
      }
      if (errors.filter((e) => e.file === "flows.csv").length === 0) {
        const seenFlowIds = new Set<string>();
        const outgoingTotals = new Map<string, number>();

        parsedFlow.rows.forEach((r, idx) => {
          const rowNum = idx + 2;
          const fid = (r.flow_id ?? "").trim();
          const fromId = (r.from_plant_id ?? "").trim();
          const toId = (r.to_plant_id ?? "").trim();
          const commodity = (r.commodity ?? "").trim();
          const mode = (r.mode ?? "").trim();
          const qty = parseFiniteNumber(r.quantity_mt);

          if (!fid) errors.push({ file: "flows.csv", row: rowNum, field: "flow_id", message: "flow_id is required." });
          else if (seenFlowIds.has(fid)) errors.push({ file: "flows.csv", row: rowNum, field: "flow_id", message: `Duplicate flow_id "${fid}".` });
          else seenFlowIds.add(fid);

          if (!seenIds.has(fromId)) errors.push({ file: "flows.csv", row: rowNum, field: "from_plant_id", message: `Unknown source plant "${fromId}".` });
          if (!seenIds.has(toId)) errors.push({ file: "flows.csv", row: rowNum, field: "to_plant_id", message: `Unknown target plant "${toId}".` });
          if (!commodity) errors.push({ file: "flows.csv", row: rowNum, field: "commodity", message: "commodity is required." });
          if (!mode) errors.push({ file: "flows.csv", row: rowNum, field: "mode", message: "mode is required." });
          if (qty === null || qty <= 0) errors.push({ file: "flows.csv", row: rowNum, field: "quantity_mt", message: "quantity_mt must be > 0." });

          if (fid && seenIds.has(fromId) && seenIds.has(toId) && commodity && mode && qty !== null && qty > 0) {
            outgoingTotals.set(fromId, (outgoingTotals.get(fromId) ?? 0) + qty);
            const srcFac = facilities.find((f) => f.plant_id === fromId);
            const sharePct =
              srcFac && srcFac.clinker_produced_fy2025_26_mt > 0
                ? Number(((qty / srcFac.clinker_produced_fy2025_26_mt) * 100).toFixed(1))
                : 0;
            flows.push({
              id: fid,
              from: fromId,
              to: toId,
              commodity,
              mt: qty,
              mode,
              share_of_kiln_clinker_pct: sharePct,
              label: "Real",
            });
          }
        });

        // ING-015 / ING-016: Outgoing flow tolerance check (clinker_shipped_mt + 0.01)
        for (const [srcId, outSum] of outgoingTotals.entries()) {
          const srcFac = facilities.find((f) => f.plant_id === srcId);
          if (srcFac && outSum > srcFac.clinker_shipped_fy2025_26_mt + 0.01 + 1e-9) {
            errors.push({
              file: "flows.csv",
              field: "quantity_mt",
              message: `Outgoing flows for ${srcId} (${outSum.toFixed(2)} Mt) exceed clinker_shipped_fy2025_26_mt (${srcFac.clinker_shipped_fy2025_26_mt} Mt + 0.01 Mt tolerance).`,
            });
          }
        }
      }
    }
  } else {
    // Auto-extract flows from notes when notes match standard Nimbus format (e.g., "Gets 1.12 Mt clinker a year from P01")
    let flowIdx = 1;
    for (const fac of facilities) {
      const m = fac.notes.match(/Gets\s+([\d.]+)\s*Mt\s+clinker.*?from\s+(P\d+)/i);
      if (m && seenIds.has(m[2])) {
        const qty = Number(m[1]);
        const fromId = m[2];
        const srcFac = facilities.find((f) => f.plant_id === fromId);
        const sharePct =
          srcFac && srcFac.clinker_produced_fy2025_26_mt > 0
            ? Number(((qty / srcFac.clinker_produced_fy2025_26_mt) * 100).toFixed(1))
            : 0;
        flows.push({
          id: `F${flowIdx++}`,
          from: fromId,
          to: fac.plant_id,
          commodity: "clinker",
          mt: qty,
          mode: fac.notes.toLowerCase().includes("rail") ? "Rail" : "Rail / Road",
          share_of_kiln_clinker_pct: sharePct,
          label: "Real",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    facilities: errors.length === 0 ? facilities : [],
    flows: errors.length === 0 ? flows : [],
    errors,
  };
}

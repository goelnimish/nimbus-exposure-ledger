import { NextRequest, NextResponse } from "next/server";
import { runLiveClimateIngestion } from "@/lib/liveClimate";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const out = await runLiveClimateIngestion({
      mode: body?.mode,
      facilitiesCsv: body?.facilitiesCsv,
      flowsCsv: body?.flowsCsv,
      companyName: body?.companyName,
    });
    return NextResponse.json(out, { status: out.status });
  } catch (err) {
    return NextResponse.json(
      { valid: false, errors: [{ file: "facilities.csv", message: `Ingestion error: ${String(err)}` }] },
      { status: 500 }
    );
  }
}

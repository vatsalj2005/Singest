import { NextRequest, NextResponse } from "next/server";
import {
  CORPORATE_ACTION_TABLES,
  getCorporateActionRows,
  getCorporateActionCounts,
} from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  try {
    const { isin } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    // If a specific corporate action is requested via query param
    if (action) {
      if (!CORPORATE_ACTION_TABLES[action]) {
        return NextResponse.json({ error: "Unknown action" }, { status: 404, headers });
      }

      const rows = await getCorporateActionRows(action, isin);
      return NextResponse.json({ rows }, { headers });
    }

    // Otherwise, default to returning counts for all action tables
    const counts = await getCorporateActionCounts(isin);
    return NextResponse.json(counts, { headers });
  } catch (error) {
    console.error("Failed to fetch corporate action details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";
import { CORPORATE_ACTION_TABLES } from "@/lib/corporate-tables";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isin: string; action: string }> },
) {
  try {
    const { isin, action } = await params;
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    const table = CORPORATE_ACTION_TABLES[action as keyof typeof CORPORATE_ACTION_TABLES];
    if (!table) {
      return NextResponse.json({ error: "Unknown action" }, { status: 404, headers });
    }

    const rows = await query<Record<string, unknown>>(
      `SELECT row_hash, isin, sym, disp_sym, exch, inst, seg, seosym,
              ltp, volume, pchange, pperchange, act_type, ann_date, ann_ltp,
              div_type, ex_date, note, rec_date, rmk, fetched_at
       FROM ${table}
       WHERE isin = $1
       ORDER BY ex_date DESC NULLS LAST`,
      [isin],
    );

    return NextResponse.json({ rows }, { headers });
  } catch (error) {
    console.error("Failed to fetch corporate action rows:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

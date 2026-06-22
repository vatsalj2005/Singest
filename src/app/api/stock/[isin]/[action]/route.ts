import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

const TABLES: Record<string, string> = {
  dividends: "corporate_actions_dividends",
  bonus: "corporate_actions_bonus",
  splits: "corporate_actions_splits",
  rights: "corporate_actions_rights",
  buybacks: "corporate_actions_buybacks",
  "quarterly-results": "corporate_actions_quarterly_results",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isin: string; action: string }> },
) {
  try {
    const { isin, action } = await params;
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    const table = TABLES[action];
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

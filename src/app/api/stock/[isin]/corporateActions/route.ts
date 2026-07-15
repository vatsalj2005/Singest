import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

const CORPORATE_ACTION_TABLES: Record<string, string> = {
  dividends: "corporate_actions_dividends",
  bonus: "corporate_actions_bonus",
  splits: "corporate_actions_splits",
  rights: "corporate_actions_rights",
  buybacks: "corporate_actions_buybacks",
  "quarterly-results": "corporate_actions_quarterly_results",
};

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
      const table = CORPORATE_ACTION_TABLES[action];
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
    }

    // Otherwise, default to returning counts for all action tables
    const entries = await Promise.all(
      Object.entries(CORPORATE_ACTION_TABLES).map(async ([key, table]) => {
        const rows = await query<{ c: string | number }>(
          `SELECT COUNT(*)::int AS c FROM ${table} WHERE isin = $1`,
          [isin],
        );
        return [key, Number(rows[0]?.c ?? 0)] as const;
      }),
    );

    return NextResponse.json(Object.fromEntries(entries), { headers });
  } catch (error) {
    console.error("Failed to fetch corporate action details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

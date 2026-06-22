import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

const TABLES = {
  dividends: "corporate_actions_dividends",
  bonus: "corporate_actions_bonus",
  splits: "corporate_actions_splits",
  rights: "corporate_actions_rights",
  buybacks: "corporate_actions_buybacks",
  "quarterly-results": "corporate_actions_quarterly_results",
} as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  try {
    const { isin } = await params;
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    const entries = await Promise.all(
      Object.entries(TABLES).map(async ([key, table]) => {
        const rows = await query<{ c: string | number }>(
          `SELECT COUNT(*)::int AS c FROM ${table} WHERE isin = $1`,
          [isin],
        );
        return [key, Number(rows[0]?.c ?? 0)] as const;
      }),
    );

    return NextResponse.json(Object.fromEntries(entries), { headers });
  } catch (error) {
    console.error("Failed to fetch corporate counts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

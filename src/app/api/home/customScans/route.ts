import { NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [countRow] = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM custom_scan`,
    );
    const [gainer] = await query<Record<string, unknown>>(
      `SELECT isin, sym, disp_sym, ltp, pperchange, mcapclass
       FROM custom_scan
       WHERE pperchange IS NOT NULL
       ORDER BY pperchange DESC NULLS LAST LIMIT 1`,
    );
    const [loser] = await query<Record<string, unknown>>(
      `SELECT isin, sym, disp_sym, ltp, pperchange, mcapclass
       FROM custom_scan
       WHERE pperchange IS NOT NULL
       ORDER BY pperchange ASC NULLS LAST LIMIT 1`,
    );
    const popular = await query<Record<string, unknown>>(
      `SELECT isin, sym, disp_sym, ltp, pperchange, mcapclass
       FROM custom_scan
       ORDER BY mcap DESC NULLS LAST LIMIT 10`,
    );

    return NextResponse.json(
      {
        totalStocks: Number(countRow?.count ?? 0),
        topGainer: gainer ?? null,
        topLoser: loser ?? null,
        popular: popular ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch market overview custom scans:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

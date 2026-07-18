import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    if (!q) {
      return NextResponse.json({ results: [] }, { headers });
    }

    const like = `%${q}%`;
    const rows = await query<Record<string, unknown>>(
      `SELECT isin, sym, disp_sym, ltp, pperchange, mcapclass
       FROM custom_scan
       WHERE disp_sym ILIKE $1 OR sym ILIKE $1
       ORDER BY
         CASE WHEN sym ILIKE $2 THEN 0
              WHEN disp_sym ILIKE $2 THEN 1
              ELSE 2 END,
         mcap DESC NULLS LAST
       LIMIT 10`,
      [like, `${q}%`],
    );

    return NextResponse.json({ results: rows }, { headers });
  } catch (error) {
    console.error("Failed to perform search query:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

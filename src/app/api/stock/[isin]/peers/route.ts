import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  try {
    const { isin } = await params;
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    const cls = await query<{ mcapclass: string | null }>(
      `SELECT mcapclass FROM custom_scan WHERE isin = $1 LIMIT 1`,
      [isin],
    );

    if (!cls[0]) {
      return NextResponse.json({ mcapclass: null, peers: [] }, { headers });
    }

    const mcapclass = cls[0].mcapclass;
    const cols = `isin, sym, disp_sym, ltp, pperchange, mcap, pe, div_yeild, roce, roe, eps, pb, net_profit_margin, volume`;

    const peers = mcapclass
      ? await query<Record<string, unknown>>(
          `SELECT ${cols} FROM custom_scan WHERE mcapclass = $1 ORDER BY mcap DESC NULLS LAST LIMIT 10`,
          [mcapclass],
        )
      : [];

    // Ensure current stock is included
    const hasCurrent = peers.some((p) => p.isin === isin);
    let final = peers;
    if (!hasCurrent) {
      const self = await query<Record<string, unknown>>(
        `SELECT ${cols} FROM custom_scan WHERE isin = $1 LIMIT 1`,
        [isin],
      );
      if (self[0]) final = [self[0], ...peers];
    }

    return NextResponse.json({ mcapclass, peers: final, currentIsin: isin }, { headers });
  } catch (error) {
    console.error("Failed to fetch peers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

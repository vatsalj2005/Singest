import { NextRequest, NextResponse } from "next/server";
import { getMcapclassByIsin, getPeerStocks, getStockWithPeerCols } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  try {
    const { isin } = await params;
    const headers = {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    };

    const cls = await getMcapclassByIsin(isin);

    if (!cls) {
      return NextResponse.json({ mcapclass: null, peers: [] }, { headers });
    }

    const mcapclass = cls.mcapclass;

    const peers = mcapclass ? await getPeerStocks(mcapclass) : [];

    // Ensure the active stock is included
    const hasCurrent = peers.some((p) => p.isin === isin);
    let final = peers;
    if (!hasCurrent) {
      const self = await getStockWithPeerCols(isin);
      if (self) final = [self, ...peers];
    }

    return NextResponse.json({ mcapclass, peers: final, currentIsin: isin }, { headers });
  } catch (error) {
    console.error("Failed to fetch custom scan peers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

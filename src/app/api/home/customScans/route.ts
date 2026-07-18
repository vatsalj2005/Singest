import { NextResponse } from "next/server";
import { getCustomScanCount, getTopGainer, getTopLoser, getPopularStocks } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalStocks, topGainer, topLoser, popular] = await Promise.all([
      getCustomScanCount(),
      getTopGainer(),
      getTopLoser(),
      getPopularStocks(),
    ]);

    return NextResponse.json(
      {
        totalStocks,
        topGainer,
        topLoser,
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

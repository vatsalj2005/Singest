import { NextResponse } from "next/server";
import { getScreenerFacets } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const facets = await getScreenerFacets();

    return NextResponse.json(facets, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to fetch screener facets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/dal";

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

    const rows = await searchStocks(q);

    return NextResponse.json({ results: rows }, { headers });
  } catch (error) {
    console.error("Failed to perform search query:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

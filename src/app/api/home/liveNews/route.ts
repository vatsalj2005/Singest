import { NextRequest, NextResponse } from "next/server";
import { getLatestNews } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
      100,
    );

    const rows = await getLatestNews(limit);

    return NextResponse.json(
      { news: rows },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch live news:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

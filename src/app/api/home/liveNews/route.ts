import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
      100,
    );

    const rows = await query<Record<string, unknown>>(
      `SELECT article_id, title, text, overall_sentiment, category, sub_category,
              publish_date, stock_name, isin_code, display_symbol, article_slug
       FROM live_news
       WHERE publish_date IS NOT NULL
       ORDER BY publish_date DESC
       LIMIT $1`,
      [limit],
    );

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

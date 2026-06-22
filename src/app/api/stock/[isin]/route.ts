import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  try {
    const { isin } = await params;
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM custom_scan WHERE isin = $1 LIMIT 1`,
      [isin],
    );
    if (!rows[0]) {
      return NextResponse.json(
        { error: "Not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        },
      );
    }
    const news = await query<Record<string, unknown>>(
      `SELECT article_id, title, overall_sentiment, category, sub_category, publish_date
       FROM live_news
       WHERE isin_code = $1
       ORDER BY publish_date DESC NULLS LAST
       LIMIT 10`,
      [isin],
    );
    return NextResponse.json(
      { stock: rows[0], news },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch stock info:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

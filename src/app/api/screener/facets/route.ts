import { NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const classes = await query<{ mcapclass: string | null }>(
      `SELECT DISTINCT mcapclass FROM custom_scan WHERE mcapclass IS NOT NULL ORDER BY mcapclass`,
    );
    const total = await query<{ c: string | number }>(`SELECT COUNT(*)::int AS c FROM custom_scan`);

    return NextResponse.json(
      {
        mcapclasses: classes.map((r) => r.mcapclass).filter(Boolean) as string[],
        total: Number(total[0]?.c ?? 0),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch screener facets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

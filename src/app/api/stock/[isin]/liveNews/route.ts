import { NextRequest, NextResponse } from "next/server";
import { getNewsByIsin } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  try {
    const { isin } = await params;
    const rows = await getNewsByIsin(isin);

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
